import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMe } from '@/lib/auth'
import { tick, today, norm, event } from '@/lib/cycle'
export async function POST(req: Request) {
  const me = await getMe()
  if (!me) return NextResponse.json({ ok: false, error: 'غير مسجل' }, { status: 401 })
  const b = await req.json(), s = db(), admin = me.role === 'admin'
  const id = admin && b.id ? b.id : me.id
  const { data: emp } = await s.from('employees').select('*').eq('id', id).single()
  const err = (m: string) => NextResponse.json({ ok: false, error: m }, { status: 400 })
  switch (b.type) {
    case 'depart': // تسجيل تاريخ النزول (ينزل فوراً لو اليوم أو قبله)
      if (!b.date) return err('اكتب تاريخ النزول')
      await s.from('employees').update({ next_vacation_date: b.date, decision_pending: false }).eq('id', id); break
    case 'return': { // تسجيل تاريخ العودة → يبدأ عد الـ40 يوم
      const d = b.date || today()
      await s.from('employees').update({ status: 'work', work_start: d, vacation_start: null, vacation_end: null, return_alerted: false, decision_pending: false, next_vacation_date: null }).eq('id', id)
      await event('back', emp.full_name, `${emp.full_name} انتهت إجازته وعاد للعمل`); break
    }
    case 'decision':
      if (b.accept) { if (!b.date) return err('اكتب تاريخ النزول'); await s.from('employees').update({ next_vacation_date: b.date, decision_pending: false }).eq('id', id) }
      else await s.from('employees').update({ work_start: today(), decision_pending: false }).eq('id', id) // رفض = 40 يوم من جديد
      break
    case 'add': {
      if (!admin) return err('للأدمن فقط')
      const name = (b.name || '').trim().replace(/\s+/g, ' ')
      if (!name || !b.password) return err('الاسم وكلمة السر مطلوبين')
      const { data: all } = await s.from('employees').select('full_name')
      if ((all || []).some(e => norm(e.full_name) === norm(name))) return err('الاسم موجود بالفعل')
      const j = b.joined_at || today()
      const { data: mx } = await s.from('employees').select('serial').eq('role', 'employee').not('serial', 'is', null).order('serial', { ascending: false }).limit(1)
      const serial = ((mx && mx[0]?.serial) || 0) + 1
      await s.from('employees').insert({ full_name: name, password: b.password, joined_at: j, work_start: b.work_start || j, role: 'employee', serial, work_location: (b.work_location || '').trim() || null }); break
    }
    case 'update': {
      if (!admin) return err('للأدمن فقط')
      const f = b.fields || {}, up: any = {}
      for (const k of ['joined_at', 'vacation_start', 'vacation_end', 'next_vacation_date']) if (k in f) up[k] = f[k] || null
      if (f.work_start) up.work_start = f.work_start
      if ('work_location' in f) up.work_location = (f.work_location || '').trim() || null
      if (f.password) up.password = f.password
      if (['work', 'vacation'].includes(f.status)) up.status = f.status
      if (f.name) {
        const name = f.name.trim().replace(/\s+/g, ' ')
        const { data: all } = await s.from('employees').select('id,full_name')
        if ((all || []).some(e => e.id !== b.id && norm(e.full_name) === norm(name))) return err('الاسم موجود بالفعل')
        up.full_name = name
      }
      if ('vacation_end' in f || 'status' in f || 'work_start' in f) { up.return_alerted = false; up.decision_pending = false }
      await s.from('employees').update(up).eq('id', b.id); break
    }
    case 'event_delete':
      if (!admin) return err('للأدمن فقط')
      await s.from('events').delete().eq('id', b.id); break
    case 'event_edit':
      if (!admin || !b.message) return err('للأدمن فقط')
      await s.from('events').update({ message: b.message }).eq('id', b.id); break
    case 'delete':
      if (!admin) return err('للأدمن فقط')
      await s.from('employees').delete().eq('id', b.id).eq('role', 'employee'); break
    default: return err('طلب غير معروف')
  }
  await tick()
  return NextResponse.json({ ok: true })
}

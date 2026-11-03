import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { norm } from '@/lib/cycle'
import { makeToken } from '@/lib/auth'
const fail = (error: string, status = 500) => NextResponse.json({ ok: false, error }, { status })
export async function POST(req: Request) {
  const { name, password } = await req.json()
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('ضع')) return fail('مفتاح SUPABASE_SERVICE_ROLE_KEY ناقص في .env.local (وأعد تشغيل npm run dev)')
  const s = db(), n = norm(name)
  if (n === 'admin') {
    const { data: a, error: e1 } = await s.from('employees').select('id').eq('role', 'admin').maybeSingle()
    if (e1) return fail('خطأ قاعدة البيانات: ' + e1.message)
    if (!a && password === (process.env.ADMIN_PASSWORD || 'rental533')) {
      const { error: e2 } = await s.from('employees').insert({ full_name: 'Admin', password, role: 'admin' })
      if (e2) return fail('تعذر إنشاء حساب الأدمن: ' + e2.message)
    }
  }
  const { data, error } = await s.from('employees').select('id,full_name,password')
  if (error) return fail('خطأ قاعدة البيانات: ' + error.message)
  const u = (data || []).find(e => norm(e.full_name) === n && e.password === password)
  if (!u) return fail('الاسم أو كلمة السر غير صحيحة', 401)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('rp_session', makeToken(u.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return res
}

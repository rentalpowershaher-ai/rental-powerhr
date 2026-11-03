import { db } from './db'
import { push } from './push'
export const WORK_DAYS = 40
export const VACATION_DAYS = 10 // غيّرها إلى 12 لو عايزها 12
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
export const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10) }
export const norm = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase()
export async function event(kind: string, employee_name: string, message: string, target: string | null = null, notify = true) {
  await db().from('events').insert({ kind, employee_name, message, target })
  if (notify) await push(target ? [target] : 'all', { title: 'Rental Power', body: message, tag: kind })
}
// يُنفَّذ تلقائياً مع كل طلب: يحسب الدورة (40 عمل / اجازة)
export async function tick() {
  const s = db(), t = today()
  const { data } = await s.from('employees').select('*').eq('role', 'employee')
  for (const e of data || []) {
    if (e.status === 'work' && e.next_vacation_date && e.next_vacation_date <= t) {
      const end = addDays(e.next_vacation_date, VACATION_DAYS)
      await s.from('employees').update({ status: 'vacation', vacation_start: e.next_vacation_date, vacation_end: end, next_vacation_date: null, decision_pending: false, return_alerted: false }).eq('id', e.id)
      await event('left', e.full_name, `${e.full_name} نزل في إجازة وسيعود يوم ${end}`)
    } else if (e.status === 'work' && !e.next_vacation_date && !e.decision_pending && addDays(e.work_start, WORK_DAYS) <= t) {
      await s.from('employees').update({ decision_pending: true }).eq('id', e.id)
      await push([e.id], { title: '🚨 حان موعد إجازتك', body: 'افتح التطبيق واختر قبول أو رفض', urgent: true, tag: 'alarm' })
    } else if (e.status === 'vacation' && e.vacation_end <= t && !e.return_alerted) {
      await s.from('employees').update({ return_alerted: true }).eq('id', e.id)
      await event('over', e.full_name, `انتهت إجازة ${e.full_name} - برجاء العودة إلى العمل`, null, false)
      await push([e.id], { title: '🚨 انتهت إجازتك', body: 'برجاء العودة إلى العمل وتسجيل تاريخ العودة', urgent: true, tag: 'alarm' })
    }
  }
}

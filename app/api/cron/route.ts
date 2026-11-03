import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { push } from '@/lib/push'
import { tick, today } from '@/lib/cycle'
export const dynamic = 'force-dynamic'
// يتنده كل 5 دقايق: /api/cron?key=CRON_SECRET  → يكرر الإنذار لكل موظف لسه ما تصرفش
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('key') !== process.env.CRON_SECRET) return NextResponse.json({ ok: false }, { status: 401 })
  await tick()
  const t = today()
  const { data } = await db().from('employees').select('id,status,vacation_end,decision_pending').eq('role', 'employee')
  let n = 0
  for (const e of data || []) {
    if (e.status === 'vacation' && e.vacation_end <= t) { n++; await push([e.id], { title: '🚨 انتهت إجازتك', body: 'برجاء العودة إلى العمل وتسجيل تاريخ العودة', urgent: true, tag: 'alarm' }) }
    else if (e.decision_pending) { n++; await push([e.id], { title: '🚨 حان موعد إجازتك', body: 'افتح التطبيق واختر قبول أو رفض', urgent: true, tag: 'alarm' }) }
  }
  return NextResponse.json({ ok: true, alarms: n })
}

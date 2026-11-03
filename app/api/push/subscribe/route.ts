import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMe } from '@/lib/auth'
export async function POST(req: Request) {
  const me = await getMe()
  if (!me) return NextResponse.json({ ok: false }, { status: 401 })
  const b = await req.json()
  const row = b.fcm
    ? { employee_id: me.id, endpoint: 'fcm:' + b.fcm, subscription: { fcm: b.fcm } }
    : { employee_id: me.id, endpoint: b.subscription.endpoint, subscription: b.subscription }
  await db().from('push_subscriptions').upsert(row, { onConflict: 'endpoint' })
  return NextResponse.json({ ok: true })
}

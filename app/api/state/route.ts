import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getMe } from '@/lib/auth'
import { tick, today } from '@/lib/cycle'
export const dynamic = 'force-dynamic'
export async function GET() {
  const me0 = await getMe()
  if (!me0) return NextResponse.json({ me: null })
  await tick()
  const s = db()
  const { data: me } = await s.from('employees').select('*').eq('id', me0.id).single()
  const { data: emps } = await s.from('employees').select('*').eq('role', 'employee').order('serial', { ascending: true })
  const { data: events } = await s.from('events').select('*').or(`target.is.null,target.eq.${me.id}`).order('id', { ascending: false }).limit(30)
  const { count } = await s.from('events').select('*', { count: 'exact', head: true }).or(`target.is.null,target.eq.${me.id}`)
  const isAdmin = me.role === 'admin'
  const strip = (e: any) => { const { password, ...r } = e; return isAdmin ? e : r }
  return NextResponse.json({ me: strip(me), today: today(), employees: (emps || []).map(strip), events: events || [], total: count || 0 })
}

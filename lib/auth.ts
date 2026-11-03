import crypto from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'
const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret').update(v).digest('hex')
export const makeToken = (id: string) => `${id}.${sign(id)}`
export async function getMe() {
  const c = (await cookies()).get('rp_session')?.value
  if (!c) return null
  const [id, sig] = c.split('.')
  if (!id || !sig || sig.length !== sign(id).length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id)))) return null
  const { data } = await db().from('employees').select('*').eq('id', id).single()
  return data
}

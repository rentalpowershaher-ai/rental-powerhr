import webpush from 'web-push'
import admin from 'firebase-admin'
import { db } from './db'
let wpReady = false
const fcm = () => {
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)) })
  return admin.messaging()
}
type P = { title: string; body: string; urgent?: boolean; tag?: string }
export async function push(ids: string[] | 'all', p: P) {
  try {
    let q = db().from('push_subscriptions').select('id,subscription')
    if (ids !== 'all') q = q.in('employee_id', ids)
    const { data } = await q
    await Promise.all((data || []).map(async s => {
      try {
        if (s.subscription?.fcm) { // أندرويد (APK)
          if (!process.env.FIREBASE_SERVICE_ACCOUNT) return
          await fcm().send({
            token: s.subscription.fcm, notification: { title: p.title, body: p.body }, data: { tag: p.tag || '' },
            android: { priority: 'high', ttl: 3600 * 1000, notification: { channelId: p.urgent ? 'alarm' : 'general', tag: p.tag, sound: p.urgent ? 'siren' : 'default', visibility: 'public', defaultVibrateTimings: false, vibrateTimingsMillis: p.urgent ? [0, 700, 250, 700, 250, 1000] : [0, 250] } }
          })
        } else { // متصفح (Web Push)
          if (!process.env.VAPID_PRIVATE_KEY) return
          if (!wpReady) { webpush.setVapidDetails('mailto:admin@rentalpower.app', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!); wpReady = true }
          await webpush.sendNotification(s.subscription, JSON.stringify(p), { urgency: p.urgent ? 'high' : 'normal', TTL: 3600 })
        }
      } catch (e: any) {
        const c = e.code || e.statusCode
        if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 404, 410].includes(c)) await db().from('push_subscriptions').delete().eq('id', s.id)
      }
    }))
  } catch (e) { console.error('push failed', e) }
}

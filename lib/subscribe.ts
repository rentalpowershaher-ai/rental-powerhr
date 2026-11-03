import { Capacitor } from '@capacitor/core'
export const isNative = () => { try { return Capacitor.isNativePlatform() } catch { return false } }
const b64 = (s: string) => { const p = '='.repeat((4 - s.length % 4) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)) }
const post = (body: any) => fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// تطبيق الأندرويد (APK): إشعارات FCM بقناة "إنذار" بصوت صفارة
async function enableNative() {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return false
  await PushNotifications.createChannel({ id: 'alarm', name: 'إنذار الإجازة', description: 'تنبيه مزعج بصوت صفارة', importance: 5, visibility: 1, sound: 'siren', vibration: true, lights: true })
  await PushNotifications.createChannel({ id: 'general', name: 'إشعارات عامة', importance: 4, visibility: 1, vibration: true })
  await PushNotifications.removeAllListeners()
  await PushNotifications.addListener('registration', t => { post({ fcm: t.value }) })
  await PushNotifications.register()
  return true
}

export async function enablePush() {
  try {
    if (isNative()) return await enableNative()
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    if ((await Notification.requestPermission()) !== 'granted') return false
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as any })
    await post({ subscription: sub })
    return true
  } catch { return false }
}

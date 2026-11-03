self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'Rental Power', body: '' }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: '/icon-192.png', badge: '/icon-192.png', tag: d.tag || 'rp', renotify: true,
    requireInteraction: !!d.urgent, vibrate: d.urgent ? [600, 200, 600, 200, 600, 200, 900] : [200]
  }))
})
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => l.length ? l[0].focus() : clients.openWindow('/')))
})

// Forge service worker: shows push notifications and opens the right page when tapped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let msg = { title: 'Forge', body: '', url: './' }
  try { msg = { ...msg, ...event.data.json() } } catch { if (event.data) msg.body = event.data.text() }
  event.waitUntil(self.registration.showNotification(msg.title, {
    body: msg.body,
    tag: msg.tag,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: msg.url },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || './'
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.focus(); return w.navigate(url) }
    }
    return self.clients.openWindow(url)
  })())
})

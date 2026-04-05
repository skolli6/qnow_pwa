/**
 * sw.js — QNow Service Worker
 *
 * Kept intentionally minimal and reliable.
 * Main job: handle push notifications and notification clicks.
 * Caching is best-effort only — never blocks install/activate.
 */

const CACHE = 'qnow-v2'

// ─── INSTALL ──────────────────────────────────────────────────
// Skip waiting so the new SW activates immediately.
// Do NOT use cache.addAll() for SPA routes — they aren't real files
// and can cause the install to fail if fetch errors.
self.addEventListener('install', () => {
  self.skipWaiting()
})

// ─── ACTIVATE ─────────────────────────────────────────────────
// Take control of all pages immediately.
// Clean up any old caches from previous versions.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── FETCH ────────────────────────────────────────────────────
// Network first. Cache only real assets (JS, CSS, images).
// Never intercept API, Firebase, or font requests.
self.addEventListener('fetch', event => {
  const { request } = event

  // Only handle GET
  if (request.method !== 'GET') return

  const url = request.url

  // Never intercept — always go direct to network
  if (
    url.includes('/api/') ||
    url.includes('firestore.googleapis') ||
    url.includes('firebase') ||
    url.includes('graph.facebook') ||
    url.includes('fonts.googleapis') ||
    url.includes('fonts.gstatic') ||
    url.includes('identitytoolkit')
  ) return

  // For navigation requests (page loads) — network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') )
    )
    return
  }

  // For static assets — cache first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        // Only cache valid successful responses for static assets
        if (
          response.ok &&
          response.type === 'basic' &&
          (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.svg'))
        ) {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => cached) // Return stale cache if network fails
    })
  )
})

// ─── PUSH NOTIFICATION ───────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { title: 'QNow', body: event.data?.text() || 'You have a queue update' }
  }

  const title = data.title || 'QNow'
  const options = {
    body:               data.body || 'Queue update',
    icon:               '/icons/icon-192.png',
    badge:              '/icons/icon-72.png',
    tag:                data.tag || 'qnow',
    data:               { url: data.url || '/' },
    vibrate:            [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions:            data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── NOTIFICATION CLICK ───────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'
  const fullUrl   = self.location.origin + targetUrl

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl)
            return client.focus()
          }
        }
        return clients.openWindow(fullUrl)
      })
  )
})

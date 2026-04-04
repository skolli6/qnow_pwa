/**
 * sw.js — QNow Service Worker
 *
 * Handles:
 *  1. Offline caching — app works without internet
 *  2. Push notifications — vendor gets alerted when customer joins
 *  3. Notification click — opens correct screen when tapped
 */

const CACHE_NAME = 'qnow-v1'
const CACHE_URLS = [
  '/',
  '/browse',
  '/check',
  '/vendor',
  '/help',
]

// ─── INSTALL: cache core pages ────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can — failures are non-fatal
      return cache.addAll(CACHE_URLS).catch(() => {})
    })
  )
  // Activate immediately without waiting
  self.skipWaiting()
})

// ─── ACTIVATE: clean up old caches ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ─── FETCH: network first, cache fallback ────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip API calls, Firebase, WhatsApp — always go to network
  const url = event.request.url
  if (
    url.includes('/api/') ||
    url.includes('firebase') ||
    url.includes('graph.facebook') ||
    url.includes('fonts.googleapis') ||
    url.includes('firestore')
  ) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Save a copy in cache
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        return response
      })
      .catch(() =>
        // Network failed — try cache
        caches.match(event.request).then(cached => {
          if (cached) return cached
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      )
  )
})

// ─── PUSH NOTIFICATION ───────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data?.json() || {}
  } catch {
    data = { title: 'QNow', body: event.data?.text() || 'Queue update' }
  }

  const title   = data.title || 'QNow'
  const body    = data.body  || 'You have a queue update'
  const url     = data.url   || '/vendor/dashboard'
  const tag     = data.tag   || 'qnow-push'
  const icon    = '/icons/icon-192.png'
  const badge   = '/icons/icon-72.png'

  const options = {
    body,
    icon,
    badge,
    tag,
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── NOTIFICATION CLICK ───────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/vendor/dashboard'
  const fullUrl   = self.location.origin + targetUrl

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it and navigate
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus()
            client.navigate(targetUrl)
            return
          }
        }
        // App not open — open a new window
        if (clients.openWindow) {
          return clients.openWindow(fullUrl)
        }
      })
  )
})

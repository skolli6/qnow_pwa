/* public/firebase-messaging-sw.js
   This file MUST be at the root of your public folder so Firebase can register it.
   It handles background push notifications (when the app tab is not active).
*/

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

// ── Paste your Firebase config here (same as your .env values) ──
firebase.initializeApp({
  apiKey:            'REPLACE_WITH_VITE_FIREBASE_API_KEY',
  authDomain:        'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
  projectId:         'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
  storageBucket:     'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId:             'REPLACE_WITH_VITE_FIREBASE_APP_ID',
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {}
  const icon = '/icon.svg'

  self.registration.showNotification(title || 'QNow', {
    body: body || 'You have a queue update.',
    icon,
    badge: icon,
    tag: 'qnow-notification',
    data: payload.data || {},
    actions: [
      { action: 'open', title: '📋 View Queue' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  })
})

// Click handler — opens the app when notification is tapped
self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const appUrl = self.location.origin
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(appUrl) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(appUrl + '/token')
    })
  )
})

/**
 * fcmService.js
 * Firebase Cloud Messaging – browser push notifications (100% free)
 * Requires: public/firebase-messaging-sw.js  +  VITE_FIREBASE_VAPID_KEY in .env
 */
import { getToken, onMessage } from 'firebase/messaging'
import { getMessagingInstance } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

// ─── REQUEST PERMISSION & GET TOKEN ─────────────────────────
export async function requestFCMPermission() {
  try {
    const messaging = await getMessagingInstance()
    if (!messaging) return null

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token
  } catch (err) {
    console.warn('FCM permission error:', err)
    return null
  }
}

// ─── FOREGROUND MESSAGE LISTENER ────────────────────────────
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingInstance()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {}
    // Show as a custom toast/banner since browser won't show native notif when app is in foreground
    callback({ title, body, data: payload.data })
  })
}

// ─── SEND NOTIFICATION VIA FIREBASE CLOUD FUNCTION ──────────
// This calls your Firebase Cloud Function endpoint to send FCM to a specific token.
// See functions/index.js for the server-side code.
export async function sendPushToToken(fcmToken, title, body, data = {}) {
  if (!fcmToken) return
  try {
    const res = await fetch(
      `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/sendPush`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken, title, body, data }),
      }
    )
    return res.ok
  } catch (err) {
    console.warn('Push send error:', err)
    return false
  }
}

// ─── HELPER: SHOW NATIVE BROWSER NOTIFICATION ────────────────
export function showLocalNotification(title, body) {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
  })
}

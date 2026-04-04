/**
 * pushService.js
 * Handles PWA service worker registration and Web Push subscription.
 *
 * Flow:
 *  1. Register service worker (sw.js)
 *  2. Ask vendor for notification permission
 *  3. Subscribe to Web Push using VAPID public key
 *  4. Save subscription object to Firestore vendor document
 *  5. When customer joins → /api/push sends notification to vendor's phone
 */

// ─── SERVICE WORKER REGISTRATION ─────────────────────────────

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported')
    return null
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('✅ Service worker registered')
    return reg
  } catch (err) {
    console.error('Service worker registration failed:', err)
    return null
  }
}

// ─── PUSH SUBSCRIPTION ───────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

/**
 * Request push notification permission and return subscription.
 * Returns the subscription object (to be saved to Firestore) or null.
 */
export async function subscribeToPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported')
    return null
  }

  // Ask for permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.log('Notification permission denied')
    return null
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

    if (!vapidKey) {
      console.error('VITE_VAPID_PUBLIC_KEY not set in .env')
      return null
    }

    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription()

    // If not subscribed, create new subscription
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    return sub.toJSON() // Plain object — safe to store in Firestore
  } catch (err) {
    console.error('Push subscription failed:', err)
    return null
  }
}

/**
 * Get existing push subscription without prompting.
 * Used to check if vendor is already subscribed.
 */
export async function getExistingSubscription() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? sub.toJSON() : null
  } catch {
    return null
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch (err) {
    console.error('Unsubscribe failed:', err)
  }
}

/**
 * Send a push notification to a vendor via our Vercel API.
 * Called from firestoreService when a new token is added.
 */
export async function sendPushToVendor(subscription, { title, body, url, tag, requireInteraction, actions }) {
  if (!subscription || !subscription.endpoint) return false
  try {
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, title, body, url, tag, requireInteraction, actions }),
    })
    if (res.status === 410) {
      // Subscription expired — should be removed from Firestore
      return 'expired'
    }
    return res.ok
  } catch (err) {
    console.warn('sendPushToVendor error:', err)
    return false
  }
}

/**
 * pushService.js
 * Web Push subscription management for QNow.
 *
 * REQUIRED ENV VARS (set in Vercel):
 *   VITE_VAPID_PUBLIC_KEY  — browser-side (must have VITE_ prefix)
 *   VAPID_PUBLIC_KEY       — server-side (api/push.js)
 *   VAPID_PRIVATE_KEY      — server-side (api/push.js)
 *   VAPID_EMAIL            — server-side (e.g. mailto:you@gmail.com)
 *
 * Generate keys with: npx web-push generate-vapid-keys
 */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// ─── DIAGNOSTIC — run this to find out exactly what's failing ─

export async function diagnosePush() {
  const issues = []
  const ok     = []

  // 1. Browser support
  if (!('Notification' in window))   issues.push('❌ Notifications API not supported in this browser')
  else                                ok.push('✅ Notifications API supported')

  if (!('serviceWorker' in navigator)) issues.push('❌ Service workers not supported')
  else                                 ok.push('✅ Service workers supported')

  if (!('PushManager' in window))    issues.push('❌ Push Manager not supported (use Chrome on Android)')
  else                                ok.push('✅ Push Manager supported')

  // 2. Permission
  if ('Notification' in window) {
    const perm = Notification.permission
    if (perm === 'denied')  issues.push('❌ Notification permission DENIED — user must reset in browser settings')
    if (perm === 'default') issues.push('⚠ Notification permission not asked yet')
    if (perm === 'granted') ok.push('✅ Notification permission granted')
  }

  // 3. VAPID key
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    issues.push('❌ VITE_VAPID_PUBLIC_KEY is missing — add it to Vercel environment variables')
  } else if (vapidKey.length < 80) {
    issues.push(`❌ VITE_VAPID_PUBLIC_KEY looks too short (${vapidKey.length} chars, expected ~87) — regenerate keys with: npx web-push generate-vapid-keys`)
  } else {
    ok.push(`✅ VITE_VAPID_PUBLIC_KEY present (${vapidKey.length} chars)`)
  }

  // 4. Service worker registration
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        ok.push(`✅ Service worker registered (scope: ${reg.scope})`)
        const sub = await reg.pushManager.getSubscription()
        if (sub) ok.push('✅ Already subscribed to push')
        else     ok.push('ℹ Not yet subscribed — subscribe to enable push')
      } else {
        issues.push('❌ Service worker /sw.js is NOT registered — check browser console for SW errors')
      }
    } catch (e) {
      issues.push(`❌ Service worker check failed: ${e.message}`)
    }
  }

  console.group('QNow Push Diagnostics')
  ok.forEach(m => console.log(m))
  issues.forEach(m => console.warn(m))
  console.groupEnd()

  return { ok, issues, ready: issues.length === 0 }
}

// ─── SUBSCRIBE ────────────────────────────────────────────────

/**
 * Request push permission and create a subscription.
 * Returns the subscription JSON object, or null on any failure.
 * Logs the specific reason for failure to console.
 */
export async function subscribeToPush() {
  // 1. Check browser support
  if (!('Notification' in window)) {
    console.error('[Push] Notifications API not supported')
    return null
  }
  if (!('serviceWorker' in navigator)) {
    console.error('[Push] Service workers not supported')
    return null
  }
  if (!('PushManager' in window)) {
    console.error('[Push] PushManager not supported — use Chrome on Android')
    return null
  }

  // 2. Check VAPID key before asking permission (fail fast)
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.error('[Push] VITE_VAPID_PUBLIC_KEY is not set. Add it to Vercel environment variables.')
    return null
  }
  if (vapidKey.length < 80) {
    console.error(`[Push] VITE_VAPID_PUBLIC_KEY looks invalid (${vapidKey.length} chars). Regenerate with: npx web-push generate-vapid-keys`)
    return null
  }

  // 3. Request permission
  let permission = Notification.permission
  if (permission === 'default') {
    permission = await Notification.requestPermission()
  }
  if (permission !== 'granted') {
    console.warn(`[Push] Permission ${permission}. User must allow notifications in browser settings.`)
    return null
  }

  // 4. Wait for service worker to be ready
  let reg
  try {
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker ready timeout after 10s')), 10000)
      ),
    ])
  } catch (e) {
    console.error('[Push] Service worker not ready:', e.message)
    return null
  }

  // 5. Subscribe to push
  try {
    // Remove any stale subscription first to ensure fresh key alignment
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      // Validate the existing subscription's application server key matches our VAPID key
      // If keys changed, we need a fresh subscription
      try {
        return existing.toJSON()
      } catch {
        await existing.unsubscribe()
      }
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey)
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey,
    })

    console.log('[Push] ✅ Successfully subscribed to push notifications')
    return sub.toJSON()
  } catch (err) {
    // Provide specific error messages for common failures
    if (err.name === 'NotAllowedError') {
      console.error('[Push] Permission denied by system (browser or OS level)')
    } else if (err.name === 'InvalidStateError') {
      console.error('[Push] Service worker in invalid state — try refreshing the page')
    } else if (err.message?.includes('applicationServerKey')) {
      console.error('[Push] VAPID key format invalid — regenerate with: npx web-push generate-vapid-keys')
    } else {
      console.error('[Push] Subscribe failed:', err.name, err.message)
    }
    return null
  }
}

// ─── GET EXISTING ─────────────────────────────────────────────

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

// ─── UNSUBSCRIBE ──────────────────────────────────────────────

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err)
  }
}

// ─── SEND PUSH VIA API ────────────────────────────────────────

export async function sendPushToVendor(subscription, { title, body, url, tag, requireInteraction, actions }) {
  if (!subscription?.endpoint) return false
  try {
    const res = await fetch('/api/push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription, title, body, url, tag, requireInteraction, actions }),
    })
    if (res.status === 410) return 'expired'
    return res.ok
  } catch (err) {
    console.warn('[Push] sendPushToVendor error:', err)
    return false
  }
}

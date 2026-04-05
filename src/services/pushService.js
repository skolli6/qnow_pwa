/**
 * pushService.js
 *
 * REQUIRED in Vercel Environment Variables:
 *   VITE_VAPID_PUBLIC_KEY   (browser-visible, must have VITE_ prefix)
 *   VAPID_PUBLIC_KEY        (server-side, api/push.js)
 *   VAPID_PRIVATE_KEY       (server-side, api/push.js)
 *   VAPID_EMAIL             (server-side, e.g. mailto:you@gmail.com)
 *
 * Generate correct keys: npx web-push generate-vapid-keys
 */

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null

  let reg = await navigator.serviceWorker.getRegistration()
  if (reg) return reg

  const regs = await navigator.serviceWorker.getRegistrations()
  return regs.find(r => !!(r.active || r.installing || r.waiting)) || null
}

// ─── DIAGNOSTICS ──────────────────────────────────────────────
// Call diagnosePush() from browser console to see exactly what's wrong:
//   import('/src/services/pushService.js').then(m => m.diagnosePush())

export async function diagnosePush() {
  const results = []
  const log = (ok, msg) => { results.push({ ok, msg }); console[ok ? 'log' : 'error'](`[Push] ${msg}`) }

  log('Notification' in window,   `Notification API: ${'Notification' in window ? 'supported' : 'NOT supported'}`)
  log('serviceWorker' in navigator, `ServiceWorker API: ${'serviceWorker' in navigator ? 'supported' : 'NOT supported'}`)
  log('PushManager' in window,    `PushManager: ${'PushManager' in window ? 'supported' : 'NOT supported — use Chrome on Android'}`)

  if ('Notification' in window) {
    const p = Notification.permission
    log(p === 'granted', `Permission: ${p}`)
  }

  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY
  log(!!key && key.length > 80, `VITE_VAPID_PUBLIC_KEY: ${key ? `present (${key.length} chars)` : 'MISSING — add to Vercel env vars'}`)

  if ('serviceWorker' in navigator) {
    const reg = await getServiceWorkerRegistration()
    log(!!reg, `SW /sw.js: ${reg ? `registered (${reg.scope})` : 'NOT registered — /sw.js might be returning HTML instead of JS (vercel.json issue)'}`)

    if (reg) {
      const sub = await reg.pushManager.getSubscription().catch(() => null)
      log(true, `Existing subscription: ${sub ? 'YES' : 'none yet'}`)
    }
  }

  return results
}

// ─── SUBSCRIBE ────────────────────────────────────────────────

export async function subscribeToPush() {

  // Guard: browser support
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('[Push] Not supported in this browser. Use Chrome on Android.')
    return null
  }

  // Guard: VAPID key
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey || vapidKey.length < 80) {
    console.error('[Push] VITE_VAPID_PUBLIC_KEY missing or invalid. Add it to Vercel environment variables.')
    return null
  }

  // Request permission if not already granted
  if (Notification.permission === 'denied') {
    console.error('[Push] Notifications are blocked. User must reset in browser site settings.')
    return null
  }

  if (Notification.permission !== 'granted') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') {
      console.error('[Push] User denied notification permission.')
      return null
    }
  }

  // Get SW registration — use a flexible lookup instead of a hard-coded path
  let reg = await getServiceWorkerRegistration()

  if (!reg) {
    // SW not registered yet — register it now and wait
    console.log('[Push] Registering service worker...')
    try {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      // Wait for it to become active
      await new Promise((resolve) => {
        if (reg.active) { resolve(); return }
        const worker = reg.installing || reg.waiting
        if (!worker) { resolve(); return }
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve()
        })
        // Fallback resolve after 5 seconds regardless
        setTimeout(resolve, 5000)
      })
    } catch (err) {
      console.error('[Push] Failed to register SW:', err.message,
        '— Check that /sw.js is served as JavaScript, not HTML (vercel.json issue)')
      return null
    }
  }

  // Re-get registration after possible registration
  reg = await getServiceWorkerRegistration()
  if (!reg) {
    console.error('[Push] Service worker still not registered after attempt.')
    return null
  }

  // Subscribe to push
  try {
    // Check for existing valid subscription
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      console.log('[Push] Using existing subscription.')
      return existing.toJSON()
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    console.log('[Push] ✅ Subscribed successfully.')
    return sub.toJSON()

  } catch (err) {
    if (err.name === 'NotAllowedError') {
      console.error('[Push] Permission denied at OS level. Check phone notification settings.')
    } else if (err.message?.includes('applicationServerKey') || err.name === 'InvalidAccessError') {
      console.error('[Push] VAPID key rejected by browser. Regenerate: npx web-push generate-vapid-keys')
    } else if (err.name === 'InvalidStateError') {
      console.error('[Push] SW in invalid state. Refresh page and try again.')
    } else {
      console.error('[Push] Subscribe error:', err.name, '-', err.message)
    }
    return null
  }
}

// ─── GET EXISTING ─────────────────────────────────────────────

export async function getExistingSubscription() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await getServiceWorkerRegistration()
    if (!reg) return null
    const sub = await reg.pushManager.getSubscription()
    return sub ? sub.toJSON() : null
  } catch {
    return null
  }
}

// ─── UNSUBSCRIBE ──────────────────────────────────────────────

export async function unsubscribeFromPush() {
  try {
    const reg = await getServiceWorkerRegistration()
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sub.unsubscribe()
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err)
  }
}

// ─── SEND VIA API ─────────────────────────────────────────────

export async function sendPushToVendor(subscription, payload) {
  if (!subscription?.endpoint) return false
  try {
    const res = await fetch('/api/push', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription, ...payload }),
    })
    if (res.status === 410) return 'expired'
    return res.ok
  } catch (err) {
    console.warn('[Push] sendPushToVendor error:', err)
    return false
  }
}

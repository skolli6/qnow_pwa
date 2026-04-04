/**
 * api/push.js
 * Vercel serverless function — sends Web Push notifications to vendors.
 *
 * Uses the Web Push Protocol with VAPID keys.
 * No Firebase Cloud Functions needed — completely free on Vercel.
 *
 * Called internally when:
 *   - A customer joins a vendor's queue
 *   - A walk-in token is added
 */

import webpush from 'web-push'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { subscription, title, body, url, tag, requireInteraction, actions } = req.body

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Missing push subscription' })
  }

  const vapidPublic  = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail   = process.env.VAPID_EMAIL || 'mailto:support@qnow.in'

  if (!vapidPublic || !vapidPrivate) {
    console.error('VAPID keys not set in environment variables')
    return res.status(500).json({ error: 'Push not configured' })
  }

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

  const payload = JSON.stringify({
    title:               title || 'QNow',
    body:                body  || 'Queue update',
    url:                 url   || '/vendor/dashboard',
    tag:                 tag   || 'qnow-vendor',
    requireInteraction:  requireInteraction || false,
    actions:             actions || [],
  })

  try {
    await webpush.sendNotification(subscription, payload)
    return res.status(200).json({ success: true })
  } catch (err) {
    // 410 Gone = subscription is no longer valid (vendor uninstalled / revoked)
    if (err.statusCode === 410) {
      return res.status(410).json({ error: 'Subscription expired', code: 410 })
    }
    console.error('Push send error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

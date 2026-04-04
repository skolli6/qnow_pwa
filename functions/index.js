// functions/index.js
// Firebase Cloud Functions — free tier: 2M invocations/month
// Deploy: firebase deploy --only functions
//
// This runs server-side so your FCM server key is never exposed in the browser.

const functions = require('firebase-functions')
const admin     = require('firebase-admin')

admin.initializeApp()

// ── SEND PUSH NOTIFICATION ────────────────────────────────────
exports.sendPush = functions.https.onRequest(async (req, res) => {
  // Allow CORS from your Vercel domain
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).send(''); return }
  if (req.method !== 'POST')    { res.status(405).send('Method Not Allowed'); return }

  const { fcmToken, title, body, data = {} } = req.body
  if (!fcmToken || !title) { res.status(400).json({ error: 'Missing fcmToken or title' }); return }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body: body || '' },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
    })
    res.json({ success: true })
  } catch (err) {
    console.error('FCM send error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── AUTO-NOTIFY QUEUE (runs every 5 minutes via Cloud Scheduler) ──
exports.checkQueueNotifications = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const db = admin.firestore()
    // Get all waiting tokens that haven't been notified
    const snap = await db.collection('tokens')
      .where('status', '==', 'waiting')
      .get()

    for (const tokenDoc of snap.docs) {
      const token = tokenDoc.data()
      if (!token.fcmToken) continue

      // Count people ahead in the same vendor queue
      const ahead = await db.collection('tokens')
        .where('vendorId', '==', token.vendorId)
        .where('status', '==', 'waiting')
        .where('createdAt', '<', token.createdAt)
        .get()

      const position = ahead.size + 1

      // Get vendor for slot time
      const vendorSnap = await db.collection('vendors').doc(token.vendorId).get()
      const vendor = vendorSnap.data()
      const slotMin = vendor?.avgSlotMinutes || 15
      const waitMins = position * slotMin

      let notifSent = false

      // 3-ahead alert
      if (position <= 3 && !token.notified3) {
        await admin.messaging().send({
          token: token.fcmToken,
          notification: { title: '⚡ Almost your turn!', body: `Only ${position} people ahead at ${vendor?.name}` },
        })
        await tokenDoc.ref.update({ notified3: true })
        notifSent = true
      }

      // 15-minute alert
      if (waitMins <= 15 && !token.notified15) {
        await admin.messaging().send({
          token: token.fcmToken,
          notification: { title: '⏰ 15 minutes!', body: `Your turn at ${vendor?.name} is coming up soon` },
        })
        await tokenDoc.ref.update({ notified15: true })
        notifSent = true
      }

      if (notifSent) console.log(`Notified token ${tokenDoc.id} at position ${position}`)
    }

    return null
  })

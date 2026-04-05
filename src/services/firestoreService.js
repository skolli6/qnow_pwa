/**
 * firestoreService.js
 * KEY FIX: All queries use single-field where clauses only.
 * Multi-field filtering is done client-side to avoid Firestore composite index errors.
 */
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, increment, Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'

const col = (n) => collection(db, n)

// ─── VENDORS ────────────────────────────────────────────────

export async function registerVendor(data) {
  const ref = await addDoc(col('vendors'), {
    ...data,
    status: 'pending',
    plan: 'free',
    freeTokensUsed: 0,
    planStart: null,
    isOpen: false,
    served: 0,
    walkins: 0,
    lastToken: 0,
    activeQueueCount: 0,
    createdAt: serverTimestamp(),
  })
  await logActivity(`New vendor registered: ${data.name} (${data.city})`)
  return ref.id
}

export async function getVendorByName(name, password) {
  const snap = await getDocs(query(col('vendors'), where('name', '==', name)))
  if (snap.empty) return null
  const v = snap.docs[0]
  const data = v.data()
  if (data.password !== password) return null
  return { id: v.id, ...data }
}

export async function getVendorById(id) {
  const snap = await getDoc(doc(db, 'vendors', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export function subscribeVendor(vendorId, callback) {
  return onSnapshot(doc(db, 'vendors', vendorId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export function subscribeVendors(callback) {
  return onSnapshot(
    query(col('vendors'), where('status', '==', 'approved')),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export function subscribeAllVendors(callback) {
  return onSnapshot(col('vendors'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

export async function updateVendor(id, data) {
  await updateDoc(doc(db, 'vendors', id), data)
}

export async function deleteVendor(id) {
  await deleteDoc(doc(db, 'vendors', id))
}

export async function approveVendor(id, name) {
  await updateDoc(doc(db, 'vendors', id), {
    status: 'approved', isOpen: false, planStart: serverTimestamp(),
  })
  await logActivity(`Vendor approved: ${name}`)
}

export async function suspendVendor(id, name) {
  await updateDoc(doc(db, 'vendors', id), { status: 'suspended', isOpen: false })
  await logActivity(`Vendor suspended: ${name}`)
}

// ─── TOKENS ──────────────────────────────────────────────────

export async function getNextTokenNumber(vendorId) {
  const snap = await getDoc(doc(db, 'vendors', vendorId))
  const next = (snap.data()?.lastToken || 0) + 1
  await updateDoc(doc(db, 'vendors', vendorId), { lastToken: increment(1) })
  return String(next).padStart(3, '0')
}

// ─── INTERNAL: push-notify vendor when token is added ────────
async function notifyVendorPush(vendorId, name, tokenNumber, isWalkIn) {
  try {
    const snap   = await getDoc(doc(db, 'vendors', vendorId))
    const pushSub = snap.data()?.pushSubscription
    if (!pushSub) return
    const label = isWalkIn ? '🚶 Walk-in Added' : '🔔 New Customer Joined!'
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: pushSub,
        title: label,
        body: `${name} — Token T-${tokenNumber}${isWalkIn ? ' (walk-in)' : ''}`,
        url: '/vendor/dashboard',
        tag: 'new-customer',
        requireInteraction: true,
        actions: [{ action: 'open', title: '📋 View Queue' }],
      }),
    })
    if (!res.ok) {
      const error = await res.text().catch(() => res.statusText)
      console.warn('notifyVendorPush failed:', res.status, error)
    }
    // Subscription expired — clean up Firestore
    if (res.status === 410) {
      await updateDoc(doc(db, 'vendors', vendorId), { pushSubscription: null })
    }
  } catch (e) {
    console.warn('notifyVendorPush error:', e)
  }
}

export async function addToken(vendorId, { name, mobile, pin }) {
  const tokenNumber = await getNextTokenNumber(vendorId)
  const ref = await addDoc(col('tokens'), {
    vendorId, name, mobile, pin, tokenNumber,
    status: 'waiting', isWalkIn: false,
    notified3: false, notified15: false, fcmToken: null,
    createdAt: serverTimestamp(), calledAt: null, completedAt: null,
  })
  await updateDoc(doc(db, 'vendors', vendorId), {
    freeTokensUsed: increment(1),
    activeQueueCount: increment(1),
  })
  notifyVendorPush(vendorId, name, tokenNumber, false) // fire-and-forget
  return { id: ref.id, tokenNumber }
}

export async function addWalkInToken(vendorId, name, mobile) {
  const tokenNumber = await getNextTokenNumber(vendorId)
  const ref = await addDoc(col('tokens'), {
    vendorId, name, mobile: mobile || '', pin: '', tokenNumber,
    status: 'waiting', isWalkIn: true,
    notified3: false, notified15: false, fcmToken: null,
    createdAt: serverTimestamp(), calledAt: null, completedAt: null,
  })
  await updateDoc(doc(db, 'vendors', vendorId), {
    walkins: increment(1), freeTokensUsed: increment(1), activeQueueCount: increment(1),
  })
  notifyVendorPush(vendorId, name, tokenNumber, true) // fire-and-forget
  return { id: ref.id, tokenNumber }
}

/**
 * Real-time queue for a vendor.
 * Single-field orderBy on createdAt - requires only the default Firestore index.
 * Status filtering done client-side.
 */
export function subscribeVendorQueue(vendorId, callback) {
  const q = query(col('tokens'), where('vendorId', '==', vendorId))
  return onSnapshot(q, snap => {
    const active = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.status === 'waiting' || t.status === 'serving')
      .sort((a, b) => {
        const aMs = a.createdAt?.toMillis?.() || 0
        const bMs = b.createdAt?.toMillis?.() || 0
        return aMs - bMs
      })
    callback(active)
  }, err => {
    console.error('subscribeVendorQueue error:', err)
  })
}

export function subscribeToken(tokenId, callback) {
  return onSnapshot(doc(db, 'tokens', tokenId), snap => {
    if (snap.exists()) callback({ id: snap.id, ...snap.data() })
  })
}

export async function callNextToken(vendorId) {
  const snap = await getDocs(query(col('tokens'), where('vendorId', '==', vendorId)))
  const waiting = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.status === 'waiting')
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))
  if (!waiting.length) return null
  const next = waiting[0]
  await updateDoc(doc(db, 'tokens', next.id), { status: 'serving', calledAt: serverTimestamp() })
  return next
}

export async function completeToken(tokenId, vendorId) {
  await updateDoc(doc(db, 'tokens', tokenId), {
    status: 'done', completedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'vendors', vendorId), {
    served: increment(1), activeQueueCount: increment(-1),
  })
}

export async function removeToken(tokenId, vendorId) {
  await deleteDoc(doc(db, 'tokens', tokenId))
  if (vendorId) {
    await updateDoc(doc(db, 'vendors', vendorId), {
      activeQueueCount: increment(-1),
    }).catch(() => {})
  }
}

export async function extendToken(tokenId, vendorId, positionsBack = 5) {
  const snap = await getDocs(query(col('tokens'), where('vendorId', '==', vendorId)))
  const queue = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.status === 'waiting')
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))

  const myIdx = queue.findIndex(t => t.id === tokenId)
  if (myIdx === -1) return
  const newIdx = Math.min(myIdx + positionsBack, queue.length - 1)
  if (newIdx <= myIdx) return

  const targetMs = (queue[newIdx].createdAt?.toMillis?.() || Date.now()) + 1000
  await updateDoc(doc(db, 'tokens', tokenId), { createdAt: Timestamp.fromMillis(targetMs) })
}

export async function markTokenNotified(tokenId, type) {
  await updateDoc(doc(db, 'tokens', tokenId),
    type === '3' ? { notified3: true } : { notified15: true })
}

/**
 * Find token by mobile + PIN.
 * Queries by mobile only (no composite index), filters PIN + status in JS.
 * Accepts: exact PIN stored, OR last-4-digits of mobile as fallback.
 */
export async function findTokenByMobilePin(mobile, pin) {
  const cleanMobile = mobile.replace(/\s/g, '')
  const last4 = cleanMobile.replace(/\D/g, '').slice(-4)

  const snap = await getDocs(query(col('tokens'), where('mobile', '==', cleanMobile)))
  if (snap.empty) return null

  const tokens = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  const active = tokens.filter(t => t.status === 'waiting' || t.status === 'serving')

  // Match: exact pin OR last4 fallback
  return active.find(t => t.pin === pin || (pin === last4)) || null
}

export async function getQueueInfo(vendorId) {
  const snap = await getDocs(query(col('tokens'), where('vendorId', '==', vendorId)))
  const all = snap.docs.map(d => d.data())
  return {
    waiting: all.filter(t => t.status === 'waiting').length,
    serving: all.filter(t => t.status === 'serving').length,
  }
}

// ─── USERS ───────────────────────────────────────────────────

export async function upsertUser(mobile, data) {
  await setDoc(doc(db, 'users', mobile), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

// ─── ACTIVITY LOG ────────────────────────────────────────────

export async function logActivity(msg, adminAction = false) {
  try {
    await addDoc(col('activityLog'), { msg, adminAction, time: serverTimestamp() })
  } catch (e) { console.warn('logActivity:', e) }
}

export function subscribeActivityLog(callback, limitCount = 80) {
  return onSnapshot(
    query(col('activityLog'), orderBy('time', 'desc'), limit(limitCount)),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  )
}

// ─── FCM ─────────────────────────────────────────────────────

export async function saveTokenFCM(tokenDocId, fcmToken) {
  await updateDoc(doc(db, 'tokens', tokenDocId), { fcmToken })
}

// ─── WEB PUSH — VENDOR ───────────────────────────────────────

export async function savePushSubscription(vendorId, subscription) {
  await updateDoc(doc(db, 'vendors', vendorId), {
    pushSubscription: subscription,  // null to remove
  })
}

// ─── WEB PUSH — CUSTOMER ─────────────────────────────────────

/** Save customer's push subscription to their token doc in Firestore */
export async function saveCustomerPushSubscription(tokenId, subscription) {
  await updateDoc(doc(db, 'tokens', tokenId), {
    customerPushSubscription: subscription,
  })
}

/**
 * Push-notify a customer directly.
 * Called from callNextToken and when approaching-turn conditions are met.
 */
export async function notifyCustomerPush(tokenId, { title, body, url, tag }) {
  try {
    const snap = await getDoc(doc(db, 'tokens', tokenId))
    const sub  = snap.data()?.customerPushSubscription
    if (!sub) return // customer didn't enable push — WhatsApp is fallback

    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription:        sub,
        title,
        body,
        url:                 url  || '/token',
        tag:                 tag  || 'customer-turn',
        requireInteraction:  true,
        actions: [{ action: 'open', title: '📋 View My Token' }],
      }),
    })
    if (!res.ok) {
      const error = await res.text().catch(() => res.statusText)
      console.warn('notifyCustomerPush failed:', res.status, error)
    }
    if (res.status === 410) {
      // Subscription expired — clean up
      await updateDoc(doc(db, 'tokens', tokenId), { customerPushSubscription: null })
    }
  } catch (e) {
    console.warn('notifyCustomerPush error:', e)
  }
}

/** Helper used in callNextToken — notify both customer push AND WhatsApp */
export async function callNextTokenAndNotify(vendorId, vendorName, slotMinutes) {
  const snap = await getDocs(query(col('tokens'), where('vendorId', '==', vendorId)))
  const waiting = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.status === 'waiting')
    .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0))

  if (!waiting.length) return null

  const next = waiting[0]

  // Mark as serving
  await updateDoc(doc(db, 'tokens', next.id), {
    status:   'serving',
    calledAt: serverTimestamp(),
  })

  // Push notify this customer (if subscribed)
  notifyCustomerPush(next.id, {
    title: `🔔 It's your turn, ${next.name}!`,
    body:  `Token T-${next.tokenNumber} at ${vendorName} — please go to the counter now.`,
    url:   '/token',
    tag:   'your-turn',
  })

  // Also check upcoming customers for 3-ahead and 15-min alerts
  waiting.slice(1).forEach((t, idx) => {
    const pos      = idx + 1          // position after next is called (1-based)
    const waitMins = pos * (slotMinutes || 15)

    // 3-ahead push
    if (pos <= 3 && !t.notified3) {
      notifyCustomerPush(t.id, {
        title: `⚡ Almost your turn, ${t.name}!`,
        body:  `Only ${pos} ${pos === 1 ? 'person' : 'people'} ahead at ${vendorName}.`,
        url:   '/token',
        tag:   'nearly-there',
      })
      updateDoc(doc(db, 'tokens', t.id), { notified3: true }).catch(() => {})
    }

    // 15-min push
    if (waitMins <= 15 && !t.notified15) {
      notifyCustomerPush(t.id, {
        title: `⏰ 15 minutes, ${t.name}!`,
        body:  `Your turn at ${vendorName} is about 15 minutes away.`,
        url:   '/token',
        tag:   '15-min',
      })
      updateDoc(doc(db, 'tokens', t.id), { notified15: true }).catch(() => {})
    }
  })

  return next
}

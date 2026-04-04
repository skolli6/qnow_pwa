import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  subscribeVendorQueue, callNextTokenAndNotify, completeToken,
  removeToken, addWalkInToken, updateVendor, savePushSubscription
} from '../services/firestoreService'
import { sendYourTurnNow, sendNearlyThereAlert, send15MinAlert } from '../services/whatsappService'
import { subscribeToPush, getExistingSubscription, diagnosePush } from '../services/pushService'
import { useApp } from '../contexts/AppContext'

function timeAgo(ts) {
  if (!ts) return 'just now'
  const ms = ts.toMillis ? ts.toMillis() : new Date(ts).getTime()
  const diff = Math.floor((Date.now() - ms) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return `${diff}m ago`
  return `${Math.floor(diff / 60)}h ago`
}

export default function VendorDashboard() {
  const nav = useNavigate()
  const { currentVendor, logoutVendor, toast } = useApp()

  const [queue, setQueue]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [wiName, setWiName]         = useState('')
  const [wiMobile, setWiMobile]     = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const deferredPromptRef = useRef(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    if (!currentVendor?.id) { nav('/vendor'); return }
    unsubRef.current = subscribeVendorQueue(currentVendor.id, setQueue)

    // Check push subscription status
    getExistingSubscription().then(sub => {
      setPushEnabled(!!sub && !!currentVendor.pushSubscription)
    })

    // Listen for PWA install prompt (Android Chrome shows this automatically)
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      deferredPromptRef.current = e
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      unsubRef.current?.()
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [currentVendor?.id])

  async function handleEnablePush() {
    // Run diagnostics first — results visible in browser console (F12)
    const diag = await diagnosePush()

    if (!diag.ready) {
      // Show the first specific issue found
      const firstIssue = diag.issues[0] || ''

      if (firstIssue.includes('VITE_VAPID_PUBLIC_KEY')) {
        toast('❌ Push not configured. Admin needs to add VITE_VAPID_PUBLIC_KEY to Vercel env vars.')
      } else if (firstIssue.includes('DENIED') || firstIssue.includes('denied')) {
        toast('❌ Notifications blocked. Open browser Settings → Site Settings → Notifications → Allow for this site.')
      } else if (firstIssue.includes('PushManager') || firstIssue.includes('Chrome')) {
        toast('❌ Push not supported. Please use Chrome browser on Android.')
      } else if (firstIssue.includes('Service worker')) {
        toast('❌ Service worker not ready. Refresh the page and try again.')
      } else if (firstIssue.includes('short') || firstIssue.includes('invalid')) {
        toast('❌ VAPID key invalid. Regenerate keys with: npx web-push generate-vapid-keys')
      } else {
        toast('❌ Could not enable notifications. Open browser console (F12) for details.')
      }
      return
    }

    const sub = await subscribeToPush()
    if (sub) {
      await savePushSubscription(currentVendor.id, sub)
      setPushEnabled(true)
      toast('✅ Push notifications enabled! You\'ll get a buzz when customers join.')
    } else {
      toast('❌ Subscription failed. Open browser console (F12) for the exact error, then share it with support.')
    }
  }

  async function handleInstallPWA() {
    const prompt = deferredPromptRef.current
    if (!prompt) {
      toast('Open this page in Chrome and use "Add to Home Screen" from the menu')
      return
    }
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      toast('✅ QNow installed on your home screen!')
      setShowInstallBanner(false)
      deferredPromptRef.current = null
    }
  }

  if (!currentVendor) return null

  const vendor   = currentVendor
  const waiting  = queue.filter(t => t.status === 'waiting')
  const serving  = queue.find(t => t.status === 'serving')
  const isApproved = vendor.status === 'approved'
  const slot       = vendor.avgSlotMinutes || 15
  const tokensLeft = Math.max(0, 50 - (vendor.freeTokensUsed || 0))
  const daysLeft   = vendor.planStart
    ? Math.max(0, 30 - Math.floor((Date.now() - (vendor.planStart?.toMillis?.() || Date.now())) / 86400000))
    : 30

  async function handleCallNext() {
    if (serving) { toast('⚠ Complete the current customer first'); return }
    if (!waiting.length) { toast('Queue is empty'); return }
    setLoading(true)
    try {
      // callNextTokenAndNotify handles: mark as serving + customer push + upcoming push alerts
      const next = await callNextTokenAndNotify(vendor.id, vendor.name, slot)
      if (next) {
        // WhatsApp "your turn now" (primary notification for customers without push)
        if (next.mobile) {
          sendYourTurnNow({
            name: next.name, mobile: next.mobile,
            tokenNumber: next.tokenNumber, vendorName: vendor.name
          }).catch(() => {})
        }
        // WhatsApp alerts for upcoming customers
        waiting.slice(1).forEach((t, i) => {
          const pos      = i + 1
          const waitMins = pos * slot
          if (pos <= 2 && t.mobile && !t.notified3) {
            sendNearlyThereAlert({ name: t.name, mobile: t.mobile, tokenNumber: t.tokenNumber, vendorName: vendor.name, ahead: pos }).catch(() => {})
          }
          if (waitMins <= 15 && t.mobile && !t.notified15) {
            send15MinAlert({ name: t.name, mobile: t.mobile, tokenNumber: t.tokenNumber, vendorName: vendor.name }).catch(() => {})
          }
        })
        toast(`▶ Calling T-${next.tokenNumber} — ${next.name}`)
      } else {
        toast('Queue is empty')
      }
    } catch (e) { console.error(e); toast('❌ Error calling next') }
    setLoading(false)
  }

  async function handleComplete() {
    if (!serving) return
    setLoading(true)
    try {
      await completeToken(serving.id, vendor.id)
      toast('✅ Marked complete')
    } catch (e) { toast('❌ Error completing') }
    setLoading(false)
  }

  async function handleRemove(tokenId) {
    try {
      await removeToken(tokenId, vendor.id)
      toast('Removed from queue')
    } catch (e) { toast('❌ Error removing') }
  }

  async function handleWalkIn() {
    if (!wiName.trim()) { toast('⚠ Enter customer name'); return }
    setLoading(true)
    try {
      const { tokenNumber } = await addWalkInToken(vendor.id, wiName.trim(), wiMobile.trim())
      toast(`✅ Walk-in T-${tokenNumber} assigned to ${wiName}`)
      setWiName(''); setWiMobile(''); setShowWalkIn(false)
    } catch (e) { toast('❌ Error adding walk-in') }
    setLoading(false)
  }

  async function handleToggleOpen() {
    if (!isApproved) { toast('⚠ Service not approved yet. Contact admin.'); return }
    try {
      await updateVendor(vendor.id, { isOpen: !vendor.isOpen })
      toast(vendor.isOpen ? '🔒 Service closed' : '✅ Service is now open')
    } catch (e) { toast('❌ Could not update status') }
  }

  const statusBadge = vendor.status === 'pending'
    ? <span className="badge badge-amber">⏳ PENDING APPROVAL</span>
    : vendor.status === 'suspended'
      ? <span className="badge badge-red">🚫 SUSPENDED</span>
      : vendor.isOpen
        ? <span className="badge badge-green"><span className="dot dot-green" style={{marginRight:4}}></span>OPEN</span>
        : <span className="badge badge-red">CLOSED</span>

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <div className="nav-right">
          {statusBadge}
          <button
            className="btn btn-ghost-white btn-sm"
            onClick={handleToggleOpen}
            disabled={!isApproved || loading}
            style={{ opacity: isApproved ? 1 : .45 }}
          >
            {vendor.isOpen ? '🔒 Close' : '🔓 Open'}
          </button>
          <button className="btn btn-ghost-white btn-sm" onClick={() => { logoutVendor(); nav('/') }}>
            Logout
          </button>
        </div>
      </nav>

      <div className="content wide pt">
        {/* PWA Install Banner */}
        {showInstallBanner && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:12, padding:'14px 16px', background:'linear-gradient(135deg,#0A3D35,#1E7A69)',
            borderRadius:'var(--r)', marginBottom:16, flexWrap:'wrap',
          }}>
            <div style={{color:'#fff'}}>
              <div style={{fontWeight:700, fontSize:'.95rem'}}>📲 Install QNow on your phone</div>
              <div style={{fontSize:'.8rem', opacity:.8, marginTop:2}}>
                Manage your queue even when the browser is closed
              </div>
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={handleInstallPWA}>
                Install App
              </button>
              <button
                className="btn btn-ghost-white btn-sm"
                onClick={() => setShowInstallBanner(false)}
              >
                Later
              </button>
            </div>
          </div>
        )}

        {/* Push Notification Enable Banner */}
        {!pushEnabled && currentVendor?.status === 'approved' && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:12, padding:'14px 16px', background:'#FEF9C3',
            border:'1.5px solid #FDE047', borderRadius:'var(--r)',
            marginBottom:16, flexWrap:'wrap',
          }}>
            <div>
              <div style={{fontWeight:700, fontSize:'.9rem', color:'#713F12'}}>
                🔔 Enable push notifications
              </div>
              <div style={{fontSize:'.8rem', color:'#92400E', marginTop:2}}>
                Get alerted on your phone when a customer joins — even when QNow is not open
              </div>
            </div>
            <button
              className="btn btn-sm"
              style={{background:'#D97706', color:'#fff', flexShrink:0}}
              onClick={handleEnablePush}
            >
              Enable Now
            </button>
          </div>
        )}

        {/* Push enabled confirmation */}
        {pushEnabled && (
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
            background:'#D1FAE5', border:'1px solid #6EE7B7',
            borderRadius:'var(--r2)', marginBottom:16,
            fontSize:'.83rem', color:'#065F46', fontWeight:600,
          }}>
            <span>🔔</span>
            <span>Push notifications active — you'll be alerted when customers join</span>
          </div>
        )}

        {/* Header */}
        {vendor.status === 'pending' && (
          <div className="notif-banner" style={{ background: '#92400E', marginBottom: 16 }}>
            ⏳ <strong>Pending admin approval.</strong> Queue management will be enabled once an admin approves your registration.
          </div>
        )}
        {vendor.status === 'suspended' && (
          <div className="notif-banner red" style={{ marginBottom: 16 }}>
            🚫 This service has been <strong>suspended</strong>. Please contact support.
          </div>
        )}
        {isApproved && vendor.plan === 'free' && (
          <div className="notif-banner dark" style={{ background: 'var(--teal2)', marginBottom: 16 }}>
            🎁 Free Plan: <strong>{tokensLeft} tokens</strong> left · <strong>{daysLeft} days</strong> remaining. Upgrade to ₹500/month for unlimited.
          </div>
        )}

        {/* Header */}
        <div className="section-title">{vendor.icon || '🏪'} {vendor.name}</div>
        <div style={{ color: 'var(--text3)', fontSize: '.82rem', marginBottom: 18 }}>
          {vendor.category} · {vendor.city}{vendor.location ? `, ${vendor.location}` : ''} · {vendor.openTime}–{vendor.closeTime}
        </div>

        {/* Stats */}
        <div className="dash-stats">
          <div className="dash-stat">
            <div className="big">{waiting.length}</div>
            <div className="lbl">Waiting</div>
          </div>
          <div className="dash-stat">
            <div className="big">{vendor.served || 0}</div>
            <div className="lbl">Served Today</div>
          </div>
          <div className="dash-stat">
            <div className="big">{vendor.walkins || 0}</div>
            <div className="lbl">Walk-ins</div>
          </div>
          <div className="dash-stat">
            <div className="big">{waiting.length ? `${waiting.length * slot}m` : '—'}</div>
            <div className="lbl">Total Wait</div>
          </div>
        </div>

        {/* Currently serving */}
        {serving && (
          <div className="serving-card">
            <div>
              <div className="slbl">
                Now Serving {serving.isWalkIn && <span className="walkin-pill">WALK-IN</span>}
              </div>
              <div className="sval">T-{serving.tokenNumber}</div>
              <div className="sname">{serving.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: .75, fontSize: '.82rem' }}>📱 {serving.mobile || 'No mobile'}</div>
              <button
                className="btn btn-sm"
                style={{ background: '#A7F3D0', color: '#065F46', marginTop: 8 }}
                onClick={handleComplete}
                disabled={loading}
              >
                ✓ Mark Complete
              </button>
            </div>
          </div>
        )}

        {/* Queue card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Live Queue ({waiting.length} waiting)</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <button
                className="btn btn-purple btn-sm"
                onClick={() => setShowWalkIn(true)}
                disabled={!isApproved || loading}
                style={{ opacity: isApproved ? 1 : .45 }}
              >
                🚶 Walk-in
              </button>
              <button
                className="btn btn-green btn-sm"
                onClick={handleCallNext}
                disabled={!isApproved || loading || !!serving}
                style={{ opacity: (isApproved && !serving) ? 1 : .45 }}
              >
                {loading ? '⏳' : '▶ Call Next'}
              </button>
            </div>
          </div>

          {!isApproved ? (
            <div className="empty-state">
              <div className="emoji">⏳</div>
              <p>Queue management is available after admin approval.</p>
            </div>
          ) : !waiting.length ? (
            <div className="empty-state">
              <div className="emoji">🎉</div>
              <p>No one waiting right now.<br />Your queue is clear!</p>
            </div>
          ) : waiting.map((t, i) => (
            <div key={t.id} className={`queue-item${i === 0 ? ' current' : ''}${(t.notified3 || t.notified15) ? ' notified' : ''}${t.isWalkIn ? ' walkin' : ''}`}>
              <div className="q-num">T-{t.tokenNumber}</div>
              <div className="q-info">
                <div className="q-name">
                  {t.name}
                  {t.isWalkIn && <span className="walkin-pill">WALK-IN</span>}
                  {i === 0 && <span className="badge badge-green" style={{ marginLeft: 6 }}>Up Next</span>}
                  {(t.notified3 || t.notified15) && <span className="badge badge-amber" style={{ marginLeft: 6 }}>Notified</span>}
                </div>
                <div className="q-sub">{t.mobile || 'No mobile provided'}</div>
                <div className="q-time">
                  <span>⏱ ~{(i + 1) * slot} min wait</span>
                  <span>Joined {timeAgo(t.createdAt)}</span>
                </div>
              </div>
              <div className="q-actions">
                <button className="btn btn-sm btn-danger" onClick={() => handleRemove(t.id)} title="Remove from queue">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Walk-in modal */}
      {showWalkIn && (
        <div className="modal-overlay open">
          <div className="modal">
            <h3>🚶 Add Walk-in Customer</h3>
            <p>Assign the next available token to a customer who arrived directly.</p>
            <div className="form-group">
              <label>Customer Name *</label>
              <input value={wiName} onChange={e => setWiName(e.target.value)} placeholder="e.g. Priya Reddy" autoFocus />
            </div>
            <div className="form-group">
              <label>Mobile Number (optional)</label>
              <input type="tel" value={wiMobile} onChange={e => setWiMobile(e.target.value)} placeholder="+91 98765 43210" />
              <div className="form-hint">If provided, they'll get WhatsApp notifications</div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => { setShowWalkIn(false); setWiName(''); setWiMobile('') }}>Cancel</button>
              <button className="btn btn-purple" onClick={handleWalkIn} disabled={loading}>
                🎫 Assign Token
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

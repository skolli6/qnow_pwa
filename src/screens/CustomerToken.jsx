import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeToken, subscribeVendorQueue, extendToken, getVendorById } from '../services/firestoreService'
import { sendNearlyThereAlert, send15MinAlert } from '../services/whatsappService'
import { useApp } from '../contexts/AppContext'

export default function CustomerToken() {
  const nav = useNavigate()
  const { currentCustomer, logoutCustomer, toast } = useApp()
  const [token, setToken]           = useState(null)
  const [queue, setQueue]           = useState([])
  const [vendor, setVendor]         = useState(null)
  const [extending, setExtending]   = useState(false)
  const [showExtend, setShowExtend] = useState(false)
  const notifiedRef = useRef({ n3: false, n15: false })

  useEffect(() => {
    if (!currentCustomer) { nav('/check'); return }
    const { tokenId, vendorId } = currentCustomer

    getVendorById(vendorId).then(setVendor)

    const unsub1 = subscribeToken(tokenId, setToken)
    const unsub2 = subscribeVendorQueue(vendorId, setQueue)
    return () => { unsub1(); unsub2() }
  }, [currentCustomer])

  // Auto-notify when position changes
  useEffect(() => {
    if (!token || !queue.length || !vendor || !currentCustomer) return
    const waiting = queue.filter(t => t.status === 'waiting')
    const myIdx   = waiting.findIndex(t => t.id === currentCustomer.tokenId)
    if (myIdx === -1) return // not in waiting list (maybe serving/done)
    const ahead  = myIdx        // people ahead of me
    const myPos  = myIdx + 1

    if (ahead < 3 && !notifiedRef.current.n3 && !token.notified3) {
      notifiedRef.current.n3 = true
      if (currentCustomer.mobile) {
        sendNearlyThereAlert({
          name: currentCustomer.name, mobile: currentCustomer.mobile,
          tokenNumber: token.tokenNumber, vendorName: vendor.name, ahead: myPos
        }).catch(() => {})
      }
    }

    const waitMins = myPos * (vendor.avgSlotMinutes || 15)
    if (waitMins <= 15 && !notifiedRef.current.n15 && !token.notified15) {
      notifiedRef.current.n15 = true
      if (currentCustomer.mobile) {
        send15MinAlert({
          name: currentCustomer.name, mobile: currentCustomer.mobile,
          tokenNumber: token.tokenNumber, vendorName: vendor.name
        }).catch(() => {})
      }
    }
  }, [token, queue, vendor])

  async function handleExtend() {
    setExtending(true)
    try {
      await extendToken(currentCustomer.tokenId, currentCustomer.vendorId, 5)
      toast('✅ Slot extended by 5 positions')
      setShowExtend(false)
    } catch (e) {
      console.error(e)
      toast('❌ Could not extend slot')
    }
    setExtending(false)
  }

  if (!currentCustomer) return null

  const waiting   = queue.filter(t => t.status === 'waiting')
  const myIdx     = waiting.findIndex(t => t.id === currentCustomer.tokenId)
  const myPos     = myIdx + 1  // 0 if not found (served or serving)
  const isServing = token?.status === 'serving'
  const isDone    = token?.status === 'done'
  const slot      = vendor?.avgSlotMinutes || 15
  const waitMins  = myPos > 0 ? myPos * slot : 0
  const progress  = waiting.length > 0 && myPos > 0
    ? Math.max(4, 100 - (myPos / waiting.length) * 100)
    : 100

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <div className="nav-right">
          <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/browse')}>Browse</button>
          <button className="btn btn-ghost-white btn-sm" onClick={() => { logoutCustomer(); nav('/') }}>Exit</button>
        </div>
      </nav>
      <div className="content pt">

        {/* Status banners */}
        {isServing && <div className="notif-banner green" style={{marginBottom:14}}>🔔 <strong>It's YOUR TURN!</strong> Please go to the counter now.</div>}
        {isDone    && <div className="notif-banner" style={{marginBottom:14}}>✅ Your appointment is complete. Thank you for using QNow!</div>}
        {!isServing && !isDone && token?.notified3 && <div className="notif-banner" style={{marginBottom:14}}>⚡ <strong>Almost there!</strong> Only a few people ahead of you.</div>}

        {/* Token display */}
        {token && (
          <div className="token-box" style={{marginBottom:14}}>
            <div className="token-label">{vendor?.icon || '🏪'} {vendor?.name || currentCustomer.vendorName}</div>
            <div className="token-label" style={{marginTop:2}}>Your Token</div>
            <div className="token-number">T-{token.tokenNumber}</div>
            <div className="token-name">{currentCustomer.name}</div>
            <div className="token-service">{vendor?.category} · {vendor?.city}</div>
            <div className="token-stats">
              <div className="token-stat">
                <div className="val">{isServing ? 'NOW' : isDone ? '✓' : myPos > 0 ? `#${myPos}` : '—'}</div>
                <div className="lbl">Position</div>
              </div>
              <div className="token-stat">
                <div className="val">{isServing || isDone ? '—' : myPos > 0 ? `${waitMins}m` : '—'}</div>
                <div className="lbl">Est. Wait</div>
              </div>
              <div className="token-stat">
                <div className="val">{waiting.length}</div>
                <div className="lbl">In Queue</div>
              </div>
            </div>
          </div>
        )}

        {/* Extend button */}
        {!isServing && !isDone && myPos > 0 && (
          <button className="btn btn-ghost btn-full" style={{marginBottom:14}} onClick={() => setShowExtend(true)}>
            ⏰ Can't make it in time? Extend my slot
          </button>
        )}

        {/* Live progress */}
        <div className="card">
          <div className="card-title">📊 Live Queue Status</div>
          <div style={{marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,alignItems:'center'}}>
              <span style={{fontSize:'.85rem',color:'var(--text2)'}}>Your position in queue</span>
              <strong style={{color:'var(--teal)',fontFamily:"'DM Mono',monospace"}}>
                {isServing ? '🟢 Serving Now' : isDone ? '✅ Done' : myPos > 0 ? `#${myPos} of ${waiting.length}` : '—'}
              </strong>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{width:`${progress}%`}}/>
            </div>
            <div style={{marginTop:8,fontSize:'.83rem',color:'var(--text2)',lineHeight:1.6}}>
              {isServing
                ? '🔔 Your turn is right now!'
                : isDone
                  ? '✅ All done — see you next time!'
                  : myPos > 0
                    ? <>Est. wait: <strong>{waitMins} min</strong> · {vendor?.name}</>
                    : '⏳ Loading your position…'}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">💬 WhatsApp Notifications</div>
          <div style={{marginTop:10,fontSize:'.83rem',color:'var(--text2)',lineHeight:1.85}}>
            <div>{token?.notified3 ? '✅' : '⏳'} Alert when 3 people are ahead</div>
            <div>{token?.notified15 ? '✅' : '⏳'} Alert 15 minutes before your turn</div>
            <div>📱 Notifications go to: <strong>{currentCustomer.mobile}</strong></div>
          </div>
        </div>
      </div>

      {/* Extend modal */}
      {showExtend && (
        <div className="modal-overlay open">
          <div className="modal">
            <h3>⏰ Need More Time?</h3>
            <p>Moving your slot <strong>5 positions back</strong> gives you more time to arrive. Your WhatsApp notifications will continue from your new position.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowExtend(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExtend} disabled={extending}>
                {extending ? '⏳ Extending…' : 'Yes, Extend My Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getVendorById, addToken, subscribeVendorQueue,
  saveCustomerPushSubscription
} from '../services/firestoreService'
import { subscribeToPush } from '../services/pushService'
import { sendTokenConfirmation } from '../services/whatsappService'
import { useApp } from '../contexts/AppContext'

export default function CustomerEnroll() {
  const { vendorId } = useParams()
  const nav = useNavigate()
  const { toast, loginCustomer } = useApp()

  const [vendor, setVendor]       = useState(null)
  const [step, setStep]           = useState(1)
  const [queue, setQueue]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [name, setName]           = useState('')
  const [mobile, setMobile]       = useState('')
  const [pin, setPin]             = useState('')
  const [pin2, setPin2]           = useState('')
  const [usingDefault, setUsingDefault] = useState(true)
  const [issued, setIssued]       = useState(null)
  const unsubRef = useRef(null)

  useEffect(() => {
    getVendorById(vendorId).then(v => { if (!v) { nav('/browse'); return }; setVendor(v) })
    unsubRef.current = subscribeVendorQueue(vendorId, setQueue)
    return () => unsubRef.current?.()
  }, [vendorId])

  const digits     = mobile.replace(/\D/g, '')
  const defaultPin = digits.length >= 4 ? digits.slice(-4) : ''
  const waiting    = queue.filter(t => t.status === 'waiting')
  const queueLen   = waiting.length
  const slot       = vendor?.avgSlotMinutes || 15
  const waitMins   = (queueLen + 1) * slot  // includes this new customer

  function handleMobileChange(val) {
    setMobile(val)
    if (usingDefault) {
      const d = val.replace(/\D/g, '')
      const l4 = d.length >= 4 ? d.slice(-4) : ''
      setPin(l4); setPin2(l4)
    }
  }

  function handleUseDefault(yes) {
    setUsingDefault(yes)
    if (yes) { setPin(defaultPin); setPin2(defaultPin) }
    else { setPin(''); setPin2('') }
  }

  function goToStep2() {
    if (!name.trim()) { toast('⚠ Please enter your name'); return }
    const m = mobile.replace(/\s/g, '')
    if (!m || m.replace(/\D/g,'').length < 7) { toast('⚠ Enter a valid mobile number'); return }
    if (usingDefault && defaultPin.length === 4) { setPin(defaultPin); setPin2(defaultPin) }
    setStep(2)
  }

  async function handleGetToken() {
    const finalPin = usingDefault ? defaultPin : pin
    if (!finalPin || finalPin.length !== 4) { toast('⚠ PIN must be exactly 4 digits'); return }
    if (!usingDefault && pin !== pin2) { toast('❌ PINs do not match'); return }
    setLoading(true)
    try {
      const m = mobile.replace(/\s/g, '')
      const { id, tokenNumber } = await addToken(vendorId, { name: name.trim(), mobile: m, pin: finalPin })

      // Web Push subscription — subscribe customer so they get buzzes even when browser is closed
      // Best-effort: if denied or unsupported, WhatsApp is the fallback
      subscribeToPush().then(sub => {
        if (sub) saveCustomerPushSubscription(id, sub).catch(() => {})
      }).catch(() => {})

      // WhatsApp confirmation (primary notification channel)
      sendTokenConfirmation({
        name: name.trim(), mobile: m, tokenNumber,
        vendorName: vendor.name, position: queueLen + 1, waitMins
      }).catch(() => {})

      loginCustomer({ name: name.trim(), mobile: m, pin: finalPin, tokenId: id, tokenNumber, vendorId, vendorName: vendor.name })
      setIssued({ tokenNumber, position: queueLen + 1, waitMins, pin: finalPin, tokenId: id })
      setStep(3)
      toast('🎉 You\'re in the queue!')
    } catch (err) {
      console.error(err)
      toast('❌ Could not join queue. Please try again.')
    }
    setLoading(false)
  }

  const sc = n => ({ className: `step-circle${step > n ? ' done' : step === n ? ' active' : ''}`, children: step > n ? '✓' : n })

  if (!vendor) return <div className="screen"><div style={{margin:'80px auto',textAlign:'center'}}><div className="spinner"/></div></div>

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/browse')}>← Back</button>
      </nav>
      <div className="content pt">

        <div className="steps">
          <div className="step"><div {...sc(1)}/></div>
          <div className="step"><div className={`step-line${step>1?' done':''}`}/><div {...sc(2)}/></div>
          <div className="step"><div className={`step-line${step>2?' done':''}`}/><div {...sc(3)}/></div>
        </div>

        {/* STEP 1: Details + Queue info */}
        {step === 1 && (
          <div className="card">
            <div className="section-title" style={{fontSize:'1.15rem'}}>Join Queue</div>

            {/* Service info */}
            <div className="highlight-box" style={{margin:'10px 0 16px'}}>
              <strong>{vendor.icon||'🏪'} {vendor.name}</strong><br/>
              <span style={{fontSize:'.8rem',color:'var(--text2)'}}>{vendor.category} · {vendor.city}, {vendor.location}</span>
            </div>

            {/* Live queue info — helps customer decide whether to join */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
              <div style={{textAlign:'center',padding:'12px 8px',background:'var(--surface2)',borderRadius:'var(--r2)'}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:'1.5rem',fontWeight:700,color: queueLen > 5 ? 'var(--red)' : queueLen > 2 ? 'var(--amber)' : 'var(--green)'}}>{queueLen}</div>
                <div style={{fontSize:'.7rem',color:'var(--text3)',marginTop:2,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>In Queue</div>
              </div>
              <div style={{textAlign:'center',padding:'12px 8px',background:'var(--surface2)',borderRadius:'var(--r2)'}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:'1.5rem',fontWeight:700,color:'var(--teal)'}}>{waitMins}m</div>
                <div style={{fontSize:'.7rem',color:'var(--text3)',marginTop:2,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>Est. Wait</div>
              </div>
              <div style={{textAlign:'center',padding:'12px 8px',background:'var(--surface2)',borderRadius:'var(--r2)'}}>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:'1.5rem',fontWeight:700,color:'var(--teal)'}}>{slot}m</div>
                <div style={{fontSize:'.7rem',color:'var(--text3)',marginTop:2,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>Per Person</div>
              </div>
            </div>

            {queueLen === 0 && (
              <div style={{padding:'10px 14px',background:'#D1FAE5',borderRadius:'var(--r2)',fontSize:'.83rem',color:'#065F46',fontWeight:600,marginBottom:14}}>
                🎉 No one waiting — you'll be served almost immediately!
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>👤 Your Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Sharma" autoComplete="name"/>
              </div>
              <div className="form-group">
                <label>📱 Mobile Number *</label>
                <input type="tel" value={mobile} onChange={e => handleMobileChange(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel"/>
              </div>
            </div>

            <div style={{display:'flex',alignItems:'center',gap:9,padding:'11px 14px',background:'#E8FAF0',borderRadius:'var(--r2)',border:'1.5px solid #86EFAC',marginBottom:14,fontSize:'.83rem',fontWeight:600,color:'#166534'}}>
              <span>💬</span> Queue updates will be sent to your <strong>WhatsApp</strong>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={goToStep2}>
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2: PIN */}
        {step === 2 && (
          <div className="card">
            <div className="section-title" style={{fontSize:'1.15rem'}}>Set Your Access PIN</div>
            <p style={{fontSize:'.88rem',color:'var(--text2)',marginBottom:18,lineHeight:1.6}}>
              Use this PIN to re-check your token status anytime — from any device.
            </p>

            {/* Option A: default */}
            <div onClick={() => handleUseDefault(true)} style={{
              padding:'14px 16px',borderRadius:'var(--r2)',marginBottom:10,cursor:'pointer',
              border:`2px solid ${usingDefault?'var(--teal3)':'var(--border)'}`,
              background:usingDefault?'#ECFDF5':'var(--surface2)',transition:'all .18s'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,border:`2px solid ${usingDefault?'var(--teal3)':'var(--border)'}`,background:usingDefault?'var(--teal3)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {usingDefault && <span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'.9rem'}}>
                    Use last 4 digits of my mobile
                    {defaultPin && <span style={{marginLeft:8,fontFamily:"'DM Mono',monospace",background:'var(--teal)',color:'#fff',padding:'1px 8px',borderRadius:6,letterSpacing:3}}>{defaultPin}</span>}
                  </div>
                  <div style={{fontSize:'.78rem',color:'var(--text3)',marginTop:2}}>Easiest to remember — recommended</div>
                </div>
              </div>
            </div>

            {/* Option B: custom */}
            <div onClick={() => handleUseDefault(false)} style={{
              padding:'14px 16px',borderRadius:'var(--r2)',marginBottom:18,cursor:'pointer',
              border:`2px solid ${!usingDefault?'var(--amber)':'var(--border)'}`,
              background:!usingDefault?'#FFF7ED':'var(--surface2)',transition:'all .18s'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:20,height:20,borderRadius:'50%',flexShrink:0,border:`2px solid ${!usingDefault?'var(--amber)':'var(--border)'}`,background:!usingDefault?'var(--amber)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {!usingDefault && <span style={{color:'#fff',fontSize:11,fontWeight:700}}>✓</span>}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'.9rem'}}>I want to set my own PIN</div>
                  <div style={{fontSize:'.78rem',color:'var(--text3)',marginTop:2}}>Choose any 4 numbers you prefer</div>
                </div>
              </div>
            </div>

            {!usingDefault && (
              <>
                <div className="form-group">
                  <label>Enter PIN</label>
                  <input type="password" className="pin-input" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} placeholder="····"/>
                </div>
                <div className="form-group">
                  <label>Confirm PIN</label>
                  <input type="password" className="pin-input" maxLength={4} value={pin2} onChange={e => setPin2(e.target.value)} placeholder="····"/>
                </div>
              </>
            )}

            <div style={{padding:'12px 14px',background:'var(--surface2)',borderRadius:'var(--r2)',fontSize:'.82rem',color:'var(--text2)',marginBottom:16,lineHeight:1.6}}>
              📋 To re-check later: open QNow → "My Token" → <strong>{mobile}</strong> + PIN <strong>{usingDefault && defaultPin ? defaultPin : '(your chosen PIN)'}</strong>
            </div>

            <button className="btn btn-primary btn-full btn-lg" onClick={handleGetToken} disabled={loading}>
              {loading ? '⏳ Getting your token…' : '🎫 Get My Token →'}
            </button>
            <button className="btn btn-ghost btn-full" style={{marginTop:10}} onClick={() => setStep(1)}>← Back</button>
          </div>
        )}

        {/* STEP 3: Token Issued */}
        {step === 3 && issued && (
          <>
            <div className="wa-msg" style={{marginBottom:14}}>
              💬 <strong>WhatsApp sent to {mobile}</strong><br/><br/>
              👋 Hello <strong>{name}</strong>! You've joined the queue at <strong>{vendor.name}</strong>.<br/>
              🎫 Token: <strong>T-{issued.tokenNumber}</strong> · Position: #{issued.position}<br/>
              ⏱ Est. wait: ~{issued.waitMins} min
              <div className="wa-footer">Delivered · {new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
            </div>

            <div className="token-box">
              <div className="token-label">{vendor.icon||'🏪'} {vendor.name}</div>
              <div className="token-label" style={{marginTop:2}}>Your Token</div>
              <div className="token-number">T-{issued.tokenNumber}</div>
              <div className="token-name">{name}</div>
              <div className="token-service">{vendor.category} · {vendor.city}</div>
              <div className="token-stats">
                <div className="token-stat"><div className="val">#{issued.position}</div><div className="lbl">Position</div></div>
                <div className="token-stat"><div className="val">{issued.waitMins}m</div><div className="lbl">Est. Wait</div></div>
                <div className="token-stat"><div className="val">{queueLen + 1}</div><div className="lbl">In Queue</div></div>
              </div>
            </div>

            <div style={{margin:'14px 0',padding:'14px 16px',background:'#FEF9C3',borderRadius:'var(--r2)',border:'1.5px solid #FDE047',fontSize:'.85rem',lineHeight:1.7}}>
              📝 <strong>Save to check your token later:</strong><br/>
              Mobile: <strong>{mobile}</strong> · PIN: <strong>{issued.pin}</strong>
              {usingDefault && <span style={{color:'var(--text3)'}}> (last 4 of your mobile)</span>}
            </div>

            <div className="card">
              <div className="card-title">🔔 How you'll be notified</div>
              <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:10}}>

                {/* WhatsApp — always on */}
                <div style={{display:'flex',gap:12,padding:'12px 14px',background:'#E8FAF0',borderRadius:'var(--r2)',border:'1px solid #86EFAC',alignItems:'flex-start'}}>
                  <span style={{fontSize:'1.3rem',flexShrink:0}}>💬</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:'.88rem',color:'#166534'}}>WhatsApp — Always active</div>
                    <div style={{fontSize:'.8rem',color:'#15803D',marginTop:3,lineHeight:1.5}}>
                      Alerts sent to <strong>{mobile}</strong> when 3 people ahead, 15 min before, and when it's your turn.
                      Works even if you close this app.
                    </div>
                  </div>
                </div>

                {/* Browser push — optional */}
                <div style={{display:'flex',gap:12,padding:'12px 14px',background:'#EFF6FF',borderRadius:'var(--r2)',border:'1px solid #93C5FD',alignItems:'flex-start'}}>
                  <span style={{fontSize:'1.3rem',flexShrink:0}}>📲</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:'.88rem',color:'#1E40AF'}}>
                      Phone notification — Optional but recommended
                    </div>
                    <div style={{fontSize:'.8rem',color:'#1D4ED8',marginTop:3,lineHeight:1.5,marginBottom:10}}>
                      Get a buzz on your phone screen (like an app notification) even when QNow is not open.
                    </div>
                    {typeof Notification !== 'undefined' && Notification.permission === 'granted'
                      ? <div style={{fontSize:'.8rem',fontWeight:700,color:'#166534'}}>✅ Phone notifications enabled!</div>
                      : <button
                          className="btn btn-sm"
                          style={{background:'#1D4ED8',color:'#fff'}}
                          onClick={async () => {
                            const { subscribeToPush } = await import('../services/pushService')
                            const { saveCustomerPushSubscription } = await import('../services/firestoreService')
                            const sub = await subscribeToPush()
                            if (sub && issued?.tokenId) {
                              await saveCustomerPushSubscription(issued.tokenId, sub)
                              toast('✅ Phone notifications enabled!')
                            } else {
                              toast('⚠ Tap Allow when browser asks for permission')
                            }
                          }}
                        >
                          Enable Phone Notifications
                        </button>
                    }
                  </div>
                </div>

              </div>

              <button className="btn btn-teal btn-full" style={{marginTop:16}} onClick={() => nav('/token')}>
                📊 Track My Position Live →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

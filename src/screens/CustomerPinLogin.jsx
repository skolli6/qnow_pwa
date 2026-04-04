import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findTokenByMobilePin, getVendorById } from '../services/firestoreService'
import { useApp } from '../contexts/AppContext'

export default function CustomerPinLogin() {
  const nav = useNavigate()
  const { toast, loginCustomer } = useApp()
  const [mobile, setMobile]   = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)

  const digits    = mobile.replace(/\D/g, '')
  const last4hint = digits.length >= 4 ? digits.slice(-4) : null

  async function handleCheck() {
    const mob = mobile.replace(/\s/g, '')
    if (!mob || mob.replace(/\D/g,'').length < 7) { toast('⚠ Enter your mobile number'); return }
    if (!pin || pin.length !== 4) { toast('⚠ Enter your 4-digit PIN'); return }

    setLoading(true)
    try {
      const token = await findTokenByMobilePin(mob, pin)
      if (!token) {
        toast('❌ No active token found. Check your mobile number and PIN.')
        setLoading(false)
        return
      }
      const vendor = await getVendorById(token.vendorId)
      loginCustomer({
        name: token.name, mobile: mob, pin,
        tokenId: token.id, tokenNumber: token.tokenNumber,
        vendorId: token.vendorId, vendorName: vendor?.name || ''
      })
      nav('/token')
    } catch (e) {
      console.error(e)
      toast('❌ Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <div className="nav-right">
          <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/help')}>❓ Help</button>
          <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>← Home</button>
        </div>
      </nav>
      <div className="content" style={{paddingTop:48}}>
        <div className="card">
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:'2.2rem',marginBottom:8}}>🎫</div>
            <div className="section-title" style={{fontSize:'1.15rem'}}>Check My Token</div>
            <div className="section-sub" style={{marginBottom:0}}>See your live position in the queue</div>
          </div>

          <div className="form-group">
            <label>📱 Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="+91 98765 43210"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label>🔢 4-Digit PIN</label>
            <input
              type="password"
              className="pin-input"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="····"
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
            />
            {last4hint && !pin && (
              <div className="form-hint" style={{marginTop:8,fontSize:'.82rem',color:'var(--text2)'}}>
                💡 If you didn't set a custom PIN, try{' '}
                <strong
                  style={{fontFamily:"'DM Mono',monospace",letterSpacing:2,cursor:'pointer',color:'var(--teal3)',textDecoration:'underline'}}
                  onClick={() => setPin(last4hint)}
                >
                  {last4hint}
                </strong>
                {' '}(last 4 digits of your mobile)
              </div>
            )}
          </div>

          <button
            className="btn btn-teal btn-full btn-lg"
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? '⏳ Checking…' : '📊 Check My Queue Status →'}
          </button>

          <div style={{marginTop:16,padding:'12px 14px',background:'var(--surface2)',borderRadius:'var(--r2)',fontSize:'.8rem',color:'var(--text3)',lineHeight:1.65}}>
            🔍 Haven't joined a queue yet?{' '}
            <span style={{color:'var(--teal3)',fontWeight:600,cursor:'pointer'}} onClick={() => nav('/browse')}>
              Browse services →
            </span>
            <br/>
            ❓ Need help?{' '}
            <span style={{color:'var(--teal3)',fontWeight:600,cursor:'pointer'}} onClick={() => nav('/help')}>
              View guide →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

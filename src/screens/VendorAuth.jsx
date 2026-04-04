import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerVendor, getVendorByName } from '../services/firestoreService'
import { useApp } from '../contexts/AppContext'

export default function VendorAuth() {
  const nav = useNavigate()
  const { toast, loginVendor } = useApp()
  const [tab, setTab]         = useState('login')
  const [loading, setLoading] = useState(false)

  // Login
  const [lName, setLName] = useState('')
  const [lPass, setLPass] = useState('')

  // Register
  const [rName,  setRName]  = useState('')
  const [rPhone, setRPhone] = useState('')
  const [rCat,   setRCat]   = useState('')
  const [rDesc,  setRDesc]  = useState('')
  const [rCity,  setRCity]  = useState('')
  const [rLoc,   setRLoc]   = useState('')
  const [rOpen,  setROpen]  = useState('09:00')
  const [rClose, setRClose] = useState('18:00')
  const [rSlot,  setRSlot]  = useState('15')
  const [rIcon,  setRIcon]  = useState('🏪')
  const [rLat,   setRLat]   = useState('')
  const [rLng,   setRLng]   = useState('')
  const [rPass,  setRPass]  = useState('')
  const [rPass2, setRPass2] = useState('')

  async function handleLogin() {
    if (!lName.trim() || !lPass) { toast('⚠ Please fill all fields'); return }
    setLoading(true)
    try {
      const vendor = await getVendorByName(lName.trim(), lPass)
      if (!vendor) { toast('❌ Service name or password is incorrect'); setLoading(false); return }
      if (vendor.status === 'suspended') { toast('🚫 This account has been suspended.'); setLoading(false); return }
      loginVendor(vendor)
      nav('/vendor/dashboard')
    } catch (e) { console.error(e); toast('❌ Login failed. Try again.') }
    setLoading(false)
  }

  async function handleRegister() {
    if (!rName.trim() || !rCat || !rCity.trim() || !rLoc.trim() || !rPass) {
      toast('⚠ Please fill all required fields (marked with *)'); return
    }
    if (rPass !== rPass2) { toast('❌ Passwords do not match'); return }
    if (rPass.length < 6) { toast('⚠ Password must be at least 6 characters'); return }

    setLoading(true)
    try {
      await registerVendor({
        name:           rName.trim(),
        phone:          rPhone.trim(),
        category:       rCat,
        description:    rDesc,
        city:           rCity.trim(),
        location:       rLoc.trim(),
        lat:            parseFloat(rLat) || null,
        lng:            parseFloat(rLng) || null,
        openTime:       rOpen,
        closeTime:      rClose,
        avgSlotMinutes: parseInt(rSlot) || 15,
        icon:           rIcon || '🏪',
        password:       rPass,
      })
      toast('✅ Registered! Waiting for admin approval before going live.')
      setTab('login')
      setLName(rName.trim())
    } catch (e) {
      console.error(e)
      toast('❌ Registration failed. Please try again.')
    }
    setLoading(false)
  }

  function fillMyLocation() {
    if (!navigator.geolocation) { toast('Geolocation not supported'); return }
    toast('📍 Getting your location…')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setRLat(pos.coords.latitude.toFixed(6))
        setRLng(pos.coords.longitude.toFixed(6))
        toast('✅ Coordinates filled!')
      },
      () => toast('❌ Could not get location — enter manually')
    )
  }

  const cats = ['🏥 Hospital','🦷 Clinic','🏛️ Govt Office','💈 Saloon','💅 Beauty Clinic','🏫 School','🏦 Bank','🍽️ Restaurant','🔧 Service Center','📦 Other']

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span> <span style={{opacity:.4,fontWeight:400,fontSize:'.85rem'}}>/ Vendor</span></div>
        <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>← Home</button>
      </nav>
      <div className="content pt">
        <div className="section-title">Vendor Portal</div>
        <div className="section-sub">Manage your service queue digitally</div>

        <div className="card">
          <div className="form-tabs">
            <button className={`tab-btn${tab==='login'?' active':''}`} onClick={() => setTab('login')}>Login</button>
            <button className={`tab-btn${tab==='register'?' active':''}`} onClick={() => setTab('register')}>Register New Service</button>
          </div>

          {/* ── LOGIN ── */}
          {tab === 'login' && (
            <>
              <div className="form-group">
                <label>Service / Business Name</label>
                <input value={lName} onChange={e => setLName(e.target.value)} placeholder="e.g. City Dental Clinic" autoComplete="username" onKeyDown={e => e.key==='Enter' && handleLogin()}/>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={lPass} onChange={e => setLPass(e.target.value)} autoComplete="current-password" onKeyDown={e => e.key==='Enter' && handleLogin()}/>
              </div>
              <button className="btn btn-teal btn-full btn-lg" onClick={handleLogin} disabled={loading}>
                {loading ? '⏳ Logging in…' : 'Login to Dashboard →'}
              </button>
              <div style={{marginTop:12,textAlign:'center',fontSize:'.8rem',color:'var(--text3)'}}>
                New vendor?{' '}
                <span style={{color:'var(--teal3)',cursor:'pointer',fontWeight:600}} onClick={() => setTab('register')}>
                  Register your service →
                </span>
              </div>
            </>
          )}

          {/* ── REGISTER ── */}
          {tab === 'register' && (
            <>
              <div style={{padding:'10px 14px',background:'#EFF6FF',borderRadius:'var(--r2)',fontSize:'.82rem',color:'#1E40AF',marginBottom:18,lineHeight:1.6}}>
                ℹ After registering, your service will be reviewed by admin before going live. This usually takes a few hours.
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business / Service Name *</label>
                  <input value={rName} onChange={e => setRName(e.target.value)} placeholder="e.g. City Dental Clinic"/>
                </div>
                <div className="form-group">
                  <label>Contact Phone Number *</label>
                  <input type="tel" value={rPhone} onChange={e => setRPhone(e.target.value)} placeholder="+91 98765 43210"/>
                  <div className="form-hint">Your business contact number</div>
                </div>
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select value={rCat} onChange={e => setRCat(e.target.value)}>
                  <option value="">Select your service type…</option>
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={rDesc} onChange={e => setRDesc(e.target.value)} rows={2} placeholder="Brief description of your service (optional)…"/>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input value={rCity} onChange={e => setRCity(e.target.value)} placeholder="e.g. Hyderabad"/>
                </div>
                <div className="form-group">
                  <label>Area / Address *</label>
                  <input value={rLoc} onChange={e => setRLoc(e.target.value)} placeholder="e.g. MG Road, Banjara Hills"/>
                </div>
              </div>

              <div className="form-group">
                <label>📍 GPS Coordinates <span style={{fontWeight:400,color:'var(--text3)'}}>(enables "Near Me" for customers)</span></label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <input type="number" value={rLat} onChange={e => setRLat(e.target.value)} placeholder="Latitude e.g. 17.3850" step="any" style={{flex:1,minWidth:120}}/>
                  <input type="number" value={rLng} onChange={e => setRLng(e.target.value)} placeholder="Longitude e.g. 78.4867" step="any" style={{flex:1,minWidth:120}}/>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={fillMyLocation} style={{whiteSpace:'nowrap'}}>📍 Use My Location</button>
                </div>
                <div className="form-hint">Or find coordinates from Google Maps → right-click your location</div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Opening Time *</label>
                  <input type="time" value={rOpen} onChange={e => setROpen(e.target.value)}/>
                </div>
                <div className="form-group">
                  <label>Closing Time *</label>
                  <input type="time" value={rClose} onChange={e => setRClose(e.target.value)}/>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Average minutes per customer</label>
                  <input type="number" value={rSlot} onChange={e => setRSlot(e.target.value)} min={1} max={120}/>
                  <div className="form-hint">Used to estimate wait times for customers</div>
                </div>
                <div className="form-group">
                  <label>Service Icon (emoji)</label>
                  <input value={rIcon} onChange={e => setRIcon(e.target.value)} maxLength={2} style={{fontSize:'1.5rem',textAlign:'center'}}/>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Password * (min 6 chars)</label>
                  <input type="password" value={rPass} onChange={e => setRPass(e.target.value)} autoComplete="new-password"/>
                </div>
                <div className="form-group">
                  <label>Confirm Password *</label>
                  <input type="password" value={rPass2} onChange={e => setRPass2(e.target.value)} autoComplete="new-password"/>
                </div>
              </div>

              <button className="btn btn-primary btn-full btn-lg" onClick={handleRegister} disabled={loading}>
                {loading ? '⏳ Registering…' : 'Register & Request Approval →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

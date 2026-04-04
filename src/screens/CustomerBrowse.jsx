import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscribeVendors } from '../services/firestoreService'

const ALL_CATS = ['All','🏥 Hospital','🦷 Clinic','🏛️ Govt Office','💈 Saloon','💅 Beauty Clinic','🏫 School','🏦 Bank','🍽️ Restaurant','🔧 Service Center','📦 Other']

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, dL = (lat2-lat1)*Math.PI/180, dN = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dL/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dN/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function fmtDist(km) {
  return km < 1 ? `${Math.round(km*1000)}m away` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

export default function CustomerBrowse() {
  const nav = useNavigate()
  const [vendors, setVendors]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [city, setCity]               = useState('')
  const [cat, setCat]                 = useState('All')
  const [nearMe, setNearMe]           = useState(false)
  const [userLoc, setUserLoc]         = useState(null)
  const [nearMeState, setNearMeState] = useState('off')
  const unsubRef = useRef(null)

  useEffect(() => {
    unsubRef.current = subscribeVendors(v => { setVendors(v); setLoading(false) })
    return () => unsubRef.current?.()
  }, [])

  const cities = [...new Set(vendors.map(v => v.city).filter(Boolean))].sort()

  function toggleNearMe() {
    if (nearMe) { setNearMe(false); setUserLoc(null); setNearMeState('off'); return }
    setNearMeState('loading')
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMe(true); setNearMeState('on') },
      () => setNearMeState('error'),
      { timeout: 10000 }
    )
  }

  let filtered = [...vendors]
  if (city) filtered = filtered.filter(v => v.city === city)
  if (cat !== 'All') filtered = filtered.filter(v => v.category === cat)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(v =>
      v.name?.toLowerCase().includes(q) ||
      v.city?.toLowerCase().includes(q) ||
      v.location?.toLowerCase().includes(q) ||
      v.category?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q)
    )
  }
  if (nearMe && userLoc) {
    filtered = filtered
      .map(v => ({ ...v, _dist: (v.lat && v.lng) ? haversine(userLoc.lat, userLoc.lng, v.lat, v.lng) : null }))
      .sort((a, b) => (a._dist ?? 9999) - (b._dist ?? 9999))
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
      <div className="content pt">
        <div className="section-title">Find a Service</div>
        <div className="section-sub">Tap any open service to join its queue</div>

        {/* Search + Near Me */}
        <div style={{ display:'flex', gap:8, marginBottom:10 }}>
          <div className="search-wrap" style={{ flex:1, marginBottom:0 }}>
            <span className="search-icon">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, city, category…"
              autoComplete="off"
            />
          </div>
          <button
            className={`btn btn-ghost btn-sm${nearMe ? ' nearme-active' : ''}`}
            style={{ flexShrink:0, padding:'0 14px' }}
            onClick={toggleNearMe}
          >
            📍 Near Me
          </button>
        </div>

        {/* City filter */}
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
          <span style={{ fontSize:'.8rem', fontWeight:600, color:'var(--text3)', whiteSpace:'nowrap' }}>🏙 City:</span>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{ flex:1, padding:'8px 12px', fontSize:'.88rem', border:'1.5px solid var(--border)', borderRadius:'var(--r2)', fontFamily:'inherit', background:'var(--surface)', color:'var(--text)', outline:'none' }}
          >
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {city && <button className="btn btn-ghost btn-sm" onClick={() => setCity('')}>✕</button>}
        </div>

        {/* Near me bar */}
        {nearMeState !== 'off' && (
          <div className={`nearme-bar${nearMeState === 'loading' ? ' loading' : nearMeState === 'error' ? ' error' : ''}`} style={{ marginBottom:12 }}>
            {nearMeState === 'loading' && '⏳ Getting your location…'}
            {nearMeState === 'error'   && '❌ Location access denied. Enable in browser settings.'}
            {nearMeState === 'on'      && (
              <>📍 Showing services sorted by distance from you &nbsp;
                <button className="btn btn-ghost btn-sm" style={{ padding:'3px 8px', fontSize:'.75rem' }} onClick={toggleNearMe}>✕ Off</button>
              </>
            )}
          </div>
        )}

        {/* Category chips */}
        <div className="cat-chips">
          {ALL_CATS.map(c => (
            <div key={c} className={`chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}</div>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <div className="results-count">
            {filtered.length
              ? `${filtered.length} service${filtered.length > 1 ? 's' : ''} found${nearMe ? ' · sorted by distance' : ''}`
              : ''}
          </div>
        )}

        {/* Loading */}
        {loading && <div className="spinner" />}

        {/* Empty state */}
        {!loading && !filtered.length && (
          <div className="empty-state">
            <div className="emoji">{search || city || cat !== 'All' ? '🔍' : '🏪'}</div>
            <p>
              {search || city || cat !== 'All'
                ? 'No services match your filters.\nTry a different search or category.'
                : 'No services available yet.\nAsk a vendor to register on QNow.'}
            </p>
          </div>
        )}

        {/* Service cards */}
        {!loading && filtered.map(v => {
          const slot       = v.avgSlotMinutes || 15
          const queueCount = v.activeQueueCount || 0
          const waitMins   = queueCount * slot
          const isOpen     = v.isOpen && v.status === 'approved'

          return (
            <div
              key={v.id}
              className={`service-card${!isOpen ? ' closed' : ''}`}
              onClick={() => isOpen && nav(`/enroll/${v.id}`)}
            >
              <div className="service-icon">{v.icon || '🏪'}</div>
              <div className="service-info">
                <div className="service-name">
                  {v.name}
                  {v._dist != null && (
                    <span className="dist-badge" style={{ marginLeft:6 }}>📍 {fmtDist(v._dist)}</span>
                  )}
                </div>
                <div className="service-desc">{v.description || v.category || 'Professional service'}</div>
                <div className="service-meta">
                  <span>
                    {isOpen
                      ? <><span className="dot dot-green"></span> Open</>
                      : <><span className="dot dot-red"></span> Closed</>}
                  </span>
                  {isOpen && (
                    <>
                      <span style={{ color: queueCount > 5 ? 'var(--red)' : queueCount > 2 ? 'var(--amber)' : 'var(--green)', fontWeight:600 }}>
                        👥 {queueCount} waiting
                      </span>
                      <span>⏱ ~{waitMins > 0 ? `${waitMins} min wait` : 'No wait!'}</span>
                    </>
                  )}
                  <span>🏙 {v.city}</span>
                  <span>📍 {v.location}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop:8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={e => { e.stopPropagation(); nav(`/enroll/${v.id}`) }}
                    >
                      Join Queue →
                    </button>
                  </div>
                )}
              </div>
              {!isOpen && <span className="badge badge-red" style={{ flexShrink:0 }}>Closed</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

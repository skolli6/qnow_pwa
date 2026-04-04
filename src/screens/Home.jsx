import { useNavigate } from 'react-router-dom'

export default function Home() {
  const nav = useNavigate()

  const features = [
    { icon: '💬', label: 'WhatsApp alerts',  desc: 'Get notified on WhatsApp when your turn is near', action: () => nav('/browse') },
    { icon: '🎫', label: 'Digital tokens',   desc: 'Join the queue from your phone — no app download needed', action: () => nav('/browse') },
    { icon: '📍', label: 'Find nearby',      desc: 'Locate services close to you with Near Me', action: () => nav('/browse') },
    { icon: '⏰', label: 'Extend slot',      desc: 'Need more time? Push your slot back from the tracking screen', action: () => nav('/check') },
    { icon: '🚶', label: 'Walk-in support',  desc: 'Vendors can add walk-in customers from their dashboard', action: () => nav('/vendor') },
  ]

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <div className="nav-right">
          <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/check')}>🎫 My Token</button>
          <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/help')}>❓ Help</button>
          <button
            className="btn btn-ghost-white btn-sm"
            style={{opacity:.45,fontSize:'.75rem',padding:'5px 8px'}}
            onClick={() => nav('/admin')}
            title="Admin"
          >⚙</button>
        </div>
      </nav>

      <div className="hero">
        <h1>Queue <em>smarter,</em><br />wait less</h1>
        <p>
          Join queues at clinics, salons, banks &amp; more — right from your phone.
          Get a <strong style={{color:'#A7F3D0'}}>WhatsApp alert</strong> before your turn.
          No app download needed.
        </p>

        <div className="hero-cards">
          <div className="hero-card" onClick={() => nav('/browse')}>
            <div className="icon">👤</div>
            <h3>I'm a Customer</h3>
            <p>Find a service, join the virtual queue &amp; wait anywhere. We'll WhatsApp you.</p>
          </div>
          <div className="hero-card" onClick={() => nav('/vendor')}>
            <div className="icon">🏪</div>
            <h3>I'm a Vendor</h3>
            <p>Manage your customer queue digitally. No more crowded waiting rooms.</p>
          </div>
        </div>

        {/* Feature pills — each one is clickable and leads somewhere */}
        <div style={{
          display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center',
          marginTop:28, position:'relative', maxWidth:520
        }}>
          {features.map(f => (
            <button
              key={f.label}
              onClick={f.action}
              title={f.desc}
              style={{
                padding:'6px 14px', borderRadius:100,
                background:'rgba(255,255,255,.12)',
                border:'1px solid rgba(255,255,255,.2)',
                color:'rgba(255,255,255,.9)',
                fontSize:'.78rem', fontWeight:600,
                cursor:'pointer', fontFamily:'inherit',
                transition:'all .18s',
              }}
              onMouseEnter={e => { e.target.style.background='rgba(255,255,255,.22)'; e.target.style.borderColor='var(--amber2)' }}
              onMouseLeave={e => { e.target.style.background='rgba(255,255,255,.12)'; e.target.style.borderColor='rgba(255,255,255,.2)' }}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => nav('/help')}
          style={{
            marginTop:20, background:'none', border:'none', cursor:'pointer',
            color:'rgba(255,255,255,.5)', fontSize:'.82rem', fontFamily:'inherit',
            textDecoration:'underline', position:'relative',
          }}
        >
          📖 How does QNow work? Read the guide →
        </button>
      </div>

      {/* Stats bar */}
      <div style={{
        background:'var(--surface)', padding:'20px 24px',
        display:'flex', justifyContent:'center', gap:40, flexWrap:'wrap'
      }}>
        {[
          { val: '100%', lbl: 'Free for customers' },
          { val: '₹0',   lbl: 'No app download' },
          { val: '💬',   lbl: 'WhatsApp alerts' },
        ].map(s => (
          <div key={s.lbl} style={{textAlign:'center'}}>
            <div style={{fontWeight:800,fontSize:'1.4rem',color:'var(--teal)',fontFamily:"'DM Mono',monospace"}}>{s.val}</div>
            <div style={{fontSize:'.75rem',color:'var(--text3)',marginTop:2,fontWeight:600,letterSpacing:'.3px'}}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

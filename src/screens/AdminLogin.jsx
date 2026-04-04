import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'

const ADMIN_USER = import.meta.env.VITE_ADMIN_USER || 'admin'
const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'QNow@2024!'

export default function AdminLogin() {
  const nav = useNavigate()
  const { toast, loginAdmin } = useApp()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  function handleLogin() {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      loginAdmin()
      nav('/admin/dashboard')
    } else {
      toast('❌ Invalid admin credentials')
    }
  }

  return (
    <div className="screen">
      <nav className="admin-nav">
        <div className="logo">Q<span>Now</span> <span style={{opacity:.4,fontWeight:400,fontSize:'.8rem'}}>/ Admin</span></div>
        <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>← Home</button>
      </nav>
      <div className="content" style={{paddingTop:64}}>
        <div className="card" style={{borderTop:'4px solid var(--admin)'}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:'2.5rem'}}>🛡️</div>
            <div className="section-title" style={{fontSize:'1.2rem',marginTop:8}}>Super Admin Login</div>
            <div className="section-sub" style={{marginBottom:0}}>Restricted access — authorised personnel only</div>
          </div>
          <div className="form-group">
            <label>Admin Username</label>
            <input value={user} onChange={e => setUser(e.target.value)} placeholder="Username" autoComplete="off" onKeyDown={e => e.key==='Enter' && handleLogin()}/>
          </div>
          <div className="form-group">
            <label>Admin Password</label>
            <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Password" onKeyDown={e => e.key==='Enter' && handleLogin()}/>
          </div>
          <button className="btn btn-full btn-lg btn-admin" onClick={handleLogin}>
            Login as Super Admin →
          </button>
          <div style={{marginTop:14,padding:'10px 14px',background:'#F0F9FF',borderRadius:'var(--r2)',fontSize:'.78rem',color:'#1E40AF',lineHeight:1.6}}>
            🔒 Set credentials in <code>VITE_ADMIN_USER</code> / <code>VITE_ADMIN_PASS</code> environment variables before deploying.
          </div>
        </div>
      </div>
    </div>
  )
}

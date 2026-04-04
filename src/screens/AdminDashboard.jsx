import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  subscribeAllVendors, subscribeActivityLog,
  approveVendor, suspendVendor, deleteVendor,
  updateVendor, logActivity
} from '../services/firestoreService'
import { useApp } from '../contexts/AppContext'

function fmtTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}
function fmtDate(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

const CATS = ['🏥 Hospital','🦷 Clinic','🏛️ Govt Office','💈 Saloon','💅 Beauty Clinic','🏫 School','🏦 Bank','🍽️ Restaurant','🔧 Service Center','📦 Other']

export default function AdminDashboard() {
  const nav = useNavigate()
  const { adminLogged, logoutAdmin, toast } = useApp()

  const [vendors, setVendors] = useState([])
  const [logs,    setLogs]    = useState([])
  const [tab,     setTab]     = useState('pending')
  const [cityFilter,   setCityFilter]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editV,   setEditV]   = useState(null)
  const [ef,      setEf]      = useState({})
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(null)

  const unsubV = useRef(null)
  const unsubL = useRef(null)

  useEffect(() => {
    if (!adminLogged) { nav('/admin'); return }
    unsubV.current = subscribeAllVendors(setVendors)
    unsubL.current = subscribeActivityLog(setLogs, 80)
    return () => { unsubV.current?.(); unsubL.current?.() }
  }, [adminLogged])

  if (!adminLogged) return null

  const pending  = vendors.filter(v => !v.status || v.status === 'pending')
  const approved = vendors.filter(v => v.status === 'approved')
  const paid     = vendors.filter(v => v.plan === 'paid')

  const cities = [...new Set(vendors.map(v => v.city).filter(Boolean))].sort()
  let list = [...vendors]
  if (cityFilter)   list = list.filter(v => v.city === cityFilter)
  if (statusFilter) list = list.filter(v => (v.status || 'pending') === statusFilter)

  function openEdit(v) {
    setEditV(v)
    setEf({ name:v.name||'', phone:v.phone||'', category:v.category||'', description:v.description||'',
      city:v.city||'', location:v.location||'', openTime:v.openTime||'09:00', closeTime:v.closeTime||'18:00',
      avgSlotMinutes:v.avgSlotMinutes||15, icon:v.icon||'🏪', plan:v.plan||'free',
      status:v.status||'pending', newPassword:'' })
  }

  async function handleSave() {
    if (!ef.name) { toast('⚠ Name required'); return }
    setSaving(true)
    const updates = { name:ef.name, phone:ef.phone, category:ef.category, description:ef.description,
      city:ef.city, location:ef.location, openTime:ef.openTime, closeTime:ef.closeTime,
      avgSlotMinutes:parseInt(ef.avgSlotMinutes)||15, icon:ef.icon, plan:ef.plan, status:ef.status }
    if (ef.status !== 'approved') updates.isOpen = false
    if (ef.newPassword?.trim()) updates.password = ef.newPassword.trim()
    await updateVendor(editV.id, updates)
    await logActivity(`Admin edited vendor: ${ef.name}${ef.newPassword ? ' (password reset)' : ''}`, true)
    toast(`💾 Changes saved for ${ef.name}`)
    setEditV(null); setSaving(false)
  }

  function doConfirm(title, body, btnLabel, btnClass, onOk) {
    setConfirm({ title, body, btnLabel, btnClass, onOk })
  }

  function VRow({ v }) {
    const tLeft = Math.max(0, 50-(v.freeTokensUsed||0))
    const stBadge = v.status==='approved'
      ? <span className="badge badge-green">Approved</span>
      : v.status==='suspended'
        ? <span className="badge badge-red">Suspended</span>
        : <span className="badge badge-amber">Pending</span>
    const planBadge = v.plan==='paid'
      ? <span className="plan-badge plan-paid">₹500/mo</span>
      : <span className="plan-badge plan-free">Free · {tLeft} left</span>

    return (
      <div className={`vendor-row ${v.status||'pending'}`}>
        <div style={{fontSize:'1.5rem',flexShrink:0}}>{v.icon||'🏪'}</div>
        <div className="vendor-row-info">
          <div className="vendor-row-name">{v.name} {stBadge} {planBadge}</div>
          <div className="vendor-row-meta">
            {v.category} · <strong>{v.city}</strong>, {v.location}
            {v.phone && <> · 📱 {v.phone}</>}<br/>
            Registered: {fmtDate(v.createdAt)} · {v.openTime}–{v.closeTime} · {v.avgSlotMinutes||15} min/person<br/>
            Served: {v.served||0} · Walk-ins: {v.walkins||0}
          </div>
        </div>
        <div className="vendor-row-actions">
          {(v.status==='pending'||!v.status) && (
            <button className="btn btn-green btn-sm" onClick={async()=>{await approveVendor(v.id,v.name);toast(`✅ ${v.name} approved!`)}}>✅ Approve</button>
          )}
          {v.status==='suspended' && (
            <button className="btn btn-green btn-sm" onClick={async()=>{await approveVendor(v.id,v.name);toast(`✅ ${v.name} reinstated`)}}>✅ Reinstate</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(v)}>✏️ Edit</button>
          {v.status==='approved' && (
            <button className="btn btn-danger btn-sm" onClick={() => doConfirm(`Suspend "${v.name}"?`,'Vendor will not be able to accept queues.','Suspend','btn-danger',async()=>{await suspendVendor(v.id,v.name);toast(`🚫 ${v.name} suspended`)})}>🚫 Suspend</button>
          )}
          <button className="btn btn-danger btn-sm" onClick={() => doConfirm(`Delete "${v.name}"?`,'This removes all vendor data permanently.','Delete','btn-danger',async()=>{await deleteVendor(v.id);await logActivity(`Vendor deleted: ${v.name}`,true);toast(`🗑️ Deleted`)})}>🗑️</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <nav className="admin-nav">
        <div className="logo">Q<span>Now</span></div>
        <div className="nav-right">
          <span className="admin-badge">⚙ SUPER ADMIN</span>
          <button className="btn btn-ghost-white btn-sm" onClick={() => { logoutAdmin(); nav('/') }}>Logout</button>
        </div>
      </nav>

      <div className="content wide pt">
        <div className="section-title">Admin Dashboard</div>
        <div className="section-sub">Platform-wide management &amp; oversight</div>

        {/* Stats */}
        <div className="admin-stats">
          <div className="admin-stat"><div className="big">{vendors.length}</div><div className="lbl">Total Vendors</div></div>
          <div className="admin-stat"><div className="big" style={{color:'var(--amber)'}}>{pending.length}</div><div className="lbl">Pending</div></div>
          <div className="admin-stat"><div className="big" style={{color:'var(--green)'}}>{approved.length}</div><div className="lbl">Approved</div></div>
          <div className="admin-stat"><div className="big" style={{color:'var(--amber2)'}}>{paid.length}</div><div className="lbl">Paid Plans</div></div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {[
            { key:'pending',  label:`⏳ Pending${pending.length?` (${pending.length})`:''}`},
            { key:'vendors',  label:'🏪 All Vendors' },
            { key:'activity', label:'📋 Activity Log' },
            { key:'settings', label:'⚙ Settings' },
          ].map(t => (
            <button key={t.key} className={`admin-tab${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* Pending */}
        {tab==='pending' && (
          pending.length===0
            ? <div className="empty-state"><div className="emoji">✅</div><p>All vendors reviewed — no pending approvals!</p></div>
            : pending.map(v => <VRow key={v.id} v={v}/>)
        )}

        {/* All vendors */}
        {tab==='vendors' && (
          <>
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
              <select value={cityFilter} onChange={e=>setCityFilter(e.target.value)} style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:'var(--r2)',fontFamily:'inherit',fontSize:'.85rem',background:'var(--surface)'}}>
                <option value="">All Cities</option>
                {cities.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:'var(--r2)',fontFamily:'inherit',fontSize:'.85rem',background:'var(--surface)'}}>
                <option value="">All Status</option>
                <option value="approved">✅ Approved</option>
                <option value="pending">⏳ Pending</option>
                <option value="suspended">🚫 Suspended</option>
              </select>
              <span style={{fontSize:'.82rem',color:'var(--text3)'}}>{list.length} vendor{list.length!==1?'s':''}</span>
            </div>
            {list.length===0
              ? <div className="empty-state"><div className="emoji">🔍</div><p>No vendors match filters</p></div>
              : list.map(v => <VRow key={v.id} v={v}/>)
            }
          </>
        )}

        {/* Activity */}
        {tab==='activity' && (
          logs.length===0
            ? <div className="empty-state"><div className="emoji">📋</div><p>No activity yet</p></div>
            : logs.map(l => (
                <div key={l.id} style={{display:'flex',gap:12,padding:'10px 14px',background:'var(--surface2)',borderRadius:'var(--r2)',marginBottom:6,fontSize:'.83rem',borderLeft:`3px solid ${l.adminAction?'var(--admin)':'var(--border)'}`}}>
                  <span style={{color:'var(--text3)',whiteSpace:'nowrap',fontFamily:"'DM Mono',monospace",flexShrink:0}}>{fmtTime(l.time)}</span>
                  <span style={{flex:1}}>{l.msg}</span>
                  {l.adminAction && <span className="badge badge-purple" style={{flexShrink:0}}>Admin</span>}
                </div>
              ))
        )}

        {/* Settings */}
        {tab==='settings' && (
          <div className="card">
            <div className="card-title">⚙ Platform Settings</div>
            <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:12}}>
              {[
                {t:'Admin Credentials',d:'Set VITE_ADMIN_USER and VITE_ADMIN_PASS in your .env file (or Vercel environment variables). Never commit these to Git.'},
                {t:'Free Plan Limits',d:'First 50 tokens OR 30 days — whichever comes first. After that: ₹500/month for unlimited tokens.'},
                {t:'Platform Stats',d:`Total vendors: ${vendors.length} · Approved: ${approved.length} · Paid plans: ${paid.length} · Est. monthly revenue: ₹${paid.length*500}`},
              ].map(s => (
                <div key={s.t} style={{padding:14,background:'var(--surface2)',borderRadius:'var(--r2)'}}>
                  <div style={{fontWeight:700,fontSize:'.9rem',marginBottom:4}}>{s.t}</div>
                  <div style={{fontSize:'.82rem',color:'var(--text3)'}}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editV && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:560,borderTop:'4px solid var(--admin)'}}>
            <h3>✏️ Edit: {editV.name}</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label>Business Name *</label><input value={ef.name} onChange={e=>setEf({...ef,name:e.target.value})}/></div>
              <div className="form-group"><label>Contact Phone</label><input type="tel" value={ef.phone} onChange={e=>setEf({...ef,phone:e.target.value})}/></div>
            </div>
            <div className="form-group"><label>Category</label>
              <select value={ef.category} onChange={e=>setEf({...ef,category:e.target.value})}>
                {CATS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Description</label><textarea value={ef.description} onChange={e=>setEf({...ef,description:e.target.value})} rows={2}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label>City</label><input value={ef.city} onChange={e=>setEf({...ef,city:e.target.value})}/></div>
              <div className="form-group"><label>Area/Address</label><input value={ef.location} onChange={e=>setEf({...ef,location:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label>Open Time</label><input type="time" value={ef.openTime} onChange={e=>setEf({...ef,openTime:e.target.value})}/></div>
              <div className="form-group"><label>Close Time</label><input type="time" value={ef.closeTime} onChange={e=>setEf({...ef,closeTime:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label>Min/customer</label><input type="number" value={ef.avgSlotMinutes} onChange={e=>setEf({...ef,avgSlotMinutes:e.target.value})}/></div>
              <div className="form-group"><label>Icon</label><input value={ef.icon} maxLength={2} onChange={e=>setEf({...ef,icon:e.target.value})}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="form-group"><label>Reset Password</label><input type="text" value={ef.newPassword} onChange={e=>setEf({...ef,newPassword:e.target.value})} placeholder="Leave blank to keep"/></div>
              <div className="form-group"><label>Plan</label>
                <select value={ef.plan} onChange={e=>setEf({...ef,plan:e.target.value})}>
                  <option value="free">Free (50 tokens/30 days)</option>
                  <option value="paid">Paid ₹500/month</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label>Status</label>
              <select value={ef.status} onChange={e=>setEf({...ef,status:e.target.value})}>
                <option value="approved">✅ Approved (Active)</option>
                <option value="pending">⏳ Pending Approval</option>
                <option value="suspended">🚫 Suspended</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setEditV(null)}>Cancel</button>
              <button className="btn btn-admin" onClick={handleSave} disabled={saving}>{saving?'Saving…':'💾 Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirm && (
        <div className="modal-overlay open">
          <div className="modal">
            <h3>{confirm.title}</h3>
            <p>{confirm.body}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setConfirm(null)}>Cancel</button>
              <button className={`btn ${confirm.btnClass}`} onClick={async()=>{await confirm.onOk();setConfirm(null)}}>{confirm.btnLabel}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

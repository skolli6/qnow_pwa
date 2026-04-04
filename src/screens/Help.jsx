import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Section({ emoji, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background:'var(--surface)', borderRadius:'var(--r)',
      border:'1px solid var(--border)', marginBottom:12, overflow:'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', padding:'16px 18px', display:'flex', alignItems:'center',
        justifyContent:'space-between', background:'none', border:'none',
        cursor:'pointer', fontFamily:'inherit',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:'1.3rem'}}>{emoji}</span>
          <span style={{fontWeight:700, fontSize:'.97rem', color:'var(--teal)', textAlign:'left'}}>{title}</span>
        </div>
        <span style={{fontSize:'1rem', color:'var(--text3)', flexShrink:0, marginLeft:8}}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{padding:'0 18px 18px', borderTop:'1px solid var(--border)', paddingTop:16}}>
          {children}
        </div>
      )}
    </div>
  )
}

function Step({ n, title, desc }) {
  return (
    <div style={{display:'flex', gap:14, marginBottom:16}}>
      <div style={{
        width:32, height:32, borderRadius:'50%', flexShrink:0,
        background:'var(--teal)', color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontWeight:800, fontSize:'.9rem', marginTop:2,
      }}>{n}</div>
      <div>
        <div style={{fontWeight:700, fontSize:'.92rem', marginBottom:3}}>{title}</div>
        <div style={{fontSize:'.85rem', color:'var(--text2)', lineHeight:1.65}}>{desc}</div>
      </div>
    </div>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{borderBottom:'1px solid var(--border)', paddingBottom:12, marginBottom:12}}>
      <button onClick={() => setOpen(o => !o)} style={{
        background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
        fontWeight:600, fontSize:'.87rem', color:'var(--text)',
        textAlign:'left', width:'100%', display:'flex',
        justifyContent:'space-between', alignItems:'flex-start', gap:8,
      }}>
        <span>❓ {q}</span>
        <span style={{color:'var(--text3)', flexShrink:0}}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{fontSize:'.84rem', color:'var(--text2)', lineHeight:1.7, marginTop:8, paddingLeft:4}}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function Help() {
  const nav = useNavigate()
  const [activeTab, setActiveTab] = useState('customer')

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>← Home</button>
      </nav>

      <div className="content pt">

        {/* Header */}
        <div style={{textAlign:'center', marginBottom:28}}>
          <div style={{fontSize:'3rem', marginBottom:10}}>📖</div>
          <div className="section-title">How to Use QNow</div>
          <p style={{color:'var(--text2)', fontSize:'.92rem', lineHeight:1.7, maxWidth:480, margin:'8px auto 0'}}>
            QNow is a virtual queue system. Instead of standing in line, join from your phone
            and get a <strong>WhatsApp message</strong> when your turn is near.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{
          display:'flex', background:'var(--surface2)', borderRadius:'var(--r)',
          padding:5, marginBottom:20, gap:4,
        }}>
          {[
            { key:'customer', label:"👤 I'm a Customer", sub:'Join & track queues' },
            { key:'vendor',   label:"🏪 I'm a Vendor",   sub:'Manage my service' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex:1, padding:'12px 8px', borderRadius:10, border:'none',
              cursor:'pointer', fontFamily:'inherit', transition:'all .18s',
              background: activeTab === t.key ? 'var(--surface)' : 'transparent',
              boxShadow: activeTab === t.key ? 'var(--shadow)' : 'none',
              color: activeTab === t.key ? 'var(--teal)' : 'var(--text3)',
            }}>
              <div style={{fontWeight:700, fontSize:'.88rem'}}>{t.label}</div>
              <div style={{fontSize:'.72rem', marginTop:2, opacity:.75}}>{t.sub}</div>
            </button>
          ))}
        </div>

        {/* ─── CUSTOMER GUIDE ─── */}
        {activeTab === 'customer' && (
          <>
            <Section emoji="🌟" title="What is QNow?" defaultOpen>
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75}}>
                QNow lets you join a <strong>virtual queue</strong> at a clinic, salon, bank,
                government office, or any registered service — right from your phone.
                No need to stand in a physical line. You get a token number and receive
                <strong> WhatsApp alerts</strong> when your turn is approaching.
                You can be anywhere while you wait.
              </p>
              <div style={{marginTop:14, display:'flex', flexWrap:'wrap', gap:8}}>
                {['🏥 Clinics','💈 Salons','🏦 Banks','🏛️ Govt Offices','🏫 Schools','🔧 Service Centers'].map(s => (
                  <span key={s} style={{padding:'4px 12px', background:'var(--surface2)', borderRadius:100, fontSize:'.78rem', fontWeight:600, color:'var(--teal)'}}>{s}</span>
                ))}
              </div>
            </Section>

            <Section emoji="📋" title="Step-by-step: How to join a queue">
              <Step n={1} title="Open QNow and tap 'I'm a Customer'" desc="On the home page, tap the customer card. You'll see a list of all available services in your area." />
              <Step n={2} title="Find a service" desc="Search by name, filter by city, select a category, or tap 'Near Me' to find the closest open service." />
              <Step n={3} title="Check the wait time before joining" desc="Each service card shows how many people are in the queue and the estimated wait time. This helps you decide if you want to join now or come back later." />
              <Step n={4} title="Tap 'Join Queue →'" desc="Tap the green button on any open service to start joining." />
              <Step n={5} title="Enter your name and mobile number" desc="Type your full name and your WhatsApp-enabled mobile number. This is where your queue alerts will be sent." />
              <Step n={6} title="Set a 4-digit PIN" desc="Choose a PIN to check your token status later. We recommend using the last 4 digits of your mobile number — easiest to remember. You can also set your own custom PIN." />
              <Step n={7} title="Get your token!" desc="You'll receive a token number like T-007. This is your spot in the queue. A WhatsApp confirmation is sent instantly." />
              <Step n={8} title="Go wait anywhere" desc="You don't need to stand in line. Go home, sit in your car, have tea — QNow tracks your position and WhatsApps you before your turn." />
            </Section>

            <Section emoji="⏳" title="What do the queue numbers mean?">
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75, marginBottom:10}}>
                When you join, you'll see three numbers:
              </p>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {[
                  {label:'In Queue', desc:'How many people are currently waiting ahead of you when you join.'},
                  {label:'Est. Wait', desc:'Approximate total time before your turn. Calculated as: number of people ahead × average minutes per customer.'},
                  {label:'Per Person', desc:'How many minutes the vendor typically takes per customer. Set by the vendor when registering.'},
                ].map(item => (
                  <div key={item.label} style={{display:'flex', gap:12, padding:'10px 14px', background:'var(--surface2)', borderRadius:'var(--r2)'}}>
                    <div style={{fontWeight:700, color:'var(--teal)', minWidth:80, fontSize:'.85rem'}}>{item.label}</div>
                    <div style={{fontSize:'.84rem', color:'var(--text2)', lineHeight:1.5}}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section emoji="🔢" title="How to check your token status later">
              <Step n={1} title="Go to 'My Token'" desc="On the QNow home page, tap the '🎫 My Token' button at the top." />
              <Step n={2} title="Enter your mobile number" desc="The same number you used when joining the queue." />
              <Step n={3} title="Enter your PIN" desc="If you used the default PIN, it's the last 4 digits of your mobile. Example: if your number ends in ...3210, your PIN is 3210. Or enter the custom PIN you set." />
              <Step n={4} title="See your live position" desc="You'll see your current position, estimated wait time, and a progress bar showing how close you are." />
            </Section>

            <Section emoji="💬" title="When will I get WhatsApp messages?">
              <div style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.85}}>
                {[
                  { icon:'✅', title:'Right after joining', desc:'A confirmation with your token number, position, and estimated wait time.' },
                  { icon:'⚡', title:'When 3 people are ahead of you', desc:'A heads-up that your turn is coming soon. Time to start making your way.' },
                  { icon:'⏰', title:'15 minutes before your turn', desc:"An alert to leave wherever you are and head to the service location." },
                  { icon:'🔔', title:"When it's your turn", desc:'Go to the counter right now — your name is being called!' },
                ].map(n => (
                  <div key={n.title} style={{display:'flex', gap:10, marginBottom:12}}>
                    <span style={{fontSize:'1.1rem', flexShrink:0}}>{n.icon}</span>
                    <div><strong>{n.title}:</strong> {n.desc}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section emoji="⏰" title="What if I can't make it in time?">
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75, marginBottom:12}}>
                On the token tracking screen (after joining), tap the{' '}
                <strong>"Can't make it in time? Extend my slot"</strong> button.
                This moves your position 5 places back in the queue, giving you extra time to arrive.
                Your WhatsApp notifications will continue from your new position.
              </p>
              <div style={{padding:'10px 14px', background:'#FEF9C3', borderRadius:'var(--r2)', fontSize:'.82rem', color:'#92400E', lineHeight:1.6}}>
                ⚠ Use this before the vendor calls your token. Once skipped by the vendor, you may need to rejoin the queue.
              </div>
            </Section>

            <Section emoji="❓" title="Frequently Asked Questions">
              <FAQ q="Do I need to create an account or log in?" a="No account needed! Just enter your name and mobile number when joining. Your mobile + PIN are all you need to check your status anytime." />
              <FAQ q="I forgot my PIN. What do I do?" a="If you used the default (recommended) option, your PIN is the last 4 digits of your mobile number. For example, if your mobile is 9876543210, your PIN is 3210. If you set a custom PIN and forgot it, you'll need to join the queue again with a new entry." />
              <FAQ q="Can I join the queue from home before going?" a="Yes! That's exactly what QNow is for. Join from anywhere, wait comfortably, and head to the service only when your turn is near." />
              <FAQ q="What if the service shows as Closed?" a="The vendor has either closed their queue for the day or is not accepting new customers right now. Check back later or look for another nearby service." />
              <FAQ q="I didn't receive a WhatsApp message." a="Make sure you entered your correct WhatsApp number including country code (e.g. +91 for India). Also ensure you haven't blocked messages from new contacts. WhatsApp messages come from a verified QNow business number." />
              <FAQ q="Can I join multiple queues at the same time?" a="Yes. Each service gives you a separate token. You can track multiple tokens using different mobile numbers or by checking each one separately." />
              <FAQ q="Is QNow free for customers?" a="Yes, 100% free. There is no charge for customers at any time." />
              <FAQ q="Do I need to download an app?" a="No download needed. QNow works in any web browser on your phone — Chrome, Safari, Firefox, etc. Just open the website link." />
            </Section>
          </>
        )}

        {/* ─── VENDOR GUIDE ─── */}
        {activeTab === 'vendor' && (
          <>
            <Section emoji="🌟" title="What can I do as a vendor?" defaultOpen>
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75}}>
                As a vendor — clinic, salon, bank, school, or any service — QNow lets you manage
                your customer queue digitally. Customers join from their phones instead of crowding
                at your entrance. You control who's called next, add walk-in customers, and the system
                sends WhatsApp notifications automatically. No more shouting names or managing slips of paper.
              </p>
            </Section>

            <Section emoji="📋" title="Step-by-step: How to register your service">
              <Step n={1} title="Go to Vendor Portal" desc="On the QNow home page, tap 'I'm a Vendor', then tap 'Register New Service'." />
              <Step n={2} title="Fill in your details" desc="Enter your business name, contact phone number, category (clinic, salon, etc.), city, address, opening and closing times, and average time you spend per customer." />
              <Step n={3} title="Set a password" desc="Create a password (minimum 6 characters) to protect your vendor account. You'll use this to log in." />
              <Step n={4} title="Submit for approval" desc="After registering, your application goes to the QNow admin for review. You'll be approved within a few hours on working days. You cannot manage queues until approved." />
              <Step n={5} title="Log in and open your queue" desc="Once approved, log in with your service name and password. Tap the 'Open' button to start accepting customers." />
            </Section>

            <Section emoji="🖥️" title="How to manage your queue day-to-day">
              <Step n={1} title="Open your service" desc="Log in and tap 'Open' in the top bar. Customers can now see your service and join the queue." />
              <Step n={2} title="Call the next customer" desc="Tap '▶ Call Next' to call the first waiting customer. They instantly receive a WhatsApp message saying it's their turn." />
              <Step n={3} title="Mark complete" desc="After serving the customer, tap '✓ Mark Complete'. The queue moves forward and the next customer is automatically notified when approaching their turn." />
              <Step n={4} title="Add walk-in customers" desc="For customers who walk in directly, tap '🚶 Walk-in', enter their name and optional mobile number. They get the next available token and join the queue just like online customers." />
              <Step n={5} title="Remove no-shows" desc="If a customer doesn't arrive after being called, tap the ✕ button next to their name to remove them from the queue." />
              <Step n={6} title="Close when done" desc="At the end of the day, tap 'Close' to stop new customers from joining." />
            </Section>

            <Section emoji="💬" title="How are customers notified?">
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75}}>
                QNow automatically sends <strong>WhatsApp messages</strong> to customers at the right moments.
                You don't need to do anything manually. The system handles it.
              </p>
              <div style={{marginTop:12, display:'flex', flexDirection:'column', gap:8}}>
                {[
                  { when:'When they join',          what:'Confirmation with token number and estimated wait time' },
                  { when:'3 people ahead',           what:'A heads-up to start making their way to you' },
                  { when:'15 minutes before turn',   what:'Alert to leave and come to your location' },
                  { when:"When it's their turn",     what:'Immediate notification when you tap Call Next' },
                ].map(n => (
                  <div key={n.when} style={{display:'flex', gap:10, padding:'8px 12px', background:'var(--surface2)', borderRadius:'var(--r2)', fontSize:'.83rem'}}>
                    <div style={{fontWeight:700, color:'var(--teal)', minWidth:120, flexShrink:0}}>{n.when}</div>
                    <div style={{color:'var(--text2)'}}>{n.what}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section emoji="💰" title="Pricing — free trial then ₹500/month">
              <div style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75}}>
                <div style={{display:'flex', gap:12, padding:'14px', background:'#D1FAE5', borderRadius:'var(--r2)', marginBottom:12, alignItems:'flex-start'}}>
                  <span style={{fontSize:'1.4rem', flexShrink:0}}>🎁</span>
                  <div>
                    <strong>Free Trial:</strong> Your first <strong>50 customer tokens</strong> are completely free.
                    Also free for the first <strong>30 days</strong>, whichever limit is reached first.
                    No credit card required, no hidden charges.
                  </div>
                </div>
                <div style={{display:'flex', gap:12, padding:'14px', background:'#FFF7ED', borderRadius:'var(--r2)', alignItems:'flex-start'}}>
                  <span style={{fontSize:'1.4rem', flexShrink:0}}>⭐</span>
                  <div>
                    <strong>Paid Plan — ₹500/month:</strong> Unlimited tokens, full features.
                    That's less than ₹17 per day for a professional digital queue management system.
                    Contact the QNow admin to upgrade.
                  </div>
                </div>
              </div>
            </Section>

            <Section emoji="🔒" title="What is the approval process?">
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75}}>
                When you register, your account shows as <strong>Pending</strong>.
                The QNow admin reviews your application to confirm it's a genuine business.
                Once approved, your service becomes visible to customers and you can start managing queues.
                Approval typically happens within a few hours on working days.
              </p>
              <p style={{fontSize:'.87rem', color:'var(--text2)', lineHeight:1.75, marginTop:10}}>
                If there is an issue with your registration (wrong information, duplicate name, etc.),
                the admin may edit your details or contact you before approving.
              </p>
            </Section>

            <Section emoji="❓" title="Frequently Asked Questions — Vendors">
              <FAQ q="Can I have multiple branches?" a="Currently each QNow account is for one location. For multiple branches, register each one separately with a slightly different name — e.g. 'City Clinic - MG Road' and 'City Clinic - Banjara Hills'." />
              <FAQ q="What if a customer joins while I'm showing as closed?" a="When your service is set to Closed, new customers cannot join the queue. They'll see your service with a Closed badge. Turn it Open when you're ready." />
              <FAQ q="Can I see the customer's phone number?" a="Yes. Your dashboard shows each customer's name and phone number. Walk-in customers added manually may not have a number if you didn't enter one." />
              <FAQ q="What is a Walk-in token?" a="A walk-in token is for customers who come to your location directly without using the QNow app. You add them from your dashboard — they get the next available token number and join the queue alongside online customers." />
              <FAQ q="My dashboard shows blank queue even though customers joined." a="This usually happens when Firestore indexes are not deployed. Run: firebase deploy --only firestore:indexes from your project folder. See the DEPLOYMENT.md guide for full instructions." />
              <FAQ q="How do I reset my vendor password?" a="Contact the QNow admin. They can reset your password from the admin dashboard without affecting your queue data." />
              <FAQ q="What happens to the queue when I mark as Closed?" a="Closing prevents new customers from joining. Existing customers in the queue remain, and you can continue calling and serving them. Their WhatsApp notifications still work normally." />
            </Section>
          </>
        )}

        {/* Bottom CTA */}
        <div style={{
          margin:'8px 0 24px', padding:20,
          background:'var(--teal)', borderRadius:'var(--r)',
          textAlign:'center', color:'#fff',
        }}>
          <div style={{fontSize:'1.5rem', marginBottom:8}}>🙋</div>
          <div style={{fontWeight:700, fontSize:'1rem', marginBottom:6}}>Still have questions?</div>
          <p style={{fontSize:'.84rem', opacity:.8, lineHeight:1.6, marginBottom:14}}>
            We're here to help. Reach out to the QNow team and we'll reply quickly.
          </p>
          <div style={{display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}}>
            <button className="btn btn-primary btn-sm" onClick={() => nav('/browse')}>Browse Services</button>
            <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>Go to Home</button>
          </div>
        </div>

      </div>
    </div>
  )
}

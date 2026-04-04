import { useNavigate } from 'react-router-dom'

export default function PrivacyPolicy() {
  const nav = useNavigate()
  const appUrl = window.location.origin
  const effectiveDate = 'March 2025'
  const contactEmail  = 'support@qnow.in'   // ← change to your actual email

  return (
    <div className="screen">
      <nav>
        <div className="logo">Q<span>Now</span></div>
        <button className="btn btn-ghost-white btn-sm" onClick={() => nav('/')}>← Home</button>
      </nav>

      <div className="content pt" style={{ maxWidth: 720 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-title" style={{ fontSize: '1.6rem' }}>Privacy Policy</div>
          <div style={{ color: 'var(--text3)', fontSize: '.88rem', marginTop: 6 }}>
            Effective date: {effectiveDate} &nbsp;·&nbsp; Last updated: {effectiveDate}
          </div>
        </div>

        {/* Intro */}
        <div className="card">
          <p style={{ fontSize: '.92rem', color: 'var(--text2)', lineHeight: 1.8 }}>
            QNow ("we", "our", "us") operates the website{' '}
            <strong>{appUrl}</strong> (the "Service").
            This page explains what information we collect, how we use it, and your rights
            regarding your data. By using QNow, you agree to this policy.
          </p>
        </div>

        {[
          {
            n: '1',
            title: 'Information We Collect',
            body: (
              <>
                <p style={p}>We collect only the information needed to provide the queue management service:</p>
                <ul style={ul}>
                  <li style={li}><strong>Full name</strong> — entered when joining a queue, used to identify you in the queue list.</li>
                  <li style={li}><strong>Mobile number</strong> — used to send WhatsApp notifications about your queue status.</li>
                  <li style={li}><strong>4-digit PIN</strong> — chosen by you, used to let you re-check your token status. Stored as plain text in our database.</li>
                  <li style={li}><strong>Vendor information</strong> — business name, location, contact number, service hours, and a password (plain text) entered during vendor registration.</li>
                </ul>
                <p style={{...p, marginTop: 12}}>
                  We do <strong>not</strong> collect payment information, email addresses, national ID numbers,
                  or any sensitive personal data. We do not use cookies for tracking.
                </p>
              </>
            ),
          },
          {
            n: '2',
            title: 'How We Use Your Information',
            body: (
              <ul style={ul}>
                <li style={li}><strong>Queue management:</strong> Your name and mobile number are displayed to the vendor whose queue you join, so they can identify and call you.</li>
                <li style={li}><strong>WhatsApp notifications:</strong> We send automated WhatsApp messages to your mobile number to notify you when your turn is approaching or when it's your turn. These are service notifications, not marketing messages.</li>
                <li style={li}><strong>Token re-access:</strong> Your mobile number and PIN are used together to let you check your queue status at any time.</li>
                <li style={li}><strong>Service improvement:</strong> Aggregate, anonymised usage data (e.g. number of tokens issued per day) may be used to improve the platform.</li>
              </ul>
            ),
          },
          {
            n: '3',
            title: 'WhatsApp Messaging',
            body: (
              <>
                <p style={p}>
                  QNow uses the <strong>Meta WhatsApp Cloud API</strong> to deliver notifications.
                  When you provide your mobile number:
                </p>
                <ul style={ul}>
                  <li style={li}>Your number is shared with Meta (WhatsApp's parent company) solely for the purpose of delivering messages.</li>
                  <li style={li}>Messages are sent only for queue-related events: joining confirmation, approaching-turn alerts, and turn notifications.</li>
                  <li style={li}>We do not send promotional, advertising, or marketing messages via WhatsApp.</li>
                  <li style={li}>Meta's own Privacy Policy applies to how WhatsApp handles your data: <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal3)' }}>whatsapp.com/legal/privacy-policy</a></li>
                </ul>
              </>
            ),
          },
          {
            n: '4',
            title: 'Data Storage and Security',
            body: (
              <>
                <p style={p}>
                  Your data is stored in <strong>Google Firebase Firestore</strong>, a cloud database
                  managed by Google LLC with servers in the asia-south1 (Mumbai) region.
                  Firebase applies industry-standard encryption for data in transit and at rest.
                </p>
                <p style={{ ...p, marginTop: 10 }}>
                  <strong>Retention:</strong> Token records (queue entries) are kept in the database
                  indefinitely unless manually deleted by the vendor or admin. Vendor accounts remain
                  until deleted by the admin. We do not have an automated deletion schedule at this time.
                </p>
                <p style={{ ...p, marginTop: 10 }}>
                  <strong>Note:</strong> Passwords and PINs are currently stored as plain text.
                  We recommend vendors choose a unique password not used elsewhere. We plan to add
                  password hashing in a future update.
                </p>
              </>
            ),
          },
          {
            n: '5',
            title: 'Data Sharing',
            body: (
              <>
                <p style={p}>We do <strong>not</strong> sell, rent, or trade your personal information. We share data only with:</p>
                <ul style={ul}>
                  <li style={li}><strong>The vendor whose queue you join</strong> — they see your name and mobile number to manage their queue.</li>
                  <li style={li}><strong>Google Firebase</strong> — for database and hosting services.</li>
                  <li style={li}><strong>Meta (WhatsApp)</strong> — to deliver queue notification messages to your phone.</li>
                  <li style={li}><strong>Vercel</strong> — for hosting the QNow web application.</li>
                </ul>
                <p style={{ ...p, marginTop: 10 }}>
                  All third-party services are bound by their own privacy policies and data protection standards.
                </p>
              </>
            ),
          },
          {
            n: '6',
            title: 'Your Rights',
            body: (
              <>
                <p style={p}>You have the right to:</p>
                <ul style={ul}>
                  <li style={li}><strong>Access</strong> — request a copy of the data we hold about you.</li>
                  <li style={li}><strong>Correction</strong> — request that inaccurate information be corrected.</li>
                  <li style={li}><strong>Deletion</strong> — request that your data be deleted from our system.</li>
                  <li style={li}><strong>Opt-out of WhatsApp messages</strong> — reply STOP to any message we send, or contact us directly.</li>
                </ul>
                <p style={{ ...p, marginTop: 10 }}>
                  To exercise any of these rights, email us at{' '}
                  <a href={`mailto:${contactEmail}`} style={{ color: 'var(--teal3)' }}>{contactEmail}</a>.
                  We will respond within 7 business days.
                </p>
              </>
            ),
          },
          {
            n: '7',
            title: "Children's Privacy",
            body: (
              <p style={p}>
                QNow is not directed at children under the age of 13. We do not knowingly collect
                personal information from children. If you believe we have inadvertently collected
                data from a child, please contact us immediately at{' '}
                <a href={`mailto:${contactEmail}`} style={{ color: 'var(--teal3)' }}>{contactEmail}</a>{' '}
                and we will delete it promptly.
              </p>
            ),
          },
          {
            n: '8',
            title: 'Changes to This Policy',
            body: (
              <p style={p}>
                We may update this Privacy Policy from time to time. When we do, we will revise the
                "Last updated" date at the top of this page. We encourage you to review this page
                periodically. Continued use of QNow after changes are posted constitutes your
                acceptance of the updated policy.
              </p>
            ),
          },
          {
            n: '9',
            title: 'Contact Us',
            body: (
              <>
                <p style={p}>If you have any questions about this Privacy Policy or how we handle your data, contact us:</p>
                <div style={{ marginTop: 12, padding: '14px 18px', background: 'var(--surface2)', borderRadius: 'var(--r2)', fontSize: '.88rem', lineHeight: 1.8 }}>
                  <strong>QNow</strong><br />
                  Email: <a href={`mailto:${contactEmail}`} style={{ color: 'var(--teal3)' }}>{contactEmail}</a><br />
                  Website: <a href={appUrl} style={{ color: 'var(--teal3)' }}>{appUrl}</a>
                </div>
              </>
            ),
          },
        ].map(section => (
          <div key={section.n} className="card" style={{ marginBottom: 12 }}>
            <div style={{
              fontSize: '1rem', fontWeight: 800, color: 'var(--teal)',
              marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--teal)', color: '#fff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.82rem', fontWeight: 800, flexShrink: 0,
              }}>{section.n}</span>
              {section.title}
            </div>
            <div style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.75 }}>
              {section.body}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '20px 0 32px',
          fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.7,
        }}>
          © {new Date().getFullYear()} QNow. All rights reserved.<br />
          <span
            style={{ color: 'var(--teal3)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => nav('/')}
          >
            ← Back to QNow
          </span>
        </div>

      </div>
    </div>
  )
}

// Shared styles
const p  = { margin: 0, lineHeight: 1.75 }
const ul = { paddingLeft: 20, margin: 0 }
const li = { marginBottom: 8, lineHeight: 1.65 }

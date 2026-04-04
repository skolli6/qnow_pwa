/**
 * whatsappService.js
 *
 * ALL notifications use Meta-approved template messages.
 *
 * WHY TEMPLATES ARE REQUIRED:
 * Every notification QNow sends is business-initiated (the app messages the customer first).
 * Meta's policy requires approved templates for all business-initiated messages.
 * Free-form text messages are silently dropped by Meta for business-initiated sends.
 *
 * TEMPLATE NAMES (must match exactly what you created in Meta Developer Console):
 *   queue_joined          — sent when customer joins queue
 *   queue_reminder_15min  — sent 15 minutes before turn
 *   queue_extend_offer    — sent when 3 people ahead (with extend option)
 *   queue_your_turn       — sent when vendor calls next
 *   queue_slot_extended   — sent when customer extends their slot
 *
 * Template approval: Meta Developer Console → WhatsApp → Message Templates
 * Utility templates are usually approved within minutes to a few hours.
 */

const APP_URL = typeof window !== 'undefined'
  ? window.location.origin
  : (process.env.VITE_APP_URL || 'https://qnow-chi.vercel.app')

// ─── CORE SEND FUNCTION ───────────────────────────────────────

async function sendTemplate(mobile, templateName, components, lang = 'en') {
  if (!mobile) return false

  try {
    const res = await fetch('/api/whatsapp', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to:           mobile,
        type:         'template',
        templateName,
        templateLang: lang,
        components,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.warn(`WhatsApp template "${templateName}" failed:`, err)
      return false
    }

    return true
  } catch (err) {
    console.warn('WhatsApp fetch error:', err)
    return false
  }
}

// ─── HELPER: build a body component with ordered parameters ──

function bodyComponent(...params) {
  return {
    type:       'body',
    parameters: params.map(text => ({ type: 'text', text: String(text) })),
  }
}

// ─── NOTIFICATION FUNCTIONS ───────────────────────────────────

/**
 * Sent immediately when a customer joins the queue.
 * Template: queue_joined
 * Variables: {{1}}=name, {{2}}=vendorName, {{3}}=tokenNumber,
 *            {{4}}=position, {{5}}=waitMins, {{6}}=appUrl
 */
export async function sendTokenConfirmation({ name, mobile, tokenNumber, vendorName, position, waitMins }) {
  return sendTemplate(
    mobile,
    'queue_joined',
    [bodyComponent(name, vendorName, tokenNumber, position, waitMins)]
  )
}

/**
 * Sent when only 3 (or fewer) people are ahead of the customer.
 * Template: queue_extend_offer  (has quick reply buttons: "I'm on my way" / "Extend my slot")
 * Variables: {{1}}=name, {{2}}=aheadCount, {{3}}=person/people, {{4}}=vendorName, {{5}}=tokenNumber
 */
export async function sendNearlyThereAlert({ name, mobile, tokenNumber, vendorName, ahead }) {
  return sendTemplate(
    mobile,
    'queue_extend_offer',
    [bodyComponent(
      name,
      ahead,
      ahead === 1 ? 'person' : 'people',
      vendorName,
      tokenNumber,
    )]
  )
}

/**
 * Sent when estimated wait drops to 15 minutes or less.
 * Template: queue_reminder_15min
 * Variables: {{1}}=name, {{2}}=vendorName, {{3}}=tokenNumber, {{4}}=appUrl
 */
export async function send15MinAlert({ name, mobile, tokenNumber, vendorName }) {
  return sendTemplate(
    mobile,
    'queue_reminder_15min',
    [bodyComponent(name, vendorName, tokenNumber)]
  )
}

/**
 * Sent the moment the vendor taps "Call Next".
 * Template: queue_your_turn
 * Variables: {{1}}=name, {{2}}=tokenNumber, {{3}}=vendorName
 */
export async function sendYourTurnNow({ name, mobile, tokenNumber, vendorName }) {
  return sendTemplate(
    mobile,
    'queue_your_turn',
    [bodyComponent(name, tokenNumber, vendorName)]
  )
}

/**
 * Sent when customer extends their slot.
 * Template: queue_slot_extended
 * Variables: {{1}}=name, {{2}}=tokenNumber, {{3}}=vendorName, {{4}}=newPosition
 *
 * Template body (create this in Meta):
 * "✅ Slot extended, {{1}}! Your token T-{{2}} at {{3}} has been moved to position #{{4}}.
 * We'll notify you when your new turn approaches. _QNow_"
 */
export async function sendSlotExtended({ name, mobile, tokenNumber, vendorName, newPosition }) {
  return sendTemplate(
    mobile,
    'queue_slot_extended',
    [bodyComponent(name, tokenNumber, vendorName, newPosition)]
  )
}

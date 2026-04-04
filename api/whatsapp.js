/**
 * api/whatsapp.js
 * Vercel Serverless Function — proxies WhatsApp Cloud API calls server-side.
 *
 * Supports two modes:
 *   1. Template messages  (body.type = "template") — required for business-initiated messages
 *   2. Text messages      (body.type = "text")      — only works within 24hr customer service window
 *
 * All 4 notification types (join, 3-ahead, 15-min, your-turn) MUST use templates
 * because they are business-initiated. Meta silently drops free-form text otherwise.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { to, type, templateName, templateLang, components, message } = req.body

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" phone number' })
  }

  const token   = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID

  if (!token || !phoneId) {
    console.error('WhatsApp env vars not configured')
    return res.status(500).json({ error: 'WhatsApp not configured' })
  }

  // Normalise phone: remove spaces, +, leading zeros
  const phone = to.replace(/[\s+]/g, '').replace(/^0+/, '')

  // Build the payload based on type
  let payload

  if (type === 'template') {
    // Template message — required for business-initiated (proactive) notifications
    if (!templateName) {
      return res.status(400).json({ error: 'Missing templateName for template message' })
    }
    payload = {
      messaging_product: 'whatsapp',
      to:                phone,
      type:              'template',
      template: {
        name:       templateName,
        language:   { code: templateLang || 'en' },
        components: components || [],
      },
    }
  } else {
    // Free-form text — only works if customer messaged you within last 24 hours
    if (!message) {
      return res.status(400).json({ error: 'Missing message for text type' })
    }
    payload = {
      messaging_product: 'whatsapp',
      to:                phone,
      type:              'text',
      text:              { body: message },
    }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', JSON.stringify(data))
      return res.status(response.status).json({ error: data })
    }

    return res.status(200).json({ success: true, messageId: data.messages?.[0]?.id })
  } catch (err) {
    console.error('WhatsApp proxy error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

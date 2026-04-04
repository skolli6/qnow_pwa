/**
 * generate-vapid-keys.js
 *
 * Run this ONCE to generate your VAPID key pair for Web Push notifications.
 *
 * How to run:
 *   node generate-vapid-keys.js
 *
 * Then copy the output into your Vercel environment variables.
 */

const crypto = require('crypto')

// Generate a VAPID key pair using Node.js built-in crypto
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
})

const publicKeyExport  = publicKey.export({ type: 'spki', format: 'der' })
const privateKeyExport = privateKey.export({ type: 'pkcs8', format: 'der' })

// Convert to URL-safe base64 (VAPID format)
function toBase64Url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// VAPID keys are the last 65 bytes of the public key DER and last 32 bytes of private key DER
const pubKey  = toBase64Url(publicKeyExport.slice(-65))
const privKey = toBase64Url(privateKeyExport.slice(-32))

console.log('\n✅ VAPID Keys Generated!\n')
console.log('Add these to Vercel Environment Variables:\n')
console.log(`VAPID_PUBLIC_KEY=${pubKey}`)
console.log(`VAPID_PRIVATE_KEY=${privKey}`)
console.log(`VAPID_EMAIL=mailto:support@qnow.in`)
console.log('\nAlso add the public key to Vercel as:')
console.log(`VITE_VAPID_PUBLIC_KEY=${pubKey}`)
console.log('\n⚠  Keep VAPID_PRIVATE_KEY secret — never commit it to GitHub\n')

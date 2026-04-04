/**
 * generate-icons.js
 * Generates all required PWA icon sizes from the base SVG.
 *
 * Run once:  node generate-icons.js
 * Requires:  npm install sharp   (run first)
 *
 * Output: public/icons/ folder with all PNG sizes
 */

const sharp  = require('sharp')
const fs     = require('fs')
const path   = require('path')

const SIZES  = [72, 96, 128, 144, 152, 192, 384, 512]
const outDir = path.join(__dirname, 'public', 'icons')

// Create output directory
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// QNow icon SVG inline (teal background, Q in amber, Now in white)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0A3D35"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial Black, sans-serif" font-weight="900"
    font-size="280" fill="#F5A623">Q</text>
  <text x="62%" y="78%" dominant-baseline="middle" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="700"
    font-size="120" fill="#ffffff">Now</text>
</svg>`

async function generate() {
  const svgBuffer = Buffer.from(svgIcon)

  for (const size of SIZES) {
    const outPath = path.join(outDir, `icon-${size}.png`)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outPath)
    console.log(`✅ Generated icon-${size}.png`)
  }

  console.log('\n✅ All icons generated in public/icons/')
  console.log('Commit the public/icons/ folder to GitHub.')
}

generate().catch(console.error)

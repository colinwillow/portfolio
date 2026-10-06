// QR codes for the games: one SVG per playable item in PLAY, at site/qr/<slug>.svg, pointing at the
// game's own URL. Built here rather than in the browser so the site carries no QR library.
// Dark squares, no background: the page sets them on a white panel.
//   npm run qr        (needs the `qrcode` package: `npm i --no-save qrcode`, or QRCODE_DIR=<dir with node_modules>)
import { createRequire } from 'module';
import fs from 'fs';
import { PLAY } from '../site/content.js';
let QR;
for (const base of [import.meta.url, process.env.QRCODE_DIR && 'file://' + process.env.QRCODE_DIR + '/']) {
  if (!base) continue;
  try { QR = createRequire(base)('qrcode'); break; } catch {}
}
if (!QR) { console.error('qr: the `qrcode` package is not installed -- `npm i --no-save qrcode` and run again'); process.exit(1); }
const out = new URL('../site/qr/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
for (const it of PLAY) {
  if (!it.url) continue;
  const svg = await QR.toString(it.url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0 });
  // one path for the dark modules, kept dark: the panel behind it is white in both themes, which is what scanners read best
  const clean = svg.replace(/<path fill="#ffffff"[^>]*\/>/i, '').replace(/#000000/g, '#16131a');
  fs.writeFileSync(new URL(it.slug + '.svg', out), clean);
  console.log('qr', it.slug, '->', it.url);
}

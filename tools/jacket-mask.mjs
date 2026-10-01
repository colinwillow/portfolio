#!/usr/bin/env node
// Bakes site/colin-jacket.webp: where on Colin's "outfit" texture the JACKET is.
//
// The outfit atlas is one jumble -- jacket, hoodie, jeans and skin islands all
// mixed -- so the jacket cannot be found by position. It is found by TEXTURE: the
// jacket is a busy many-coloured knit, and everything else on that atlas is a flat
// colour. So: the colour variance in a small window (busy = knit), then a wide blur
// and a second threshold, which keeps the big knit islands and drops the thin false
// lines a variance test draws along every seam between two flat regions.
// Usage: node tools/jacket-mask.mjs <ffmpeg>   (reads models/colin.glb)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const FF = process.argv[2] || 'ffmpeg';
const b = readFileSync('models/colin.glb'), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len));
const bin = b.slice(20 + len + 8), mat = j.materials.findIndex(m => m.name === 'outfit');
const tex = j.textures[j.materials[mat].pbrMetallicRoughness.baseColorTexture.index];
const img = j.images[tex.extensions?.EXT_texture_webp?.source ?? tex.source], bv = j.bufferViews[img.bufferView];
const S = 1024;
const raw = execFileSync(FF, ['-v', 'error', '-i', 'pipe:0', '-vf', `scale=${S}:${S}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
  { input: bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength), maxBuffer: 1 << 26 });
const N = S * S, at = (x, y) => Math.min(S - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x));
// box mean via integral image
function box(src, r) {
  const I = new Float64Array((S + 1) * (S + 1));
  for (let y = 0; y < S; y++) { let row = 0; for (let x = 0; x < S; x++) { row += src[y * S + x]; I[(y + 1) * (S + 1) + x + 1] = I[y * (S + 1) + x + 1] + row; } }
  const out = new Float32Array(N);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const x0 = Math.max(0, x - r), x1 = Math.min(S, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(S, y + r + 1);
    out[y * S + x] = (I[y1 * (S + 1) + x1] - I[y0 * (S + 1) + x1] - I[y1 * (S + 1) + x0] + I[y0 * (S + 1) + x0]) / ((x1 - x0) * (y1 - y0));
  }
  return out;
}
// The knit's signature is COLOUR DIVERSITY. Measured on the atlas, a jacket patch
// mixes four or five hue families (warm, violet, blue, cyan, grey), the jeans two,
// skin and hoodie one. So every pixel gets a hue family, each family's share in a
// small neighbourhood is box-averaged, and the jacket is where the ENTROPY of those
// shares is high.
const fam = new Uint8Array(N), K = 7;
for (let i = 0; i < N; i++) {
  const R = raw[i * 3], G = raw[i * 3 + 1], B = raw[i * 3 + 2];
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), s = mx ? (mx - mn) / mx : 0;
  let h = 0; if (mx > mn) { h = mx === R ? ((G - B) / (mx - mn) + 6) % 6 : mx === G ? (B - R) / (mx - mn) + 2 : (R - G) / (mx - mn) + 4; } h *= 60;
  fam[i] = s < 0.2 ? 0 : h < 45 || h > 330 ? 1 : h < 90 ? 2 : h < 170 ? 3 : h < 210 ? 4 : h < 260 ? 5 : 6;
}
let v = new Float32Array(N);
for (let f = 0; f < K; f++) {
  const share = box(Float32Array.from(fam, x => (x === f ? 1 : 0)), 8);
  for (let i = 0; i < N; i++) { const p = share[i]; if (p > 1e-4) v[i] -= p * Math.log(p); }
}
const T1 = +(process.argv[3] || 0.9), FILL = +(process.argv[4] || 0.3);
let k = new Float32Array(N); for (let i = 0; i < N; i++) k[i] = v[i] > T1 ? 1 : 0;
k = box(k, 12);
const out = Buffer.alloc(N);
let on = 0;
for (let i = 0; i < N; i++) { const a = Math.max(0, Math.min(1, (k[i] - FILL) / 0.16)); out[i] = Math.round(a * 255); if (a > 0.5) on++; }
// soften the edge a touch so the recolour fades in rather than cutting
const soft = box(Float32Array.from(out, x => x / 255), 1);
const fin = Buffer.from(soft.map(x => Math.round(x * 255)));
execFileSync(FF, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${S}x${S}`, '-i', 'pipe:0', '-c:v', 'libwebp', '-lossless', '1', 'site/colin-jacket.webp'], { input: fin });
console.log(`site/colin-jacket.webp  ${S}x${S}  jacket ${(100 * on / N).toFixed(1)}% of the atlas`);

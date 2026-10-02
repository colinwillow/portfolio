// Bake a song into the mandala's drive signal, so the backdrop can dance to it SILENTLY -- a
// browser will not start audio (or an AudioContext) before a tap, but it will happily read a file.
// It emulates exactly what Robits' visualizer reads off a WebAudio AnalyserNode: fftSize 256,
// Blackman window, smoothing .55, bytes over -100..-30 dB, and the SUM of bins 6..29 -- once per
// 1/60 s, which is the frame the p5 original stepped on. Out: Uint16 little-endian, one per frame.
// Usage: node tools/vizbake.mjs <ffmpeg> in.mp3 site/viz/name.bin
import { execFileSync } from 'child_process';
import fs from 'fs';
const [,, ff, src, out] = process.argv, SR = 48000, FPS = 60, N = 256, HOP = SR / FPS, TAU = 0.55;
const raw = execFileSync(ff, ['-v', 'error', '-i', src, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const win = new Float32Array(N).map((_, i) => 0.42 - 0.5 * Math.cos(2 * Math.PI * i / N) + 0.08 * Math.cos(4 * Math.PI * i / N));
const re = new Float64Array(N), im = new Float64Array(N), sm = new Float64Array(N / 2);
function fft() {
  for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len;
    for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const c = Math.cos(a * k), s = Math.sin(a * k), xr = re[i + k + len / 2] * c - im[i + k + len / 2] * s, xi = re[i + k + len / 2] * s + im[i + k + len / 2] * c;
      re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
}
const frames = Math.floor((pcm.length - N) / HOP), o = new Uint16Array(frames);
for (let f = 0; f < frames; f++) {
  const at = Math.round(f * HOP);
  for (let i = 0; i < N; i++) { re[i] = pcm[at + i] * win[i]; im[i] = 0; }
  fft();
  let sum = 0;
  for (let k = 0; k < N / 2; k++) {
    sm[k] = TAU * sm[k] + (1 - TAU) * Math.hypot(re[k], im[k]) / N;
    if (k >= 6 && k < 30) { const db = 20 * Math.log10(sm[k] || 1e-12); sum += Math.max(0, Math.min(255, Math.floor(255 * (db + 100) / 70))); }
  }
  o[f] = sum;
}
fs.writeFileSync(out, Buffer.from(o.buffer));
let mx = 0, mean = 0; for (const v of o) { mx = Math.max(mx, v); mean += v / frames; }
console.log(frames, 'frames,', (frames / FPS).toFixed(1), 's,', o.byteLength, 'bytes, mean', mean.toFixed(0), 'max', mx);

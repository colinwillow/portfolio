// The accent is procedural: one colour in OKLCH, and every tint on the site
// (hover, soft fill, the globe's ribbons) is derived from it. OKLCH because its
// L is perceptual, so a teal and an auburn at the same L read equally light.
//
// Pick one with ?accent=teal, ?hue=200, the dot in the corner (cycles presets),
// or a long-press on it (random). The choice is remembered per browser.

export const PRESETS = {
  auburn: { l: 0.64, c: 0.085, h: 352 },  // reddish, desaturated purple -- the default
  mauve:  { l: 0.68, c: 0.070, h: 330 },
  teal:   { l: 0.70, c: 0.075, h: 195 },
  rust:   { l: 0.64, c: 0.095, h: 40 },
  sage:   { l: 0.72, c: 0.060, h: 150 },
  iris:   { l: 0.64, c: 0.090, h: 285 },
};
export const ORDER = Object.keys(PRESETS);
const KEY = 'cw.accent';

// OKLCH -> sRGB hex (Björn Ottosson's matrices), clamped into gamut.
export function oklchHex({ l, c, h }) {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const S = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [
     4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.7076147010 * S,
  ];
  return '#' + lin.map(v => {
    v = Math.min(1, Math.max(0, v));
    v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(v * 255).toString(16).padStart(2, '0');
  }).join('');
}

function read() {
  const q = new URLSearchParams(location.search);
  if (q.get('accent') && PRESETS[q.get('accent')]) return { name: q.get('accent'), ...PRESETS[q.get('accent')] };
  if (q.get('hue')) return { name: 'custom', ...PRESETS.auburn, h: +q.get('hue') };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && isFinite(s.h)) return s;
  } catch {}
  return { name: 'auburn', ...PRESETS.auburn };
}

let cur = read();
const curRaw = () => cur;
const subs = new Set();
export const accent = () => cur;
export const onAccent = fn => (subs.add(fn), fn(cur));

export function setAccent(a) {
  cur = a;
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch {}
  apply();
}
export function nextPreset() {
  const i = ORDER.indexOf(cur.name);
  const name = ORDER[(i + 1) % ORDER.length];
  setAccent({ name, ...PRESETS[name] });
}
export function randomAccent() {
  setAccent({ name: 'custom', l: 0.62 + Math.random() * 0.1, c: 0.06 + Math.random() * 0.04, h: Math.random() * 360 });
}

/* LIGHT MODE IS POPPIER: the presets were chosen for the dark page, where a quiet chroma glows;
   on cream the same colour reads as grey. So light mode multiplies the chroma by `pop`.
   `?pop=1` in the address shows the old, muted look; `?pop=2` pushes further. */
export const LIGHT = { pop: +new URLSearchParams(location.search).get('pop') || 1.7 };

function apply() {
  const r = document.documentElement.style;
  const dark = document.documentElement.dataset.theme === 'dark';
  const cur = dark ? curRaw() : { ...curRaw(), c: curRaw().c * LIGHT.pop };
  r.setProperty('--accent', oklchHex(cur));
  r.setProperty('--accent-ink', oklchHex({ ...cur, l: dark ? cur.l + 0.1 : cur.l - 0.16 }));
  r.setProperty('--accent-soft', oklchHex({ ...cur, l: dark ? 0.3 : 0.93, c: cur.c * 0.35 }));
  r.setProperty('--accent-deep', oklchHex({ ...cur, l: cur.l - 0.24, c: cur.c * 1.1 }));
  subs.forEach(fn => fn(cur));
}

// Theme lives here too because every accent tint depends on it.
export function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('cw.theme', t); } catch {}
  apply();
}
export function initTheme() {
  let t = null;
  try { t = localStorage.getItem('cw.theme'); } catch {}
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t);
}

/** A pair of colours for a section (by its index): its ring and its core, spread
    round the wheel. Glorb takes both; the section pages' particle band takes the ring. */
export function sectionColours(i) {
  const h = (290 + i * 36) % 360;
  return { rim: oklchHex({ l: 0.62, c: 0.19, h }), core: oklchHex({ l: 0.88, c: 0.11, h: (h + 40) % 360 }) };
}

// THE WEAVES: a woven band pattern behind Glorb, one composition per section.
//
// Built the way a blanket is: horizontal BANDS stacked top to bottom, each one
// a single motif repeated along its length -- arrows, the stepped star,
// zigzags, hourglasses, diamond chains, terraces. Every motif is geometry drawn
// from numbers (no image files), so it is sharp at any size and a new section's
// pattern is a list of bands, not a drawing.
//
// It moves like cloth on a loom: each band slides slowly along its own length,
// alternate bands the other way, so the whole thing is alive without anything
// ever jumping. And it stays out of Glorb's way by construction -- it is laid
// over him with `lighten` (dark theme) or `darken` (light theme), so wherever a
// particle is brighter than the weave, the particle wins. The tones are dim
// earth colours, the complement of his violet and green: they fill the negative
// space and never compete with him.
import { oklchHex } from './palette.js?v=8afb0eea';

// ---- motifs -----------------------------------------------------------------
// Each draws one PERIOD of a band into (0,0)-(w,h) and returns nothing; `per`
// says how long a period is for a band h tall. Colours: g ground, a, b, c from
// dark to light (the four yarns).
const P = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
const diamond = (g, x, y, rx, ry, col) => P(g, [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]], col);

const MOTIFS = {
  stripe: { per: () => 8, draw(g, w, h, C, o) { g.fillStyle = C[o.col || 'b']; g.fillRect(0, 0, w, h); } },

  // a stripe with a little square stitch along it
  stitch: { per: h => h * 3, draw(g, w, h, C) {
    g.fillStyle = C.a; g.fillRect(0, 0, w, h);
    g.fillStyle = C.c; g.fillRect(w * 0.1, h * 0.3, h * 0.4, h * 0.4); g.fillRect(w * 0.6, h * 0.3, h * 0.4, h * 0.4);
  } },

  // the border of the reference: arrows running in, a hollow diamond, arrows running out
  arrows: { per: h => h * 4, draw(g, w, h, C) {
    g.fillStyle = C.g; g.fillRect(0, 0, w, h);
    const t = h * 0.2, m = h * 0.08;
    const chev = (x, dir, col) => {                 // one chevron pointing right (dir 1) or left (-1)
      const a = h / 2 - m, pts = [[0, m], [t, m], [t + a, h / 2], [t, h - m], [0, h - m], [a, h / 2]];
      P(g, pts.map(([px, py]) => [x + dir * px, py]), col);
    };
    chev(h * 0.05, 1, C.c); chev(h * 0.4, 1, C.b);
    diamond(g, h * 2, h / 2, h * 0.62, h / 2 - m, C.c);
    diamond(g, h * 2, h / 2, h * 0.36, h / 2 - m - h * 0.18, C.g);
    diamond(g, h * 2, h / 2, h * 0.14, h * 0.13, C.b);
    chev(h * 3.95, -1, C.c); chev(h * 3.6, -1, C.b);
  } },

  // the big stepped star with its triangle crowns and the zigzag bar through it
  star: { per: h => h * 1.25, draw(g, w, h, C) {
    g.fillStyle = C.a; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, u = h / 10;
    // tan wings: an hourglass behind the star
    P(g, [[cx - 3.6 * u, 1.6 * u], [cx + 3.6 * u, 1.6 * u], [cx, cy]], C.b);
    P(g, [[cx - 3.6 * u, h - 1.6 * u], [cx + 3.6 * u, h - 1.6 * u], [cx, cy]], C.b);
    // light crowns top and bottom, and the stepped arms
    P(g, [[cx - 1.8 * u, 0], [cx + 1.8 * u, 0], [cx, 1.6 * u]], C.c);
    P(g, [[cx - 1.8 * u, h], [cx + 1.8 * u, h], [cx, h - 1.6 * u]], C.c);
    for (const s of [-1, 1]) {
      P(g, [[cx + s * 1.2 * u, 2.4 * u], [cx + s * 4.6 * u, 2.4 * u], [cx + s * 3.4 * u, 3.4 * u], [cx + s * 0.4 * u, 3.4 * u]], C.c);
      P(g, [[cx + s * 1.2 * u, h - 2.4 * u], [cx + s * 4.6 * u, h - 2.4 * u], [cx + s * 3.4 * u, h - 3.4 * u], [cx + s * 0.4 * u, h - 3.4 * u]], C.c);
    }
    // the bar through the middle, broken by a dark diamond at each end of the period
    g.fillStyle = C.c; g.fillRect(0, cy - 0.9 * u, w, 1.8 * u);
    for (const x of [0, w]) diamond(g, x, cy, 1.9 * u, 2.2 * u, C.a);
    // the eye: ring on ring with a dot
    diamond(g, cx, cy, 2.9 * u, 3.2 * u, C.a);
    diamond(g, cx, cy, 2.3 * u, 2.55 * u, C.b);
    diamond(g, cx, cy, 1.5 * u, 1.7 * u, C.a);
    diamond(g, cx, cy, 1.0 * u, 1.1 * u, C.b);
    g.fillStyle = C.a; g.beginPath(); g.arc(cx, cy, 0.42 * u, 0, Math.PI * 2); g.fill();
  } },

  // two-colour lightning
  zigzag: { per: h => h * 1.1, draw(g, w, h, C) {
    g.fillStyle = C.g; g.fillRect(0, 0, w, h);
    const t = h * 0.22;
    for (const [off, col] of [[-t * 1.3, C.b], [t * 0.2, C.c], [t * 1.7, C.a]]) {
      const y0 = h * 0.5 + off;
      P(g, [[0, y0 - t / 2 + h * 0.25], [w / 2, y0 - t / 2 - h * 0.25], [w, y0 - t / 2 + h * 0.25],
            [w, y0 + t / 2 + h * 0.25], [w / 2, y0 + t / 2 - h * 0.25], [0, y0 + t / 2 + h * 0.25]], col);
    }
  } },

  // alternating triangles, point up and point down
  hourglass: { per: h => h * 1.4, draw(g, w, h, C) {
    g.fillStyle = C.g; g.fillRect(0, 0, w, h);
    P(g, [[0, h], [w / 2, h * 0.12], [w, h]], C.b);
    P(g, [[w / 2, 0], [w, h * 0.88], [w * 1.5, 0]], C.c);
    P(g, [[-w / 2, 0], [0, h * 0.88], [w / 2, 0]], C.c);
    P(g, [[w * 0.3, h], [w / 2, h * 0.6], [w * 0.7, h]], C.a);
  } },

  // a chain of nested diamonds, each one touching the next
  chain: { per: h => h, draw(g, w, h, C) {
    g.fillStyle = C.g; g.fillRect(0, 0, w, h);
    diamond(g, w / 2, h / 2, w / 2, h / 2, C.b);
    diamond(g, w / 2, h / 2, w * 0.34, h * 0.34, C.a);
    diamond(g, w / 2, h / 2, w * 0.2, h * 0.2, C.c);
    diamond(g, 0, h / 2, w * 0.12, h * 0.12, C.c); diamond(g, w, h / 2, w * 0.12, h * 0.12, C.c);
  } },

  // stepped pyramids rising, with their echo hanging from above
  steps: { per: h => h * 2, draw(g, w, h, C) {
    g.fillStyle = C.g; g.fillRect(0, 0, w, h);
    const n = 4, sw = w / 2 / (n + 0.5), sh = h / (n + 1);
    for (let i = 0; i < n; i++) {
      g.fillStyle = C.b; g.fillRect(w / 2 - (n - i) * sw, h - (i + 1) * sh, 2 * (n - i) * sw, sh);
      g.fillStyle = C.c; g.fillRect(-(n - i) * sw * 0.7, i * sh * 0.9, 2 * (n - i) * sw * 0.7, sh * 0.9);
      g.fillRect(w - (n - i) * sw * 0.7, i * sh * 0.9, 2 * (n - i) * sw * 0.7, sh * 0.9);
    }
    g.fillStyle = C.a; g.fillRect(w / 2 - sw * 0.5, h - sh * (n + 0.6), sw, sh * 0.6);
  } },
};

// ---- compositions -------------------------------------------------------------
// Every section is the same SHAPE -- a thin stitched strip, the main band, another
// stitch, then open ground -- and only the main band's motif changes. That open
// ground above and below is what lets it read as a textile rather than wallpaper.
// `h` nudges the yarns' hue off the site's accent, so each section has its own
// dye lot while all of them stay on brand.
const LAYOUT = (main, hu = 1, o = {}) => [['stitch', 0.4], [main, hu * 0.9, o], ['stitch', 0.4], ['stripe', 1.4, { col: 'g' }]];
const WEAVES = {
  home:      { h: 0,   bands: LAYOUT('arrows') },
  play:      { h: -25, bands: LAYOUT('zigzag', 1.2) },
  tutorials: { h: -45, bands: LAYOUT('chain', 1.1) },
  characters: { h: 15, bands: LAYOUT('star', 2.0) },
  assets:    { h: 20,  bands: LAYOUT('steps', 1.3) },
  scripts:   { h: -60, bands: LAYOUT('chain') },
  web:       { h: 35,  bands: LAYOUT('hourglass', 1.1) },
  motion:    { h: -40, bands: LAYOUT('star', 2.2) },
  studios:   { h: 10,  bands: LAYOUT('steps', 1.3, { flip: 1 }) },
  writing:   { h: -15, bands: LAYOUT('arrows') },
  audio:     { h: 50,  bands: LAYOUT('chain', 1.2) },
  workbench: { h: -30, bands: LAYOUT('hourglass', 1.1, { flip: 1 }) },
  about:     { h: 25,  bands: LAYOUT('star', 2.2) },
};

// The four yarns, on brand: the ground is the page, the darker yarn is the
// site's accent, the middle one Glorb's violet, the light one a warm accent-
// tinted neutral. Dim, so it fills the negative space and never competes with
// him; the twinkle brightens a cell toward these, never past them.
function yarns(acc, shift, dark) {
  // NEON, to match Glorb: his violet, his green, and a pale lavender for the fine work.
  // `shift` turns the set a little per section so each has its own glow.
  const v = 300 + shift * 0.5, gr = 145 + shift * 0.3;
  const Y = dark
    ? [[0.2, 0.01, v], [0.72, 0.22, v], [0.84, 0.21, gr], [0.9, 0.07, v]]
    : [[0.95, 0.01, v], [0.5, 0.22, v], [0.6, 0.19, gr], [0.62, 0.1, v]];
  const [g, a, b, c] = Y.map(([l, cc, hh]) => oklchHex({ l, c: cc, h: hh }));
  return { g, a, b, c };
}

/* THE BOOLEAN SUBTRACT, shared by every backdrop behind Glorb: wherever his particles
   are, the backdrop is cut away with a soft margin, so it stops at his silhouette and
   parts around him as he moves. The particles are stamped into a quarter-size mask
   (cheap for thousands of dots), and scaling it back up is what softens the edge. */
export function makeCarve(CARVE = { r: 9, feather: 7, q: 4 }) {
  const mask = document.createElement('canvas'), mg = mask.getContext('2d');
  return function carve(ctx, cv, api, dpr) {
    if (!api) return;
    const q = CARVE.q, mw = Math.ceil(cv.width / q), mh = Math.ceil(cv.height / q);
    if (mask.width !== mw || mask.height !== mh) { mask.width = mw; mask.height = mh; }
    mg.clearRect(0, 0, mw, mh);
    const { px, py } = api.field, n = api.n, s = dpr / q, TAU = Math.PI * 2;
    for (const [rad, a] of [[CARVE.r + CARVE.feather, 0.45], [CARVE.r, 1]]) {
      mg.globalAlpha = a; mg.fillStyle = '#fff'; mg.beginPath();
      const r = rad * s;
      for (let i = 0; i < n; i++) { const x = px[i] * s, y = py[i] * s; if (x < -r || y < -r || x > mw + r || y > mh + r) continue; mg.moveTo(x + r, y); mg.arc(x, y, r, 0, TAU); }
      mg.fill();
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, 0, 0, cv.width, cv.height); ctx.restore();
  };
}

/* SHAPES, NOT TILES. Every motif is written as filled shapes (the easiest way to
   describe one), and this pen RECORDS them instead of painting: each fill becomes
   one shape -- its outline as a list of points -- and a full-width band becomes two
   long lines. The weave is then a list of real vectors, and each one can move on
   its own. A shape belongs to the period its centre falls in, so a diamond that
   straddles the repeat is drawn once, not twice. Ground fills disappear. */
function recordShapes(M, w, h, C, o) {
  const shapes = [];
  let col = C.a, path = [], cur = null, m = [1, 0, 0, 1, 0, 0];      // affine: a b c d e f
  const T = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const ink = c => (c === C.g ? C.a : c);
  const push = (pts, closed, full = false) => {
    if (pts.length < 2) return;
    let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= pts.length; cy /= pts.length;
    if (!full && (cx < 0 || cx >= w)) return;
    shapes.push({ pts, closed, full, col: ink(col), cx, cy });
  };
  const pen = {
    set fillStyle(v) { col = v; }, get fillStyle() { return col; },
    fillRect(x, y, ww, hh) {
      if (col === C.g) return;
      if (ww >= w - 1) { push([T(0, y), T(w, y)], false, true); push([T(0, y + hh), T(w, y + hh)], false, true); }
      else push([T(x, y), T(x + ww, y), T(x + ww, y + hh), T(x, y + hh)], true);
    },
    beginPath() { path = []; cur = null; },
    moveTo(x, y) { cur = [T(x, y)]; path.push(cur); },
    lineTo(x, y) { if (!cur) { cur = []; path.push(cur); } cur.push(T(x, y)); },
    closePath() {},
    arc(x, y, r) { const c = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; c.push(T(x + Math.cos(a) * r, y + Math.sin(a) * r)); } path.push(c); cur = null; },
    fill() { if (col === C.g && path.length === 0) return; for (const p of path) push(p, true); },
    translate(x, y) { m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; },
    scale(x, y) { m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; },
  };
  if (o.flip) { pen.translate(0, h); pen.scale(1, -1); }
  M.draw(pen, w, h, C, o);
  return shapes;
}

// smooth, cheap, deterministic noise: a few slow sines over space and time
const noise = (x, y, t) => (Math.sin(x * 0.011 + t * 0.21) + Math.sin(y * 0.017 - t * 0.16 + 1.3)
  + Math.sin((x + y) * 0.0072 + t * 0.12 + 2.1) + Math.sin((x - y * 0.6) * 0.0131 - t * 0.09)) / 4;
const hash = (k) => { let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };


/* THE MOTION, per shape. Every triangle, diamond, chevron and line is its own
   thing:
   - it TWINKLES: its brightness follows a slow noise field over the screen, so
     patches of the cloth fade up and down together like light moving over it;
   - where it is bright it comes FORWARD, a few percent larger about its own centre;
   - it WIGGLES: a small slow drift and turn of its own, out of step with its
     neighbours;
   - it hangs on a SPRING: the cloth scrolls with the page at a fraction of its
     speed (parallax), and each shape is a little late to follow, with its own
     stiffness, so a scroll sends a ripple through it and it settles back --
     Glorb's particles finding home. */
export function createWeave(host, field = () => null) {
  const cv = document.createElement('canvas');
  cv.className = 'weave'; host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const S = { key: null, dark: true, acc: { h: 352 }, cur: null, old: null, fade: 1, paused: false, t: 0, last: 0,
              scroll: scrollY, par: 0, anchor: null };
  const live = new Map();
  const PARALLAX = 0.35;
  const LINE = { w: 1.4, glow: 5, glowA: 0.22 };
  const MOTION = { on: false, still: 0.62 };   // still = how bright the pattern sits when it is not animating

  const unit = () => Math.max(34, Math.min(84, Math.min(innerWidth, innerHeight) * 0.14));

  function bake(key) {
    const W = WEAVES[key] || WEAVES.home, C = yarns(S.acc, W.h, S.dark), u = unit();
    let y = 0;
    const bands = W.bands.map(([m, hu, o = {}], i) => {
      const M = MOTIFS[m], h = Math.max(2, Math.round(hu * u * dpr)), w = Math.max(2, Math.round(M.per(h)));
      const b = { i, y, h, w, shapes: recordShapes(M, w, h, C, o) };
      y += h; return b;
    });
    const main = bands[1] || bands[0];
    return { key, bands, H: y, mid: main.y + main.h / 2 };
  }

  function resize() {
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (cv.width === w && cv.height === h) return false;
    cv.width = w; cv.height = h; return true;
  }

  function stateOf(k) {
    let c = live.get(k);
    if (!c) { const r = hash(k), r2 = hash(k + '*');
      c = { d: 0, v: 0, dx: 0, vx: 0, k: 26 + 40 * r, lag: 0.45 + 0.5 * r2, ph: r * 6.28, ph2: r2 * 6.28, seen: 0 }; live.set(k, c); }
    return c;
  }

  function step(dt, dScroll) {
    for (const c of live.values()) {
      c.d -= dScroll * c.lag;
      c.v += (-c.k * c.d - 2 * Math.sqrt(c.k) * 0.55 * c.v) * dt; c.d += c.v * dt;
      c.vx += (-c.k * c.dx - 2 * Math.sqrt(c.k) * 0.55 * c.vx) * dt; c.dx += c.vx * dt;
    }
  }

  const trace = (pts, closed) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  };
  function strokeShape(s, alpha) {
    ctx.strokeStyle = s.col;
    ctx.globalAlpha = alpha * LINE.glowA; ctx.lineWidth = LINE.glow * dpr; trace(s.pts, s.closed); ctx.stroke();   // the glow
    ctx.globalAlpha = alpha; ctx.lineWidth = LINE.w * dpr; ctx.stroke();                                            // the line
  }

  function paint(wv, alpha, frame) {
    if (!wv || alpha <= 0.002) return;
    const par = S.par * dpr, cw = cv.width, ch = cv.height, t = S.t;
    const ay = S.anchor != null ? S.anchor * dpr : ch * 0.5;   // Glorb's centre, when known
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const b of wv.bands) {
      if (!b.shapes.length) continue;
      const r0 = Math.floor((par - ay + wv.mid - b.y - b.h) / wv.H), r1 = Math.ceil((par + ch - ay + wv.mid - b.y) / wv.H);
      const x0 = ((cw / 2 - b.w / 2) % b.w + b.w) % b.w - b.w;       // a motif centred on the screen
      for (let r = r0; r <= r1; r++) {
        const yBase = ay - wv.mid + r * wv.H + b.y - par;
        if (yBase > ch + 40 || yBase + b.h < -40) continue;
        for (let p = 0, x = x0; x < cw + b.w; p++, x += b.w) {
          b.shapes.forEach((s, si) => {
            if (s.full && p > 0) return;                       // a full-width line is one shape across the screen
            const c = stateOf(wv.key + ':' + b.i + ':' + r + ':' + (s.full ? 'f' : p) + ':' + si); c.seen = frame;
            const ox = s.full ? 0 : x, cx = ox + s.cx, cy = yBase + s.cy;
            // STILL, for now: the pattern sits exactly as drawn, crisp and aligned. The per-shape
            // motion (twinkle, swell, wiggle, spring) is kept behind MOTION for a later, better pass.
            const mo = MOTION.on ? 1 : 0;
            const n = noise(cx / dpr, (cy + par) / dpr, t) + 0.25 * Math.sin(t * 0.5 + c.ph);
            const lit = mo ? Math.max(0, Math.min(1, 0.5 + n * 0.75)) : MOTION.still;
            const k = s.full || !mo ? 1 : 1 + 0.08 * lit;
            const rot = s.full || !mo ? 0 : 0.04 * Math.sin(t * 0.37 + c.ph2);
            const wx = mo ? (s.full ? 0 : 2.2 * Math.sin(t * 0.43 + c.ph)) * dpr + c.dx : 0, wy = mo ? 1.8 * Math.sin(t * 0.31 + c.ph2) * dpr + c.d : 0;
            const co = Math.cos(rot) * k, sn = Math.sin(rot) * k;
            // place it: about its own centre, then where it lives plus its wiggle and lag
            ctx.setTransform(co, sn, -sn, co, cx + wx - (co * s.cx - sn * s.cy), cy + wy - (sn * s.cx + co * s.cy));
            if (s.full) ctx.setTransform(1, 0, 0, 1, wx, yBase + wy);
            else ctx.transform(1, 0, 0, 1, 0, 0);
            strokeShape(s.full ? { ...s, pts: [[0, s.pts[0][1]], [cw, s.pts[1][1]]] } : s, alpha * (0.32 + 0.68 * lit));
          });
        }
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* THE BOOLEAN SUBTRACT. Wherever Glorb's particles are, the cloth is cut away,
     with a soft margin, so the pattern stops at his silhouette and parts around
     him as he moves. The particles are stamped into a quarter-size mask (cheap
     for thousands of dots) and scaling it back up is what softens the edge. */
  const CARVE = { r: 9, feather: 7, q: 4 };
  const carver = makeCarve(CARVE);
  const carve = () => carver(ctx, cv, field(), dpr);

  let frameN = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const ds = scrollY - S.scroll; S.scroll = scrollY;
    if (S.paused || document.hidden || (S.hidden && now - S.hidAt > 900)) { S.last = now; S.par += ds * PARALLAX; return; }
    if (now - S.last < 30) { S.par += ds * PARALLAX; step(0, ds * PARALLAX * dpr); return; }
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now; S.t += dt; frameN++;
    S.par += ds * PARALLAX;
    step(dt, ds * PARALLAX * dpr);
    if (resize() && S.key) { S.cur = bake(S.key); S.old = null; live.clear(); }
    if (!S.cur) return;
    S.fade = Math.min(1, S.fade + dt / 0.9);
    const e = S.fade * S.fade * (3 - 2 * S.fade);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
    if (S.old) paint(S.old, 1 - e, frameN);
    paint(S.cur, S.old ? e : 1, frameN);
    if (S.fade >= 1) S.old = null;
    carve();
    if (frameN % 60 === 0) for (const [k, c] of live) if (frameN - c.seen > 60) live.delete(k);
  }
  requestAnimationFrame(frame);

  const rebake = () => { if (S.key) { S.cur = bake(S.key); S.old = null; } };
  return {
    canvas: cv,
    /** which section's weave; crossfades from the one showing */
    set(key) {
      key = WEAVES[key] ? key : 'home';
      if (key === S.key) return;
      S.key = key; resize();
      S.old = S.cur; S.cur = bake(key); S.fade = S.old ? 0 : 1;
    },
    theme(dark) { if (dark === S.dark) return; S.dark = dark; cv.classList.toggle('light', !dark); rebake(); },
    accent(a) { S.acc = a; rebake(); },
    /** a jolt through the cloth, e.g. when Glorb bursts: every shape kicked a different way */
    kick(x, y, amt = 1) {
      for (const [k, c] of live) { const a = hash(k) * 6.28; c.vx += Math.cos(a) * 60 * amt * dpr; c.v += Math.sin(a) * 60 * amt * dpr; }
    },
    pause(p) { S.paused = !!p; },
    /** hide it (another backdrop is showing); it fades */
    visible(v) { if (S.hidden === !v) return; cv.classList.toggle('off', !v); S.hidden = !v; S.hidAt = performance.now(); },
    CARVE, LINE, MOTION,
    /** where the main band should run (CSS px from the top): behind Glorb's centre */
    anchor(y) { S.anchor = y; },
    WEAVES, MOTIFS,
  };
}

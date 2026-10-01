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

/* OUTLINES, NOT FILLS. Every motif is written as filled shapes (that is the
   easiest way to describe one), and this pen traces their edges instead: a
   polygon becomes its outline, a full-width band becomes the two lines along it
   (so no seams at the repeat), and ground fills disappear. Each line carries a
   soft glow of its own colour, baked once into the tile. */
function outlinePen(g, w, C, lw, glow) {
  let col = C.a;
  const ink = c => c === C.g ? C.a : c;
  const stroke = () => { g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = glow; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); };
  return {
    set fillStyle(v) { col = v; }, get fillStyle() { return col; },
    fillRect(x, y, ww, hh) {
      if (col === C.g) return;
      g.beginPath();
      if (ww >= w - 1) { g.moveTo(-2, y + lw / 2); g.lineTo(w + 2, y + lw / 2); g.moveTo(-2, y + hh - lw / 2); g.lineTo(w + 2, y + hh - lw / 2); }
      else g.rect(x, y, ww, hh);
      stroke();
    },
    beginPath: () => g.beginPath(), moveTo: (x, y) => g.moveTo(x, y), lineTo: (x, y) => g.lineTo(x, y),
    closePath: () => g.closePath(), arc: (...a) => g.arc(...a),
    fill() { col = ink(col); stroke(); },
    translate: (x, y) => g.translate(x, y), scale: (x, y) => g.scale(x, y),
  };
}

// smooth, cheap, deterministic noise: a few slow sines over space and time
const noise = (x, y, t) => (Math.sin(x * 0.011 + t * 0.21) + Math.sin(y * 0.017 - t * 0.16 + 1.3)
  + Math.sin((x + y) * 0.0072 + t * 0.12 + 2.1) + Math.sin((x - y * 0.6) * 0.0131 - t * 0.09)) / 4;
const hash = (k) => { let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return ((h >>> 0) % 10000) / 10000; };

/* THE MOTION. The weave is cut into CELLS -- every band's repeat sliced into
   squares about as wide as the band is tall -- and each one is its own little
   thing:
   - it TWINKLES: its brightness follows a slow noise field over the screen, so
     patches of the cloth fade up and down together like light moving over it;
   - where it is bright it comes FORWARD, a few percent larger;
   - it hangs on a SPRING: the cloth scrolls with the page at a fraction of its
     speed (parallax), and each cell is a little late to follow, with its own
     stiffness and a touch of random drift, so a scroll sends a ripple through
     it and it settles back into place -- Glorb's particles finding home. */
export function createWeave(host, field = () => null) {
  const cv = document.createElement('canvas');
  cv.className = 'weave'; host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const S = { key: null, dark: true, acc: { h: 352 }, cur: null, old: null, fade: 1, paused: false, t: 0, last: 0,
              scroll: scrollY, par: 0, anchor: null };
  const cells = new Map();
  const PARALLAX = 0.35;

  const unit = () => Math.max(34, Math.min(84, Math.min(innerWidth, innerHeight) * 0.14));

  function bake(key) {
    const W = WEAVES[key] || WEAVES.home, C = yarns(S.acc, W.h, S.dark), u = unit();
    let y = 0;
    const bands = W.bands.map(([m, hu, o = {}], i) => {
      const M = MOTIFS[m], h = Math.max(2, Math.round(hu * u * dpr)), w = Math.max(2, Math.round(M.per(h)));
      const empty = m === 'stripe' && o.col === 'g';
      const pad = Math.round(8 * dpr);                     // room for the glow above and below
      const tile = document.createElement('canvas'); tile.width = w; tile.height = h + 2 * pad;
      const g = tile.getContext('2d');
      g.translate(0, pad);
      if (o.flip) { g.translate(0, h); g.scale(1, -1); }
      M.draw(outlinePen(g, w, C, 1.4 * dpr, 6 * dpr), w, h, C, o);
      const n = Math.max(1, Math.round(w / Math.max(26 * dpr, Math.min(h, u * dpr * 1.1))));
      const b = { i, tile, y, h, w, n, sw: w / n, empty, pad };
      y += h; return b;
    });
    // the MAIN band is what sits behind Glorb, with open ground above and below it -- never the gap
    const main = bands[1] || bands[0];
    return { key, bands, H: y, mid: main.y + main.h / 2 };
  }

  function resize() {
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (cv.width === w && cv.height === h) return false;
    cv.width = w; cv.height = h; return true;
  }

  function cellOf(k) {
    let c = cells.get(k);
    if (!c) { const r = hash(k), r2 = hash(k + '*');
      c = { d: 0, v: 0, dx: 0, vx: 0, k: 26 + 40 * r, lag: 0.45 + 0.5 * r2, ph: r * 6.28, seen: 0 }; cells.set(k, c); }
    return c;
  }

  function step(dt, dScroll) {
    // every live cell: the scroll leaves it behind by its own share, the spring brings it home
    for (const c of cells.values()) {
      c.d -= dScroll * c.lag;
      c.v += (-c.k * c.d - 2 * Math.sqrt(c.k) * 0.55 * c.v) * dt; c.d += c.v * dt;
      c.vx += (-c.k * c.dx - 2 * Math.sqrt(c.k) * 0.55 * c.vx) * dt; c.dx += c.vx * dt;
      if (Math.random() < dt * 0.4) { c.vx += (Math.random() - 0.5) * 6 * dpr; c.v += (Math.random() - 0.5) * 6 * dpr; }
    }
  }

  function paint(wv, alpha, frame) {
    if (!wv || alpha <= 0.002) return;
    const par = S.par * dpr, cw = cv.width, ch = cv.height, t = S.t;
    for (const b of wv.bands) {
      if (b.empty) continue;
      // which repeats of the composition cover the screen, counted in absolute terms so a cell keeps its identity
      const ay = S.anchor != null ? S.anchor * dpr : ch * 0.5;   // Glorb's centre, when known
      const r0 = Math.floor((par - ay + wv.mid - b.y - b.h) / wv.H), r1 = Math.ceil((par + ch - ay + wv.mid - b.y) / wv.H);
      const x0 = ((cw / 2 - b.w / 2) % b.w + b.w) % b.w - b.w;       // a motif centred on the screen
      for (let r = r0; r <= r1; r++) {
        const yBase = ay - wv.mid + r * wv.H + b.y - par;
        if (yBase > ch + 40 || yBase + b.h < -40) continue;
        for (let p = 0, x = x0; x < cw + b.w; p++, x += b.w) {
          for (let s = 0; s < b.n; s++) {
            const c = cellOf(wv.key + ':' + b.i + ':' + r + ':' + p + ':' + s); c.seen = frame;
            const sx = x + s * b.sw, cx = sx + b.sw / 2, cy = yBase + b.h / 2;
            const n = noise(cx / dpr, (cy + par) / dpr, t) + 0.25 * Math.sin(t * 0.5 + c.ph);   // about -1..1
            const lit = Math.max(0, Math.min(1, 0.5 + n * 0.75));
            const k = 1 + 0.07 * lit;                                    // bright cells come forward
            ctx.globalAlpha = alpha * (0.32 + 0.68 * lit);
            const th = b.h + 2 * b.pad, w2 = b.sw * k, h2 = th * k;
            ctx.drawImage(b.tile, s * b.sw, 0, b.sw, th, cx - w2 / 2 + c.dx, cy - h2 / 2 + c.d, w2 + 0.6, h2);
          }
        }
      }
    }
  }

  /* THE BOOLEAN SUBTRACT. Wherever Glorb's particles are, the cloth is cut away,
     with a soft margin, so the pattern stops at his silhouette and parts around
     him as he moves. The particles are stamped into a quarter-size mask (cheap
     for thousands of dots) and scaling it back up is what softens the edge. */
  const mask = document.createElement('canvas'), mg = mask.getContext('2d');
  const CARVE = { r: 9, feather: 7, q: 4 };
  function carve() {
    const api = field(); if (!api) return;
    const q = CARVE.q, mw = Math.ceil(cv.width / q), mh = Math.ceil(cv.height / q);
    if (mask.width !== mw || mask.height !== mh) { mask.width = mw; mask.height = mh; }
    mg.clearRect(0, 0, mw, mh);
    const { px, py } = api.field, n = api.n, s = dpr / q;
    const TAU = Math.PI * 2;
    for (const [rad, a] of [[CARVE.r + CARVE.feather, 0.45], [CARVE.r, 1]]) {
      mg.globalAlpha = a; mg.fillStyle = '#fff'; mg.beginPath();
      const r = rad * s;
      for (let i = 0; i < n; i++) { const x = px[i] * s, y = py[i] * s; if (x < -r || y < -r || x > mw + r || y > mh + r) continue; mg.moveTo(x + r, y); mg.arc(x, y, r, 0, TAU); }
      mg.fill();
    }
    ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-out'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, 0, 0, cv.width, cv.height); ctx.restore();
  }

  let frameN = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const ds = scrollY - S.scroll; S.scroll = scrollY;
    if (S.paused || document.hidden) { S.last = now; S.par += ds * PARALLAX; return; }
    if (now - S.last < 30) { S.par += ds * PARALLAX; step(0, ds * PARALLAX * dpr); return; }
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now; S.t += dt; frameN++;
    S.par += ds * PARALLAX;
    step(dt, ds * PARALLAX * dpr);
    if (resize() && S.key) { S.cur = bake(S.key); S.old = null; cells.clear(); }
    if (!S.cur) return;
    S.fade = Math.min(1, S.fade + dt / 0.9);
    const e = S.fade * S.fade * (3 - 2 * S.fade);
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
    if (S.old) paint(S.old, 1 - e, frameN);
    paint(S.cur, S.old ? e : 1, frameN);
    if (S.fade >= 1) S.old = null;
    carve();
    if (frameN % 60 === 0) for (const [k, c] of cells) if (frameN - c.seen > 60) cells.delete(k);
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
    /** a jolt through the cloth, e.g. when Glorb bursts: every cell kicked outward from a point */
    kick(x, y, amt = 1) {
      for (const [k, c] of cells) { const a = hash(k) * 6.28; c.vx += Math.cos(a) * 60 * amt * dpr; c.v += Math.sin(a) * 60 * amt * dpr; }
    },
    pause(p) { S.paused = !!p; },
    CARVE,
    /** where the main band should run (CSS px from the top): behind Glorb's centre */
    anchor(y) { S.anchor = y; },
    WEAVES, MOTIFS,
  };
}

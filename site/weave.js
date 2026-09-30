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
// [motif, height in units, options]. Stacked top to bottom and repeated down the
// screen; `flip` mirrors a band vertically. Each section has its own weave and
// its own hue of earth: `h` is the OKLCH hue its yarns are dyed in.
const WEAVES = {
  home:      { h: 58, bands: [['arrows', 1], ['stripe', 0.55, { col: 'b' }], ['stripe', 0.07, { col: 'c' }], ['star', 3.4],
                                ['stripe', 0.07, { col: 'c' }], ['stripe', 0.55, { col: 'b' }], ['arrows', 1], ['stripe', 1.1, { col: 'g' }]] },
  play:      { h: 40, bands: [['hourglass', 1.1], ['stripe', 0.25, { col: 'c' }], ['zigzag', 1.6], ['stripe', 0.25, { col: 'c' }],
                                ['hourglass', 1.1, { flip: 1 }], ['stripe', 0.9, { col: 'g' }]] },
  assets:    { h: 75, bands: [['steps', 1.7], ['stitch', 0.35], ['chain', 1.2], ['stitch', 0.35], ['steps', 1.7, { flip: 1 }], ['stripe', 0.8, { col: 'g' }]] },
  scripts:   { h: 210, bands: [['chain', 0.8], ['stripe', 0.12, { col: 'c' }], ['zigzag', 1.2], ['stripe', 0.12, { col: 'c' }], ['chain', 0.8], ['stripe', 0.9, { col: 'g' }]] },
  web:       { h: 30, bands: [['arrows', 0.8], ['star', 2.6], ['arrows', 0.8], ['stripe', 0.9, { col: 'g' }]] },
  motion:    { h: 18, bands: [['zigzag', 1.5], ['stripe', 0.1, { col: 'c' }], ['zigzag', 1.5, { flip: 1 }], ['stripe', 0.8, { col: 'g' }]] },
  studios:   { h: 95, bands: [['steps', 1.4], ['hourglass', 0.8], ['steps', 1.4, { flip: 1 }], ['stripe', 0.8, { col: 'g' }]] },
  writing:   { h: 65, bands: [['stitch', 0.4], ['arrows', 0.9], ['stitch', 0.4], ['stripe', 1.4, { col: 'g' }]] },
  audio:     { h: 350, bands: [['hourglass', 0.8], ['chain', 1.3], ['hourglass', 0.8, { flip: 1 }], ['stripe', 0.9, { col: 'g' }]] },
  workbench: { h: 50, bands: [['arrows', 0.9], ['steps', 1.6], ['arrows', 0.9], ['stripe', 0.9, { col: 'g' }]] },
  about:     { h: 30, bands: [['star', 3.0], ['stripe', 0.4, { col: 'b' }], ['arrows', 1], ['stripe', 0.4, { col: 'b' }]] },
};

// the four yarns, dim enough to sit behind him: a lift of a few points off the page
function yarns(hue, dark) {
  const L = dark ? [0.165, 0.2, 0.235, 0.27] : [0.955, 0.925, 0.895, 0.87];
  const c = [0.004, 0.018, 0.028, 0.012];
  const [g, a, b, cc] = L.map((l, i) => oklchHex({ l, c: c[i], h: hue }));
  return { g, a, b, c: cc };
}

export function createWeave(host) {
  const cv = document.createElement('canvas');
  cv.className = 'weave'; host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const S = { key: null, dark: true, cur: null, old: null, fade: 1, paused: false, t: 0, last: 0 };

  function unit() { return Math.max(34, Math.min(88, Math.min(innerWidth, innerHeight) * 0.15)); }

  // bake one weave: every band into its own period-wide tile, made a pattern
  function bake(key) {
    const W = WEAVES[key] || WEAVES.home, C = yarns(W.h, S.dark), u = unit();
    let y = 0;
    const bands = W.bands.map(([m, hu, o = {}], i) => {
      const M = MOTIFS[m], h = Math.max(2, Math.round(hu * u * dpr)), w = Math.max(2, Math.round(M.per(h)));
      const tile = document.createElement('canvas'); tile.width = w; tile.height = h;
      const g = tile.getContext('2d');
      if (o.flip) { g.translate(0, h); g.scale(1, -1); }
      M.draw(g, w, h, C, o);
      const b = { pat: ctx.createPattern(tile, 'repeat'), y, h, w,
                  v: (i % 2 ? -1 : 1) * u * dpr * (0.1 + 0.05 * ((i * 7) % 3)),   // px/s, alternating
                  x0: Math.random() * w };
      y += h; return b;
    });
    return { key, bands, H: y, a: 0 };
  }

  function resize() {
    const w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    if (cv.width === w && cv.height === h) return false;
    cv.width = w; cv.height = h; return true;
  }

  function paint(wv, alpha) {
    if (!wv || alpha <= 0.002) return;
    ctx.globalAlpha = alpha;
    // the weave hangs from the middle of the screen, so the star of each lands near Glorb
    const off = ((cv.height / 2 - wv.H / 2) % wv.H + wv.H) % wv.H - wv.H;
    for (let top = off; top < cv.height; top += wv.H) {
      for (const b of wv.bands) {
        const y = top + b.y; if (y > cv.height || y + b.h < 0) continue;
        b.pat.setTransform(new DOMMatrix([1, 0, 0, 1, (b.x0 + b.v * S.t) % b.w, y]));
        ctx.fillStyle = b.pat; ctx.fillRect(0, y, cv.width, b.h + 0.5);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (S.paused || document.hidden) { S.last = now; return; }
    if (now - S.last < 30) return;                      // ~30 fps is plenty for cloth
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now; S.t += dt;
    if (resize() && S.key) { S.cur = bake(S.key); S.old = null; }
    if (!S.cur) return;
    S.fade = Math.min(1, S.fade + dt / 0.9);
    const e = S.fade * S.fade * (3 - 2 * S.fade);
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
    if (S.old) paint(S.old, 1 - e);
    paint(S.cur, S.old ? e : 1);
    if (S.fade >= 1) S.old = null;
  }
  requestAnimationFrame(frame);

  return {
    canvas: cv,
    /** which section's weave; crossfades from the one showing */
    set(key) {
      key = WEAVES[key] ? key : 'home';
      if (key === S.key) return;
      S.key = key; resize();
      S.old = S.cur; S.cur = bake(key); S.fade = S.old ? 0 : 1;
    },
    theme(dark) {
      if (dark === S.dark) return; S.dark = dark; cv.classList.toggle('light', !dark);
      if (S.key) { S.cur = bake(S.key); S.old = null; }
    },
    pause(p) { S.paused = !!p; },
    WEAVES, MOTIFS,
  };
}

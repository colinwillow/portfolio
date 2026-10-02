// THE MANDALA: Colin's sound-reactive p5 visualizer, as the backdrop behind Glorb.
//
// Ported line for line from Robits (`_mandalaStep`, itself a port of the p5 original):
// 12 spokes of 40 squares in two counter-rotating layers, plus a tunnel of rings at the
// middle. One CASCADE drives all of it -- rv[0] chases the music, each link eases toward the
// one before -- so a beat starts at the hub and ripples out along every spoke.
//
// THE MUSIC IS BAKED. A browser will not start audio, or even an AudioContext, before a tap,
// so a backdrop that waited for the analyser would sit still for everybody who never presses
// the sound key. `site/viz/yoga_pants.bin` is the exact number the analyser would have given
// (tools/vizbake.mjs), one per 1/60 s, so the mandala dances to Yoga Pants silently from the
// first frame -- and `clock` keeps the playhead, so pressing the sound key starts the real song
// at the very moment the picture is already at. When the song is really playing, `drive` hands
// in the live analyser and the bake steps aside.
//
// Same API as the weave (set/theme/accent/kick/pause/visible/anchor/canvas), so it drops into
// the same slot. It is drawn on a plain 2D canvas -- no three.js for a backdrop -- with the
// 'lighter' composite standing in for the original's additive GL lines.
import { makeCarve } from './weave.js?v=68b8ebba';

export const MANDALA = {
  // world units -> px: `4000 * size` units = half the SHORTER side, so the whole spread fits.
  // `?vizsize=1.4` in the address tries another size live (bigger number = bigger mandala).
  size: +new URLSearchParams(location.search).get('vizsize') || 1,
  spin: 0.06,       // rad/s of slow overall drift (Robits' menu value)
  alpha: 0.9,       // the original's line opacity
  carve: true,      // Glorb's particles cut the lines, the way they cut the weave
  bake: 'site/viz/yoga_pants.bin',
};

const NR = 40, SPK = 12, RLO = 6, RHI = 24, D2R = Math.PI / 180, DIST = 5, OVER = 50, BASE = 200, CS = 3, CAMZ = 4200;

// the playhead of the song the bake came from: free-running until the real song takes over
export const clock = {
  t0: performance.now(), dur: 0,
  get t() { const t = (performance.now() - this.t0) / 1000; return this.dur ? t % this.dur : t; },
  set(t) { this.t0 = performance.now() - t * 1000; },
};

export function createMandala(host, field = () => null) {
  const cv = document.createElement('canvas');
  cv.className = 'weave mandala'; host.appendChild(cv);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const carve = makeCarve({ r: 9, feather: 7, q: 4 });
  const S = { dark: true, paused: false, hidden: false, anchor: null, last: performance.now(), acc: 0, rot: 0, kick: 0, drive: null };
  const v = { rv: new Float32Array(NR), targetJump: 1, prevSum: 0, rotCounter: 0, frame: 0 };
  let baked = null;
  fetch(new URL(MANDALA.bake, document.baseURI)).then(r => r.arrayBuffer()).then(b => { baked = new Uint16Array(b); clock.dur = baked.length / 60; }).catch(() => {});

  function resize() {
    const r = host.getBoundingClientRect(), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  }

  // ---- one p5 frame of the cascade (Robits' _mandalaStep, audio half) ----
  function step(sum) {
    v.frame++;
    if (sum > 0) { const diff = Math.abs(sum - v.prevSum); v.prevSum = sum; v.targetJump = Math.max(diff / 1.5, (sum / 24) / 10) * 1.8; }
    else v.targetJump = 50 + Math.sin(v.frame * 0.2) * 40;   // nothing to listen to yet: the gentle idle pulse
    v.targetJump += S.kick; S.kick *= 0.9;
    const rv = v.rv;
    rv[0] = Math.abs(rv[0] + (v.targetJump - rv[0]) * 0.15);
    for (let j = 1; j < NR; j++) rv[j] = Math.abs(rv[j] + (rv[j - 1] - rv[j]) * 0.25);
    v.rotCounter++;
  }
  function level() {
    const live = S.drive?.();
    if (live != null) return live;
    if (!baked) return 0;
    return baked[Math.floor(clock.t * 60) % baked.length];
  }

  // ---- drawing: every square goes into a path per colour, stroked once ----
  const paths = new Map();
  const col = (r, g, b) => {
    // quantised so a few dozen strokes cover ~1100 squares
    const q = x => Math.round(Math.min(1, x) * 8) / 8, k = q(r) * 81 + q(g) * 9 + q(b);
    let p = paths.get(k); if (!p) { p = { r: q(r), g: q(g), b: q(b), pts: [] }; paths.set(k, p); }
    return p.pts;
  };
  function draw() {
    const W = cv.width, H = cv.height, api = field(), c = api?.centre;
    const cx = c?.x != null ? c.x * dpr : W / 2, cy = c?.y != null ? c.y * dpr : (S.anchor != null ? S.anchor * dpr : H / 2);
    const k = Math.min(W, H) / 2 / 4000 * MANDALA.size;
    const rot = S.rot, rc = Math.cos(rot), rs = Math.sin(rot);
    // world (x up, y up, z toward the camera) -> canvas: the group's drift, perspective, y flipped
    const P = (pts, x, y, z) => { const X = x * rc - y * rs, Y = x * rs + y * rc, f = CAMZ / (CAMZ - z) * k; pts.push(cx + X * f, cy - Y * f); };
    paths.forEach(p => p.pts.length = 0);
    const rv = v.rv;
    for (let layer = 0; layer < 2; layer++) {
      const reverse = layer === 1, rotSpeed = reverse ? -v.rotCounter * 0.3 : v.rotCounter * 0.5;
      for (let u = 0; u < SPK; u++) {
        const ang = (v.rotCounter / 3 + rotSpeed + 30 * u + 90) * D2R, ac = Math.cos(ang), as = Math.sin(ang);
        for (let i = 0; i < NR; i++) {
          const rvi = rv[i], lx = BASE + (reverse ? -rvi : rvi) * DIST + OVER * (i + 1), ly = OVER * (i + 1);
          const h = (reverse ? rv[NR - 1 - i] / 2 : rvi) * 0.5, zd = -i * 8 + rvi * 3;
          const g = Math.min(255, rvi * DIST / 3) / 255;
          const pts = i < 17 ? (i % 2 === 0 ? col(0, g, 1) : col(g, 0, 1)) : col(0, 0, 1);
          for (const [a, b] of [[-h, -h], [h, -h], [h, h], [-h, h]]) { const x = lx + a, y = ly + b; P(pts, x * ac - y * as, x * as + y * ac, zd); }
        }
      }
    }
    // the ring tunnel: Rz(phi) * Rx90 * Ry90 applied to (a, b, z) is (z cos - a sin, z sin + a cos, b)
    const phiBase = (v.rotCounter / 3 + v.frame / 4) * D2R, divs = [5, 6, 7, 8, 1, 3], rIdx = [0, 1, 2, 3, 4, 4];
    for (let i = RLO; i < RHI; i++) {
      const phi = phiBase + 20 * i * D2R, pc = Math.cos(phi), ps = Math.sin(phi), ric = Math.min(255, i) / 255;
      for (let e = 0; e < 6; e++) {
        const rvE = rv[rIdx[e]], h = (e === 4 ? 40 * CS : rvE / divs[e] * CS) * 0.5, z = -rvE * DIST;
        const g = Math.min(255, rvE * DIST / 3) / 255;
        const pts = e % 2 === 0 ? col(ric, g, 1) : col(g, ric, 1);
        for (const [a, b] of [[-h, -h], [h, -h], [h, h], [-h, h]]) P(pts, z * pc - a * ps, z * ps + a * pc, b);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = S.dark ? 'lighter' : 'source-over';
    ctx.lineWidth = dpr; ctx.globalAlpha = MANDALA.alpha * (S.dark ? 1 : 0.55);
    for (const p of paths.values()) {
      const pts = p.pts; if (!pts.length) continue;
      // light theme: the same hues, darkened, laid down as ink rather than light
      const m = S.dark ? 255 : 150;
      ctx.strokeStyle = `rgb(${Math.round(p.r * m)},${Math.round(p.g * m)},${Math.round(p.b * m)})`;
      ctx.beginPath();
      for (let j = 0; j < pts.length; j += 8) {
        ctx.moveTo(pts[j], pts[j + 1]); ctx.lineTo(pts[j + 2], pts[j + 3]); ctx.lineTo(pts[j + 4], pts[j + 5]); ctx.lineTo(pts[j + 6], pts[j + 7]); ctx.closePath();
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (MANDALA.carve) carve(ctx, cv, api, dpr);
  }

  (function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now;
    if (S.paused || (S.hidden && now - S.hidAt > 800)) return;
    resize();
    // the p5 original stepped once per frame at 60: keep that rate whatever the screen runs at
    S.acc = Math.min(S.acc + dt, 4 / 60);
    while (S.acc >= 1 / 60) { S.acc -= 1 / 60; step(level()); }
    S.rot += dt * MANDALA.spin;
    draw();
  })(performance.now());

  return {
    canvas: cv,
    set() {},                                  // one mandala for every section
    theme(dark) { S.dark = dark; cv.classList.toggle('light', !dark); },
    accent() {},
    kick(x, y, amt = 1) { S.kick += 60 * amt; },
    pause(p) { S.paused = !!p; },
    visible(on) { if (S.hidden === !on) return; cv.classList.toggle('off', !on); S.hidden = !on; S.hidAt = performance.now(); },
    anchor(y) { S.anchor = y; },
    /** live analyser sum (bins 6..29 of a 256 FFT), or null to fall back on the bake */
    drive(fn) { S.drive = fn; },
    MANDALA, clock, v,
  };
}

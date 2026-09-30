// The way in -- and it is GLORB. There are no intro particles any more: the
// field you see on the landing page is his, running his own physics, and the
// strands it weaves round the logo are a formation whose targets move every
// frame. Ported from the old portal page (p5): twelve strands -- lissajous
// figures, rose curves, torus knots, each breathing at its own rate.
//
// Enter releases the formation. Nothing fades and nothing is swapped: the same
// particles let go of the strands and fall home into his ring by his own
// physics, while the frame he lives in shrinks from the whole screen down to
// the top of the home page. If Colin's rig has loaded he walks through first,
// and the particles are shoved out of his way.
//
// Shown once per session on the home page (`?intro` forces it, `?nointro` skips).

const DEF = [
  { la: 3, lb: 2, A: 120, B: 110 }, { la: 5, lb: 4, A: 130, B: 100 }, { la: 4, lb: 3, A: 110, B: 120 }, { la: 5, lb: 3, A: 120, B: 120 },
  { k: 3, R: 120 }, { k: 5, R: 110 }, { k: 4, R: 130 }, { k: 7, R: 100 },
  { p: 2, q: 3, R: 90 }, { p: 3, q: 5, R: 100 }, { p: 4, q: 7, R: 85 }, { p: 5, q: 3, R: 95 },
];
const SPD = [6, 5, 7, 4, 5, 6, 4, 7, 5, 4, 6, 5].map(x => x * 1e-4 * 60);   // radians of strand a second

export function playIntro({ glorb, host, role = '', onRelease = () => {} }) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.id = 'intro';
    const logo = document.querySelector('#hud .logo');
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    el.innerHTML = `<div class="intro-word">${logo ? logo.outerHTML : '<b>COLIN</b> WILLOW'}</div>
      ${role ? `<p class="intro-role">${esc(role)}</p>` : ''}
      <button class="intro-enter">Enter</button>`;
    document.body.appendChild(el);
    document.body.classList.add('intro-on');
    glorb.resize();

    const me = { ok: false, on: false, cv: Object.assign(document.createElement('canvas'), { className: 'intro-me' }) };
    document.body.appendChild(me.cv);
    import('./intro-me.js?v=02ba95bb').then(m => m.mountMe(me.cv)).then(api => { if (api) { me.api = api; me.ok = true; } }).catch(() => {});

    // one strand and one phase per particle, fixed by index
    const n = glorb.n, strand = new Uint8Array(n), tt = new Float32Array(n), spd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      strand[i] = (Math.random() * 12) | 0; tt[i] = Math.random() * Math.PI * 12;
      spd[i] = SPD[strand[i]] * (0.8 + Math.random() * 0.4);
    }
    const word = el.querySelector('.intro-word');
    let fc = 0, last = performance.now(), dead = false, walking = false, released = false;
    const out = [0, 0];
    function target(i, W, H, cx, cy) {
      const s = strand[i], sd = DEF[s], si = s + 1, sc = Math.min(W, H) / 250;   // wide enough to weave round the logo, not onto it
      const pulse = Math.sin(fc * 0.0008 * si + si) * si * 8 * sc, pulse2 = Math.cos(fc * 0.0006 * si + si * 0.7) * si * 6 * sc;
      const t = tt[i];
      if (s < 4) {
        const A = sd.A * sc + pulse, B = sd.B * sc + pulse2;
        const xt = A * Math.sin(sd.la * t + Math.sin(fc * 3e-4) * 0.4), yt = B * Math.sin(sd.lb * t + Math.PI / 4), r = fc * 2e-4 * si;
        out[0] = cx + xt * Math.cos(r) - yt * Math.sin(r); out[1] = cy + xt * Math.sin(r) + yt * Math.cos(r);
      } else if (s < 8) {
        const r = (sd.R * sc + pulse) * Math.cos(sd.k * t + fc * 1e-4 * si), rot = fc * 1.5e-4 * si;
        out[0] = cx + Math.cos(t + rot) * r * 1.35; out[1] = cy + Math.sin(t + rot) * r;
      } else {
        const r1 = sd.R * sc + pulse, r2 = sd.R * sc * 0.38 + pulse2 * 0.3, phi = t * sd.q + fc * 1e-4 * si, psi = t * sd.p;
        out[0] = cx + (r1 + r2 * Math.cos(psi)) * Math.cos(phi) * 1.35; out[1] = cy + (r1 + r2 * Math.cos(psi)) * Math.sin(phi);
      }
      // the strands part round the logo, the way the old portal kept off the name
      const wr = word.getBoundingClientRect();
      const rx = wr.width / 2 + 16, ry = wr.height / 2 + 26, wx = wr.left + wr.width / 2, wy = wr.top + wr.height / 2;
      const dx = (out[0] - wx) / rx, dy = (out[1] - wy) / ry, d = Math.hypot(dx, dy);
      if (d < 1 && d > 1e-3) { out[0] = wx + dx / d * rx; out[1] = wy + dy / d * ry; }
    }

    // take the whole field into the strands
    const { px, py } = glorb.field;
    const pts = []; for (let i = 0; i < n; i++) pts.push([0, 0]);
    glorb.setFormation({ points: pts, share: 1, wide: 1, fs: 0.5 }, 3600);

    function frame(now) {
      if (dead) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; fc += dt * 60;
      const { x: cx, y: cy, scale } = glorb.centre, k = scale * glorb.formS;
      const W = innerWidth, H = innerHeight, { formX, formY, vx, vy } = glorb.field;
      if (!released) for (let i = 0; i < n; i++) {
        tt[i] += spd[i] * dt; target(i, W, H, cx, cy);
        formX[i] = (out[0] - cx) / k; formY[i] = (out[1] - cy) / k;
      }
      // his body shoves them aside as he walks through
      if (me.on) {
        for (const b of me.api.body()) for (let i = 0; i < n; i++) {
          const dx = px[i] - b.x, dy = py[i] - b.y, d = Math.hypot(dx, dy);
          if (d < b.r && d > 0.1) { const p = (1 - d / b.r) * 2.2; vx[i] += dx / d * p; vy[i] += dy / d * p; }
        }
        if (walking && me.api.progress() > 0.42) { walking = false; release(); }
        if (!me.api.progress || me.api.progress() >= 1) me.on = false;
      }
    }
    requestAnimationFrame(frame);

    function release() {
      if (released) return;
      released = true;
      glorb.goHome('');                               // the same particles, home to the ring
      el.classList.add('out');
      document.body.classList.remove('intro-on');     // and his frame shrinks to the top of the page
      onRelease();
      setTimeout(() => { el.remove(); removeEventListener('keydown', key); removeEventListener('pointerup', tap, true); }, 900);
      setTimeout(() => { dead = true; if (!me.on) { me.api?.dispose(); me.cv.remove(); } }, 6000);
    }
    let armed = false;
    function enter() {
      if (armed) return; armed = true;
      try { sessionStorage.setItem('cw.intro', '1'); } catch {}
      resolve('entered');
      if (me.ok) { walking = true; me.on = true; me.api.start(innerWidth, innerHeight); el.classList.add('walk'); }
      else release();
    }
    const key = e => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') enter(); };
    // a tap anywhere is Enter; a drag is you playing with him
    let down = null;
    const tap = e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 450) enter(); down = null; };
    addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { capture: true });
    addEventListener('pointerup', tap, true);
    addEventListener('keydown', key);
    el.querySelector('.intro-enter').addEventListener('click', enter);
  });
}

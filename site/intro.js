// The way in. Ported from the old portal landing page (p5): particles steer
// along twelve strands -- lissajous figures, rose curves and torus knots, each
// breathing at its own rate -- round the name, flee your finger, and on a tap
// blow outward like a door opening, leaving the globe behind them.
//
// Rewritten without p5: typed arrays and one 2D canvas, no per-frame
// allocation, so it holds its frame rate on a phone. Shown once per session
// on the home page (`?intro` forces it, `?nointro` skips it).
//
// The particles are GLORB'S particles. The portal looks and moves exactly as
// it always did -- small violet and green dots steering along the strands and
// colliding with the logo -- and on the tap each dot flies to one of HIS real
// particles, resting in the top of the page underneath, and lands on it: green
// dots onto his green core, violet ones onto his ring, growing to his size on
// the way. At the moment they land every one of his particles is gathered onto
// the dot it belongs to, so when this canvas lets go the field underneath is
// in exactly the place the dots were, and it opens out into Glorb from there.
// One field; nothing fades out while something else fades in somewhere else.

export function playIntro({ role = '', bg = '#f3f2ef', rim = '#9a1cf0', core = '#72ec5c', glorb = null } = {}) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.id = 'intro';
    const logo = document.querySelector('#hud .logo');
    el.innerHTML = `<canvas></canvas><div class="intro-word">${logo ? logo.outerHTML : '<b>COLIN</b> WILLOW'}</div>
      ${role ? `<p class="intro-role">${role.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</p>` : ''}
      <button class="intro-enter">Enter</button>`;
    /* HIM. While the portal runs, his rig loads in the background; on Enter he
       walks in from the left, straight through the particles -- they part
       around his body as he goes -- and it is as he passes that they start
       for Glorb. If he has not loaded by the tap, the transition simply goes
       without him. The shape he pushes is his real silhouette: hips, chest and
       head projected every frame, so an arm swing is what shoves them. */
    const me = { ok: false, on: false, cv: Object.assign(document.createElement('canvas'), { className: 'intro-me' }) };
    document.body.appendChild(me.cv);   // outside the intro: he keeps walking after it has faded
    import('./intro-me.js?v=6b9b1d62').then(m => m.mountMe(me.cv)).then(api => { if (api) { me.api = api; me.ok = true; } }).catch(() => {});
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d'), g0 = g;
    /* Depth: a third of the dots are drawn on a layer ABOVE him, so he walks
       through the field rather than in front of it. */
    const cvF = Object.assign(document.createElement('canvas'), { className: 'intro-front' }), gF = cvF.getContext('2d');
    document.body.appendChild(cvF);
    const word = el.querySelector('.intro-word');
    let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { W = innerWidth; H = innerHeight; cv.width = cvF.width = W * dpr; cv.height = cvF.height = H * dpr; };
    size(); addEventListener('resize', size);

    const N = W * H > 700000 ? 1600 : 800;
    const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const strand = new Uint8Array(N), tt = new Float32Array(N), spd = new Float32Array(N),
          maxV = new Float32Array(N), maxF = new Float32Array(N), rad = new Float32Array(N), hot = new Uint8Array(N);
    const knock = new Float32Array(N);
    const front = new Uint8Array(N); for (let i = 0; i < N; i++) front[i] = Math.random() < 0.34 ? 1 : 0;             // 1 just after he hit it, easing back to 0
    const DEF = [
      { la: 3, lb: 2, A: 120, B: 110 }, { la: 5, lb: 4, A: 130, B: 100 }, { la: 4, lb: 3, A: 110, B: 120 }, { la: 5, lb: 3, A: 120, B: 120 },
      { k: 3, R: 120 }, { k: 5, R: 110 }, { k: 4, R: 130 }, { k: 7, R: 100 },
      { p: 2, q: 3, R: 90 }, { p: 3, q: 5, R: 100 }, { p: 4, q: 7, R: 85 }, { p: 5, q: 3, R: 95 },
    ];
    const SPD = [6, 5, 7, 4, 5, 6, 4, 7, 5, 4, 6, 5].map(x => x * 1e-4);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * Math.min(W, H) * 0.45;
      px[i] = W / 2 + Math.cos(a) * d; py[i] = H / 2 + Math.sin(a) * d;
      strand[i] = (Math.random() * 12) | 0; tt[i] = Math.random() * Math.PI * 12;
      spd[i] = SPD[strand[i]] * (0.8 + Math.random() * 0.4) * 60;   // per second, not per frame
      maxV[i] = 14 + Math.random() * 8; maxF[i] = 0.25 + Math.random() * 0.3; rad[i] = 0.8 + Math.random() * 1.2;
      hot[i] = Math.random() < 0.3 ? 1 : 0;       // 1 = one of his core (green), 0 = his rim (violet)
    }

    let mx = -1e4, my = -1e4, fc = 0, blown = 0, done = false, last = performance.now();
    const move = e => { mx = e.clientX; my = e.clientY; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { mx = my = -1e4; });

    function target(i, out) {
      const s = strand[i], sd = DEF[s], si = s + 1, cx = W / 2, cy = H / 2;
      const sc = Math.min(W, H) / 700;
      const pulse = Math.sin(fc * 0.0008 * si + si) * si * 8 * sc, pulse2 = Math.cos(fc * 0.0006 * si + si * 0.7) * si * 6 * sc;
      const t = tt[i];
      if (s < 4) {
        const A = sd.A * sc + pulse, B = sd.B * sc + pulse2;
        const xt = A * Math.sin(sd.la * t + Math.sin(fc * 3e-4) * 0.4), yt = B * Math.sin(sd.lb * t + Math.PI / 4);
        const r = fc * 2e-4 * si;
        out[0] = cx + xt * Math.cos(r) - yt * Math.sin(r); out[1] = cy + xt * Math.sin(r) + yt * Math.cos(r);
      } else if (s < 8) {
        const r = (sd.R * sc + pulse) * Math.cos(sd.k * t + fc * 1e-4 * si), rot = fc * 1.5e-4 * si;
        out[0] = cx + Math.cos(t + rot) * r * 1.35; out[1] = cy + Math.sin(t + rot) * r;
      } else {
        const r1 = sd.R * sc + pulse, r2 = sd.R * sc * 0.38 + pulse2 * 0.3, phi = t * sd.q + fc * 1e-4 * si, psi = t * sd.p;
        out[0] = cx + (r1 + r2 * Math.cos(psi)) * Math.cos(phi) * 1.35; out[1] = cy + (r1 + r2 * Math.cos(psi)) * Math.sin(phi);
      }
    }

    const tgt = [0, 0];
    function frame(now) {
      if (done) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000), k = dt * 60; last = now; fc += k;
      if (me.on) {
        // he has reached the logo: the particles leave for Glorb, he keeps walking
        if (walking && me.api.progress() > 0.8) { walking = false; converge(); }   // he has walked through them; now they go
      }
      const wr = word.getBoundingClientRect(), rx = wr.width / 2 + 10, ry = wr.height / 2 + 8, wx = wr.left + wr.width / 2, wy = wr.top + wr.height / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        if (blown && G) {
          // onto HIS particle, wherever it is this frame: a curved flight that
          // swirls the way he turns and ends exactly on it
          const u = Math.min(1, blown / FLY), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
          const j = gi[i], ox = G.f.px[j], oy = G.f.py[j] + G.top;
          const a0 = Math.atan2(sy0[i] - oy, sx0[i] - ox), r0 = Math.hypot(sx0[i] - ox, sy0[i] - oy);
          const a = a0 + (1 - e) * 1.6 * ((i & 1) ? 1 : -1) * e, rr = r0 * (1 - e);
          const tx = ox + Math.cos(a) * rr, ty = oy + Math.sin(a) * rr;
          vx[i] = (tx - px[i]) / Math.max(k, 1e-3); vy[i] = (ty - py[i]) / Math.max(k, 1e-3);
        } else if (blown) {
          // no Glorb to go to: the old door opening
          const dx = px[i] - W / 2, dy = py[i] - H / 2, d = Math.hypot(dx, dy) || 1;
          vx[i] += dx / d * 2.2 * k; vy[i] += dy / d * 2.2 * k;
          vx[i] *= Math.pow(1.04, k); vy[i] *= Math.pow(1.04, k);
        } else {
          tt[i] += spd[i] * dt; target(i, tgt);
          let dx = tgt[0] - px[i], dy = tgt[1] - py[i];
          const d = Math.hypot(dx, dy) || 1, v = d < 60 ? maxV[i] * d / 60 : maxV[i];
          let sx = dx / d * v - vx[i], sy = dy / d * v - vy[i];
          const sm = Math.hypot(sx, sy); if (sm > maxF[i]) { sx *= maxF[i] / sm; sy *= maxF[i] / sm; }
          let ax = sx, ay = sy;
          // keep off the name
          const nx = Math.max(wx - rx, Math.min(px[i], wx + rx)), ny = Math.max(wy - ry, Math.min(py[i], wy + ry));
          const ex = px[i] - nx, ey = py[i] - ny, ed = Math.hypot(ex, ey);
          if (ed < 0.5) { const ox = px[i] - wx || 0.1, oy = py[i] - wy, om = Math.hypot(ox, oy); ax += ox / om * maxF[i] * 14; ay += oy / om * maxF[i] * 14; }
          else if (ed < 14) { ax += ex / ed * maxF[i] * 3.5 * (1 - ed / 14); ay += ey / ed * maxF[i] * 3.5 * (1 - ed / 14); }

          // flee the finger
          const fx = px[i] - mx, fy = py[i] - my, fd = Math.hypot(fx, fy);
          if (fd < 90 && fd > 0) { const p = maxF[i] * 6 * (1 - fd / 90); ax += fx / fd * p; ay += fy / fd * p; }
          // just knocked: the strand's pull comes back gently rather than at once
          const back = 1 - 0.85 * knock[i];
          vx[i] = (vx[i] + ax * back * k) * Math.pow(0.95, k); vy[i] = (vy[i] + ay * back * k) * Math.pow(0.95, k);
          knock[i] *= Math.pow(0.975, k);
          /* HIM, AS AIR SEES A CAR. In his own frame the air rushes backwards
             past him; near his body that stream is bent to run ALONG his
             surface (the part heading into him is removed, the rest kept).
             Back in the world that means: at his chest they are pushed ahead a
             little and slide up or down, over his head and under his feet they
             hardly move while he passes, and behind him they fill back in. They
             are not carried off with him, and the strand pulls them home after. */
          if (me.on) {
            const hit = me.api.hit(px[i], py[i]);
            if (hit && hit.d > 0.12) {
              // only what he is walking INTO is touched: nothing is dragged along in his wake
              const rvx = vx[i] - hit.vx, rvy = vy[i];
              const vn = rvx * hit.nx + rvy * hit.ny;
              const w = Math.min(1, (hit.d - 0.12) * 2.2);
              if (vn < 0) {
                vx[i] -= vn * hit.nx * w; vy[i] -= vn * hit.ny * w;        // it cannot go into him...
                // ...so it slides round him instead: over the top above his middle, under below it
                let tx = -hit.ny, ty = hit.nx;                            // along his surface...
                const up = hit.ny < 0.15;                                  // ...upward above his middle, downward below
                if ((up && ty > 0) || (!up && ty < 0)) { tx = -tx; ty = -ty; }
                vx[i] += tx * -vn * 0.9 * w; vy[i] += ty * -vn * 0.9 * w;
              }
              if (hit.d > 0.5) { const push = (hit.d - 0.5) * 6; px[i] += hit.nx * push; py[i] += hit.ny * push; }
              knock[i] = Math.max(knock[i], w);
            }
          }
        }
        px[i] += vx[i] * k; py[i] += vy[i] * k;
      }
      // two passes, one fill each: neutral dots, then the accent ones on top
      // round dots, as he draws them; they grow to his size as they arrive
      const grow = blown && G ? Math.min(1, blown / FLY) : 0;
      gF.setTransform(dpr, 0, 0, dpr, 0, 0); gF.clearRect(0, 0, W, H);
      for (const L of [0, 1]) for (const h of [0, 1]) {
        const g = L ? gF : g0;
        g.fillStyle = h ? core : rim;
        g.globalAlpha = blown && !G ? Math.max(0, 1 - blown * 1.4) : h ? 0.9 : 0.75;
        g.beginPath();
        for (let i = 0; i < N; i++) {
          if (hot[i] !== h || front[i] !== L) continue;
          const s0 = rad[i] * (1 + Math.min(4, Math.hypot(vx[i], vy[i]) * 0.04)) * 1.3;
          const s = s0 + (gz[i] - s0) * grow * grow;
          g.moveTo(px[i] + s, py[i]); g.arc(px[i], py[i], s, 0, 6.2832);
        }
        g.fill();
      }
      g.globalAlpha = 1;
      if (blown) {
        blown += dt;
        if (G && !G.landed && blown >= FLY) land();
        if (G) { const f = (blown - FLY) / 0.45; el.style.opacity = cvF.style.opacity = String(Math.max(0, Math.min(1, 1 - f))); if (f >= 1) finish(); }
        else { el.style.opacity = cvF.style.opacity = String(Math.max(0, 1 - blown * 1.3)); if (blown > 0.85) finish(); }
      }
    }
    requestAnimationFrame(frame);

    /* Where he is: the rest geometry measured off his own screenshots at a
       390 px wide frame -- ring about 0.19-0.30 of the frame's short side,
       core about 0.05-0.09, violet dots bigger than green ones. */
    const FLY = 1.15;
    const sx0 = new Float32Array(N), sy0 = new Float32Array(N), gi = new Int32Array(N), gz = new Float32Array(N);
    let G = null, walking = false;
    function enter() {
      if (blown || walking) return;
      if (me.ok) {                         // he walks through first
        walking = true; me.on = true; me.api.start(W, H);
        el.classList.add('walk');
        resolve('entered');
        return;
      }
      converge();
      resolve('entered');
    }
    /* Which of his particles each dot belongs to. Green dots take his core and
       violet dots his ring, spread evenly through each so every part of him is
       spoken for -- then every one of HIS particles is assigned to a dot too,
       which is what lets all of them be standing on the dots at the handover. */
    function converge() {
      const gb = typeof glorb === 'function' ? glorb() : glorb;   // he may still be loading; then the old door opens
      if (gb) {
        const n = gb.n, f = gb.field, isCore = i => f.pr[i] < gb.core;
        const cores = [], rims = [];
        for (let i = 0; i < n; i++) (isCore(i) ? cores : rims).push(i);
        const hots = [], colds = [];
        for (let i = 0; i < N; i++) (hot[i] ? hots : colds).push(i);
        // too many green dots for his core (or the other way): the spares take the other kind
        const share = (dots, pool, other) => dots.forEach((d, k) => {
          const src = pool.length ? pool : other; gi[d] = src[Math.floor(k * src.length / dots.length)];
        });
        share(hots, cores, rims); share(colds, rims, cores);
        // his particles, each to a dot of its own colour
        const owner = new Int32Array(n);
        const give = (pool, dots, other) => pool.forEach((p, k) => {
          const src = dots.length ? dots : other; owner[p] = src[Math.floor(k * src.length / pool.length)];
        });
        give(cores, hots, colds); give(rims, colds, hots);
        const r = document.getElementById('glorb').getBoundingClientRect();
        G = { f, n, owner, top: r.top, left: r.left, k: gb.centre.scale / 390, landed: false };
        for (let i = 0; i < N; i++) {
          sx0[i] = px[i]; sy0[i] = py[i];
          // his dot sizes at rest, measured off his own frames: violet bigger than green
          gz[i] = (isCore(gi[i]) ? 2.2 + Math.random() * 2 : 3.5 + Math.random() * 4.5) * G.k;
        }
      }
      blown = 0.0001; el.classList.add('out');
    }
    /* The handover. Every one of his particles is put on the dot it belongs to,
       carrying that dot's motion, so the field underneath is exactly the
       picture on top at the instant this canvas starts to let go -- and his own
       physics opens it back out into Glorb from there. */
    function land() {
      G.landed = true;
      const f = G.f;
      for (let j = 0; j < G.n; j++) {
        const d = G.owner[j];
        f.px[j] = px[d] - G.left + (Math.random() - 0.5) * 2; f.py[j] = py[d] - G.top + (Math.random() - 0.5) * 2;
        f.vx[j] = 0; f.vy[j] = 0;          // landed means at rest on the dot, not still flying
      }
    }
    function finish() { done = true; if (!me.on) { me.api?.dispose(); me.cv.remove(); } removeEventListener('resize', size); removeEventListener('keydown', key); el.remove(); cvF.remove(); }
    const key = e => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') enter(); };
    addEventListener('keydown', key);
    el.addEventListener('click', enter);
    el.style.setProperty('--bg', bg);
    el.style.background = bg;
  });
}

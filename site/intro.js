// The way in. Ported from the old portal landing page (p5): particles steer
// along twelve strands -- lissajous figures, rose curves and torus knots, each
// breathing at its own rate -- round the name, flee your finger, and on a tap
// blow outward like a door opening, leaving the globe behind them.
//
// Rewritten without p5: typed arrays and one 2D canvas, no per-frame
// allocation, so it holds its frame rate on a phone. Shown once per session
// on the home page (`?intro` forces it, `?nointro` skips it).

export function playIntro({ accent = '#b07a8f', ink = '#151515', bg = '#f3f2ef' } = {}) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.id = 'intro';
    el.innerHTML = `<canvas></canvas><div class="intro-word"><b>COLIN</b> WILLOW</div>
      <button class="intro-enter">Enter</button>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas'), g = cv.getContext('2d');
    const word = el.querySelector('.intro-word');
    let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
    size(); addEventListener('resize', size);

    const N = W * H > 700000 ? 1600 : 800;
    const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const strand = new Uint8Array(N), tt = new Float32Array(N), spd = new Float32Array(N),
          maxV = new Float32Array(N), maxF = new Float32Array(N), rad = new Float32Array(N), hot = new Uint8Array(N);
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
      hot[i] = Math.random() < 0.14 ? 1 : 0;
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
      const wr = word.getBoundingClientRect(), rx = wr.width / 2 + 10, ry = wr.height / 2 + 8, wx = wr.left + wr.width / 2, wy = wr.top + wr.height / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        if (blown) {
          // the door opening: everything accelerates straight out from the middle
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
          vx[i] = (vx[i] + ax * k) * Math.pow(0.95, k); vy[i] = (vy[i] + ay * k) * Math.pow(0.95, k);
        }
        px[i] += vx[i] * k; py[i] += vy[i] * k;
      }
      // two passes, one fill each: neutral dots, then the accent ones on top
      for (const h of [0, 1]) {
        g.fillStyle = h ? accent : ink;
        g.globalAlpha = blown ? Math.max(0, 1 - blown * 1.4) : h ? 0.95 : 0.55;
        g.beginPath();
        for (let i = 0; i < N; i++) {
          if (hot[i] !== h) continue;
          const s = rad[i] * (1 + Math.hypot(vx[i], vy[i]) * 0.06);
          g.rect(px[i] - s, py[i] - s, s * 2, s * 2);
        }
        g.fill();
      }
      g.globalAlpha = 1;
      if (blown) {
        blown += dt;
        el.style.opacity = String(Math.max(0, 1 - blown * 1.3));
        if (blown > 0.85) finish();
      }
    }
    requestAnimationFrame(frame);

    function enter() {
      if (blown) return;
      blown = 0.0001; el.classList.add('out');
      resolve('entered');                // the globe starts its swell while the door is still opening
    }
    function finish() { done = true; removeEventListener('resize', size); removeEventListener('keydown', key); el.remove(); }
    const key = e => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') enter(); };
    addEventListener('keydown', key);
    el.addEventListener('click', enter);
    el.style.setProperty('--bg', bg);
  });
}

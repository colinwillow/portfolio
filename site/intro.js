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

export function playIntro({ build = '', role = '', bg = '#f3e4c6', rim = '#9a1cf0', core = '#72ec5c', glorb = null, dotK = 1 } = {}) {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.id = 'intro';
    const DEPTH = !/[?&]walk=side/.test(location.search);
    if (DEPTH) el.classList.add('depth');   // he walks out from behind the name, so it sits higher
    const logo = document.querySelector('#hud .logo');
    el.innerHTML = `<canvas></canvas><div class="intro-word">${logo ? logo.outerHTML : '<b>COLIN</b> WILLOW'}</div>
      ${role ? `<p class="intro-role">${role.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</p>` : ''}
      <button class="intro-enter">Enter</button>
      ${build ? `<span class="intro-build">build ${String(build).replace(/[^\w.-]/g, '')}</span>` : ''}`;
    /* HIM. While the portal runs, his rig loads in the background; on Enter he
       walks in from the left, straight through the particles -- they part
       around his body as he goes -- and it is as he passes that they start
       for Glorb. If he has not loaded by the tap, the transition simply goes
       without him. The shape he pushes is his real silhouette: hips, chest and
       head projected every frame, so an arm swing is what shoves them. */
    const me = { ok: false, on: false, cv: Object.assign(document.createElement('canvas'), { className: 'intro-me' }) };
    document.body.appendChild(me.cv);   // outside the intro: he keeps walking after it has faded
    import('./intro-me.js?v=63d10145').then(m => m.mountMe(me.cv, { bg, mode: DEPTH ? 'depth' : 'side' })).then(api => { if (api) { me.api = api; me.ok = true; } }).catch(() => {});
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

    // where the field hangs before he comes: round the name (which in depth sits higher)
    const FC = { x: W / 2, y: H / 2 };
    { const r = el.querySelector('.intro-word')?.getBoundingClientRect(); if (r?.height) { FC.x = r.left + r.width / 2; FC.y = r.top + r.height / 2; } }
    const N = W * H > 700000 ? 1600 : 800;
    const px = new Float32Array(N), py = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    const strand = new Uint8Array(N), tt = new Float32Array(N), spd = new Float32Array(N),
          maxV = new Float32Array(N), maxF = new Float32Array(N), rad = new Float32Array(N), hot = new Uint8Array(N);
    const knock = new Float32Array(N), freed = new Float64Array(N), nearB = new Uint8Array(N);
    const front = new Uint8Array(N); for (let i = 0; i < N; i++) front[i] = Math.random() < 0.34 ? 1 : 0;             // 1 just after he hit it, easing back to 0
    const DEF = [
      { la: 3, lb: 2, A: 120, B: 110 }, { la: 5, lb: 4, A: 130, B: 100 }, { la: 4, lb: 3, A: 110, B: 120 }, { la: 5, lb: 3, A: 120, B: 120 },
      { k: 3, R: 120 }, { k: 5, R: 110 }, { k: 4, R: 130 }, { k: 7, R: 100 },
      { p: 2, q: 3, R: 90 }, { p: 3, q: 5, R: 100 }, { p: 4, q: 7, R: 85 }, { p: 5, q: 3, R: 95 },
    ];
    const SPD = [6, 5, 7, 4, 5, 6, 4, 7, 5, 4, 6, 5].map(x => x * 1e-4);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * Math.min(W, H) * 0.45;
      px[i] = FC.x + Math.cos(a) * d; py[i] = FC.y + Math.sin(a) * d;
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
      const s = strand[i], sd = DEF[s], si = s + 1, cx = FC.x + (FO.x - FC.x) * FO.k, cy = FC.y + (FO.y - FC.y) * FO.k;
      const gx0 = 1 + (GA.sx - 1) * FO.k, gy0 = 1 + (GA.sy - 1) * FO.k;   // GATHERED: squeezed into an upright oval his size
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
      out[0] = cx + (out[0] - cx) * gx0; out[1] = cy + (out[1] - cy) * gy0;
    }

    const tgt = [0, 0];
    /* Curl of a smooth potential (two octaves of drifting sines): divergence-free, so it
       moves dots along without bunching them all into one place or tearing them apart --
       which is what makes strands, the way a flow field does in X-Particles. */
    const cf = [0, 0];
    function curl(x, y, t) {
      const s = 1 / Math.min(W, H), e = 2;
      const P = (a, b) => Math.sin(a * s * 3.1 + t * 0.6) * Math.cos(b * s * 2.7 - t * 0.4)
                        + 0.45 * Math.sin(a * s * 8.3 - b * s * 6.1 + t * 1.1) + 0.25 * Math.cos(b * s * 14.9 + a * s * 3.3 - t * 1.7);
      cf[0] = (P(x, y + e) - P(x, y - e)) / (2 * e * s) * 0.6; cf[1] = -(P(x + e, y) - P(x - e, y)) / (2 * e * s) * 0.6;
      return cf;
    }
    function frame(now) {
      if (done) return;
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000), k = dt * 60; last = now; fc += k;
      if (me.on) {
        // he has reached the logo: the particles leave for Glorb, he keeps walking
        if (me.api.depth) {
          // he walks up out of the back: reaching the field, he bursts it forward, and a beat
          // later what he threw at you starts back round behind him for Glorb
          // he reaches the curtain of beads part-way in; they part round him, and a beat later
          // what he has pushed through wings out and curls back behind him for Glorb
          if (walking && !crossT && me.api.progress() > 0.25) { crossT = performance.now(); ch0 = me.api.chest(); }
          if (walking && crossT && me.api.progress() > 0.93) { walking = false; converge(); wings(); }
        } else if (walking && me.api.progress() > 0.8) { walking = false; converge(); }   // he has walked through them; now they go
      }
      const wr = word.getBoundingClientRect(), rx = wr.width / 2 + 10, ry = wr.height / 2 + 8, wx = wr.left + wr.width / 2, wy = wr.top + wr.height / 2;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      if (FO.on) FO.k += (1 - FO.k) * (1 - Math.pow(0.94, k));
      const Dr = G && G.gb.drawn;   // his last frame as drawn (absent on an older engine: the ring alone)
      for (let i = 0; i < N; i++) {
        if (blown && G) {
          /* Onto HIS particle -- without ever throwing away the motion it has.
             Whatever it was doing as it came off him (flung up, rolling over
             his shoulder) it goes on doing; what changes is a pull toward its
             place in Glorb that starts at nothing and firms up across the
             flight, with a drag that does the same. So the trajectories bend
             round into him rather than stopping and starting again, and only
             in the last fifth is the landing made exact. */
          // the approach is done by 70% of the flight; the rest is the spring settling, so every
          // dot is home (bouncing gently) by the handover rather than still on its way in
          const u = Math.max(0, Math.min(1, (blown - tD[i]) / (0.7 * FLY - tD[i])));
          /* Onto its own place in HIS ORB, not onto one of his live particles: on a phone
             those can still be drifting in from where he started (they came in as a clump
             from the right edge and dragged the whole flight with them). The place is his
             ring or his core round his live centre, turning slowly so it is alive. */
          const gc = G.gb.centre, a = tA[i] + blown * 0.35 * tS[i] * (1 - u), rr = tR[i] * gc.scale;
          let ox = G.left + gc.x + Math.cos(a) * rr, oy = G.top + gc.y + Math.sin(a) * rr * 1.22;
          /* ...and then onto THE particle itself, as he is drawing it. The ring above is only
             the way in (his particles may still be drifting home early on); across the second
             half of the approach the target slides onto the dot's own particle, so the place it
             settles is not near his picture, it IS his picture. */
          if (Dr && Dr.r[gi[i]] > 0) {
            const w = Math.max(0, Math.min(1, (u - 0.3) / 0.7)), ww = w * w * (3 - 2 * w);
            ox += (G.left + Dr.x[gi[i]] - ox) * ww; oy += (G.top + Dr.y[gi[i]] - oy) * ww;
          }
          /* HOME, BY STEERING -- the flow only BENDS the way. Each dot wants to head for its
             place; the curl-noise flow (two scales: big lazy eddies and small tight ones) tilts
             that heading, so neighbours braid into strands and clumps, strongest far out and gone
             by the end. As a FORCE of its own the flow carried dots down its streamlines and off
             the screen; as a tilt on a homeward heading it cannot take one anywhere but home.
             They come in still moving (never slowed to nothing), and the last stretch is a light
             UNDERDAMPED spring, each with its own damping: an overshoot, a swing back, a settle. */
          const dx = ox - px[i], dy = oy - py[i], dist = Math.hypot(dx, dy) || 1;
          if (blown < tD[i]) {                       // not yet called home: drift on with what it has
            vx[i] *= Math.pow(0.985, k); vy[i] *= Math.pow(0.985, k);
          } else if (u < 1) {
            const [fx, fy] = curl(px[i], py[i], blown), fm = Math.hypot(fx, fy) || 1, bend = 1.3 * (1 - u) * (1 - u) * tC[i];
            let hx = dx / dist + fx / fm * bend, hy = dy / dist + fy / fm * bend;
            if (wingS[i]) {   // BUTTERFLY: each side turns the opposite way round him, out and back in
              const cx0 = ch0.x - px[i], cy0 = ch0.y - py[i], cm = Math.hypot(cx0, cy0) || 1, wb = 1.1 * (1 - u) * (1 - u);
              hx += -cy0 / cm * wingS[i] * wb; hy += cx0 / cm * wingS[i] * wb;
            }
            const hm = Math.hypot(hx, hy) || 1;
            const want = Math.min(9, Math.max(2.4, dist * 0.07));
            const st = 1 - Math.pow(1 - (0.035 + 0.06 * u), k);
            vx[i] += (hx / hm * want - vx[i]) * st; vy[i] += (hy / hm * want - vy[i]) * st;
          } else {
            const ks = 0.03, c = 0.05 + 0.07 * tC[i];   // damping ratio about 0.3-0.5
            vx[i] += (dx * ks - vx[i] * c) * k; vy[i] += (dy * ks - vy[i] * c) * k;
          }
          const vm = Math.hypot(vx[i], vy[i]); if (vm > 12) { vx[i] *= 12 / vm; vy[i] *= 12 / vm; }
          // (no forced snap at the end: the handover copies where they are and how they move)
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
          // keep off the name -- while he walks through it too (that is what bunches them into
          // strands against him), and gone once he is past it, so the strands flowing back off
          // him do not pile into a box that is no longer there
          const nx = Math.max(wx - rx, Math.min(px[i], wx + rx)), ny = Math.max(wy - ry, Math.min(py[i], wy + ry));
          /* Walking toward you, the name's collider lets go AS THE NAME FADES (the same .35s
             delay and .5s fade the CSS gives the word), so the field falls in on him to be
             walked into, instead of holding a hole the shape of a word nobody can see. */
          const cs = !walking ? 1 : me.api.depth ? Math.max(0, Math.min(1, 1 - (now - walkT0 - rel[i]) / 260)) : me.api.progress() > 0.5 ? 0 : 1;
          const ex = px[i] - nx, ey = py[i] - ny, ed0 = Math.hypot(ex, ey), ed = cs <= 0 ? 1e9 : ed0;
          /* LET GO, AND LOSE THE BOX. Dots that were stacked against the name's edges when it
             let go would otherwise walk inward together in four straight rows -- the box drawn a
             second time. So each one released from the edge gets a small random shove, the
             strand's pull softens for a moment, and the same curl-noise flow the strands use
             later carries it, so the rows break into loose strands as they fall in. */
          if (walking && cs <= 0 && !freed[i]) {
            freed[i] = now;
            if (ed0 < 22) { nearB[i] = 1; const a = Math.random() * 6.283, m = 0.8 + Math.random() * 1.8; vx[i] += Math.cos(a) * m; vy[i] += Math.sin(a) * m; }
          }
          if (nearB[i] && freed[i]) {
            const q = 1 - (now - freed[i]) / 1500;
            if (q > 0) {
              knock[i] = Math.max(knock[i], 0.85 * q);
              const [fx, fy] = curl(px[i], py[i], now / 1000);
              ax += fx * 0.07 * q; ay += fy * 0.07 * q;
            } else nearB[i] = 0;
          }
          if (ed < 0.5) { const ox = px[i] - wx || 0.1, oy = py[i] - wy, om = Math.hypot(ox, oy); ax += ox / om * maxF[i] * 14 * cs; ay += oy / om * maxF[i] * 14 * cs; }
          else if (ed < 14) { ax += ex / ed * maxF[i] * 3.5 * (1 - ed / 14) * cs; ay += ey / ed * maxF[i] * 3.5 * (1 - ed / 14) * cs; }

          // flee the finger
          const fx = px[i] - mx, fy = py[i] - my, fd = Math.hypot(fx, fy);
          if (fd < 90 && fd > 0) { const p = maxF[i] * 6 * (1 - fd / 90); ax += fx / fd * p; ay += fy / fd * p; }
          // just knocked: the strand's pull comes back gently rather than at once
          const back = 1 - 0.85 * knock[i];
          const dr = hitT[i] ? 0.955 : 0.95;   // a dot rolling off him keeps going; the strands' drag is for the swarm
          vx[i] = (vx[i] + ax * back * k) * Math.pow(dr, k); vy[i] = (vy[i] + ay * back * k) * Math.pow(dr, k);
          if (!hitT[i]) knock[i] *= Math.pow(0.975, k);   // touched by him: the strand never takes it back
          /* HIM, AS AIR SEES A CAR. In his own frame the air rushes backwards
             past him; near his body that stream is bent to run ALONG his
             surface (the part heading into him is removed, the rest kept).
             Back in the world that means: at his chest they are pushed ahead a
             little and slide up or down, over his head and under his feet they
             hardly move while he passes, and behind him they fill back in. They
             are not carried off with him, and the strand pulls them home after. */
          /* AIR ROUND A BODY (walking toward you) -- the side walk's own idea, turned to face
             you. Nothing is thrown. Each dot sits at its own depth (pz) in the cloud; once he has
             walked that far, if it is inside his silhouette it is in the way, and the only force
             on it is his shape: a gradient (the shell -- a blurred copy of him, 1 in his middle,
             0 just outside) that carries it to his NEAREST EDGE, faster the deeper it is, and
             takes away anything still heading further in. Out past his edge it coasts on what it
             was given, bends a little on the curl field, and slows to a stop -- displaced, the
             way his body moves air aside, never flung. */
          if (me.on && me.api.depth && crossT && me.api.progress() > pz[i]) {
            const sh = me.api.hit(px[i], py[i]);
            if (!passT[i]) passT[i] = now;
            if (sh && sh.d > 0.02) {
              if (!hitT[i]) { hitT[i] = now; knock[i] = 1; }
              const p = Math.pow(sh.d, 1.5), vn = vx[i] * sh.nx + vy[i] * sh.ny;
              if (vn < 0) { const c = Math.min(1, sh.d * 1.5); vx[i] -= vn * sh.nx * c; vy[i] -= vn * sh.ny * c; }
              const want = 1.2 + 5.5 * p * (0.75 + 0.5 * amp[i]);          // speed out of him, by how deep it is
              const out = vx[i] * sh.nx + vy[i] * sh.ny;
              if (out < want) { const g = (want - out) * (1 - Math.pow(0.8, k)); vx[i] += sh.nx * g; vy[i] += sh.ny * g; }
            }
            if (hitT[i]) {
              // the eddies it rides once it is clear of him, fading in as it leaves
              const [fx, fy] = curl(px[i], py[i], now / 1000), q = sh ? 1 - Math.min(1, sh.d * 3) : 1;
              vx[i] += fx * 0.035 * q * k; vy[i] += fy * 0.035 * q * k;
            }
          }
          if (me.on && !me.api.depth) {
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
      /* THE LOCK. Over the last stretch every dot is drawn exactly where its particle is drawn,
         at its size and in its colour, and his other particles bud out of the dots to their
         own places -- so at the handover this canvas is HIS PICTURE, dot for dot, and the
         crossfade is between two identical frames. After the handover it keeps tracking him
         while it fades, so nothing can drift apart under it. */
      const Dl = blown && G && G.gb.drawn, lk = Dl ? Math.max(0, Math.min(1, (blown - (FLY - LOCK)) / LOCK)) : 0;
      const lock = lk * lk * (3 - 2 * lk);
      const qx = (i) => { const j = gi[i]; return lock && Dl.r[j] > 0 ? px[i] + (G.left + Dl.x[j] - px[i]) * lock : px[i]; };
      const qy = (i) => { const j = gi[i]; return lock && Dl.r[j] > 0 ? py[i] + (G.top + Dl.y[j] - py[i]) * lock : py[i]; };
      /* THE BURST, in depth: a dot he walks into is thrown TOWARD YOU -- it swells as it comes
         forward and shrinks again as it loops back past him -- and it changes sides of him as
         it goes, in front on the way out and behind on the way back, which is the whole read. */
      if (crossT) for (let i = 0; i < N; i++) {
        // swells while he is pushing it, eases back to its own size as it comes round behind him
        // it comes toward you over the same half-second it is flying outward, and goes back
        // as it curls round behind him -- one motion, not a size change
        let want = 1;
        if (hitT[i]) {
          const e = Math.min(1, (now - hitT[i]) / 600), up = e * e * (3 - 2 * e);
          const back = blown ? Math.max(0, 1 - blown / 1.1) : 1;
          want = 1 + 0 * up * back;   // (no swell: he moves air aside, he does not throw it at you)
        }
        zm[i] += (want - zm[i]) * (1 - Math.pow(0.8, k));
        // in front while thrown toward you, behind once it has curled back -- but it only ever
        // changes sides somewhere he is NOT, so nothing pops through him
        /* ONE CROSSING EACH, AT THE TOP OF ITS THROW. Every dot is in front of him until he
           has thrown it; it goes behind him once, when its flight outward has spent itself (or
           it has been out long enough), and only somewhere he is NOT -- if it is over him at
           that moment it waits until it is clear. Then it stays behind for good, so everything
           that comes back comes back behind him. The swap itself is a short crossfade. */
        if (!gb2[i] && passT[i] && now - passT[i] > 120) { const o = me.api.hit(px[i], py[i]); if (!o || o.d < 0.02) gb2[i] = 1; }
        if (!gb2[i] && hitT[i]) {
          const c1 = me.api.chest() || ch0, rx = px[i] - c1.x, ry = py[i] - c1.y, rm = Math.hypot(rx, ry) || 1;
          const vr = (vx[i] * rx + vy[i] * ry) / rm;
          if (vr > pk[i]) pk[i] = vr;
          const apex = (pk[i] > 1 && vr < pk[i] * 0.35) || now - hitT[i] > 1100 || blown > 0.6;
          if (apex) { const o = me.api.hit(px[i], py[i]); if (!o || o.d < 0.02 || blown > 1.2) gb2[i] = 1; }
        }
        const want2 = gb2[i] ? 0 : 1;
        fb[i] += (want2 - fb[i]) * (1 - Math.pow(0.8, k));
        front[i] = fb[i] > 0.98 ? 1 : fb[i] < 0.02 ? 0 : 2;
      }
      const qs = (i) => {
        const s0 = rad[i] * (1 + Math.min(4, Math.hypot(vx[i], vy[i]) * 0.04)) * 1.3 * zm[i];
        const r1 = Dl && Dl.r[gi[i]] > 0 ? Dl.r[gi[i]] : gz[i];
        return s0 + (r1 - s0) * grow * grow;
      };
      gF.setTransform(dpr, 0, 0, dpr, 0, 0); gF.clearRect(0, 0, W, H);
      if (lock < 1) for (const L of [0, 1]) for (const h of [0, 1]) {
        const g = L ? gF : g0;
        g.fillStyle = h ? core : rim;
        const a0 = (blown && !G ? Math.max(0, 1 - blown * 1.4) : h ? 0.9 : 0.75) * (1 - lock);
        g.globalAlpha = a0;
        g.beginPath();
        for (let i = 0; i < N; i++) {
          if (hot[i] !== h || front[i] !== L) continue;
          const s = qs(i), x = qx(i), y = qy(i);
          g.moveTo(x + s, y); g.arc(x, y, s, 0, 6.2832);
        }
        g.fill();
        // the few mid-crossfade: on this layer at their share of it
        for (let i = 0; i < N; i++) {
          if (hot[i] !== h || front[i] !== 2) continue;
          g.globalAlpha = a0 * (L ? fb[i] : 1 - fb[i]);
          const s = qs(i), x = qx(i), y = qy(i);
          g.beginPath(); g.arc(x, y, s, 0, 6.2832); g.fill();
        }
      }
      if (Dl && blown > FLY - LOCK - BUD) {
        /* In HIS colours, bucketed by his palette index so it is one fill per colour.
           The dots fade up into them over the lock; the budding particles start as a point
           on their dot and grow out to their own place, each on its own clock, so the orb
           fills in by division rather than appearing. Everything on the back canvas: at the
           handover there is no Colin in front of the orb for any of it to be in front of. */
        const n = G.n, lut = Dl.lut, head = G.bh.fill(-1), nx = G.bn, ax = G.bx, ay = G.by, ar = G.br, aa = G.ba;
        let m = 0;
        const put = (li, x, y, r, al) => { if (r <= 0.2 || al <= 0.01) return; ax[m] = x; ay[m] = y; ar[m] = r; aa[m] = al; nx[m] = head[li]; head[li] = m++; };
        if (lock > 0) for (let i = 0; i < N; i++) { const j = gi[i]; if (Dl.r[j] > 0) put(Dl.li[j], qx(i), qy(i), qs(i), lock); }
        for (let j = 0; j < n; j++) {
          const d = G.owner[j]; if (d < 0 || Dl.r[j] <= 0) continue;
          let b = Math.max(0, Math.min(1, (blown - G.st[j]) / (FLY - G.st[j])));
          if (b <= 0) continue; b = b * b * (3 - 2 * b);
          const sx = qx(d), sy = qy(d);
          put(Dl.li[j], sx + (G.left + Dl.x[j] - sx) * b, sy + (G.top + Dl.y[j] - sy) * b, Dl.r[j] * (0.35 + 0.65 * b), Math.min(1, b * 3));
        }
        g0.globalAlpha = 1;
        for (let li = 0; li < head.length; li++) {
          if (head[li] < 0) continue;
          g0.fillStyle = lut[li];
          // full-strength ones in one fill; fading ones get their own, at their alpha
          g0.beginPath(); let any = false;
          for (let q = head[li]; q >= 0; q = nx[q]) if (aa[q] >= 0.99) { g0.moveTo(ax[q] + ar[q], ay[q]); g0.arc(ax[q], ay[q], ar[q], 0, 6.2832); any = true; }
          if (any) g0.fill();
          for (let q = head[li]; q >= 0; q = nx[q]) if (aa[q] < 0.99) { g0.globalAlpha = aa[q]; g0.beginPath(); g0.arc(ax[q], ay[q], ar[q], 0, 6.2832); g0.fill(); }
          g0.globalAlpha = 1;
        }
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
    const FLY = 2.0;   // long enough for the arrival to bounce and settle
    const LOCK = 0.45, BUD = 0.75;   // the last LOCK s draw his picture exactly; his other particles bud out over the BUD s before it
    const sx0 = new Float32Array(N), sy0 = new Float32Array(N), gi = new Int32Array(N), gz = new Float32Array(N);
    const tA = new Float32Array(N), tR = new Float32Array(N), tS = new Float32Array(N);   // each dot's place in his orb
    const tD = new Float32Array(N), tC = new Float32Array(N);   // when each dot starts for home, and its swirl
    let G = null, walking = false, crossT = 0, ch0 = null, walkT0 = 0;
    /* Walking toward you he stops where the homepage stands him, which is above the middle of
       the screen -- so the curtain drifts up to hang across where his chest will be, and he
       walks INTO it rather than over the top of it. */
    const FO = { x: 0, y: 0, k: 0, on: false };
    const GA = { sx: 1, sy: 1 };
    function curtainAt() {
      const st = document.getElementById('home-stage')?.getBoundingClientRect();
      if (!st || st.height < 40) return;
      const foot = st.top + st.height * 0.9032, tall = st.height / 1.24;
      FO.x = st.left + st.width / 2; FO.y = foot - tall * 0.5; FO.on = true;
      // the swarm's own extent (about 105 x 78 px at a phone's width, scaled) squeezed to an
      // upright oval a little narrower than he is, so every dot is somewhere he will walk through
      const sc = Math.min(W, H) / 700;
      GA.sx = (tall * 0.14) / (190 * sc); GA.sy = (tall * 0.4) / (140 * sc);
    }
    const zm = new Float32Array(N).fill(1), zA = new Float32Array(N), wingS = new Int8Array(N);
    /* Per dot: when the name lets it go (one at a time, not a row at once), when he touched
       it, which way it curls, and how hard he hit it -- mostly a brush, now and then a throw. */
    const cl = new Uint8Array(N), relT = new Float64Array(N), WAVE = 330;   // 1 = clinging to him, 2 = thrown off
    function throwOff(i, sh, c0) {
      cl[i] = 2; hitT[i] = performance.now();
      let nx = sh ? sh.nx : px[i] - c0.x, ny = sh ? sh.ny : py[i] - c0.y; const nm = Math.hypot(nx, ny) || 1; nx /= nm; ny /= nm;
      let tx = -ny, ty = nx; if ((py[i] < c0.y) === (ty > 0)) { tx = -tx; ty = -ty; }   // rolling up off him above his chest, down below
      const sp = 3.5 + 6 * amp[i] * (0.7 + Math.random() * 0.6);
      vx[i] = nx * sp + tx * sp * 0.45; vy[i] = ny * sp + ty * sp * 0.45;
    }
    const passT = new Float64Array(N), pz = new Float32Array(N);   // when he walked past its depth; and that depth, as walk progress
    for (let i = 0; i < N; i++) pz[i] = 0.3 + Math.random() * 0.55;
    const gb2 = new Uint8Array(N), pk = new Float32Array(N);   // gone behind him (for good), and its peak outward speed
    const fb = new Float32Array(N).fill(1);   // 1 = in front of him, 0 = behind, between = crossing over
    const rel = new Float32Array(N), hitT = new Float64Array(N), hitS = new Int8Array(N), amp = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      rel[i] = 200 + Math.random() * 800;
      const r = Math.random(); amp[i] = r < 0.18 ? 0.8 + Math.random() * 0.5 : r < 0.7 ? 0.35 + Math.random() * 0.35 : 0.2 + Math.random() * 0.15;
    }
    /* The wings: everything is thrown out to its own side -- up or down by where it is against
       his chest -- and each side is given the opposite turn, so the two halves sweep out and
       curl back in mirror image, round behind him, onto the orb. */
    function wings() {
      { const c1 = me.api.chest() || ch0; for (let i = 0; i < N; i++) if (cl[i] === 1) throwOff(i, me.api.hit(px[i], py[i]), c1); }
      const ch = me.api.chest() || ch0 || { x: W / 2, y: H * 0.5, r: H * 0.3 };
      for (let i = 0; i < N; i++) {
        const side = px[i] < ch.x ? -1 : 1, oy = Math.max(-1.1, Math.min(0.8, (py[i] - ch.y) / (ch.r || 1)));
        wingS[i] = hitS[i] || (oy < 0 ? side : -side);   // no push here: the wake already set them moving   // top half curls over, bottom half under: the four lobes of a wing pair
      }
    }
    function enter() {
      if (blown || walking) return;
      if (me.ok) {                         // he walks through first
        walking = true; me.on = true; me.api.start(W, H); walkT0 = performance.now();
        if (me.api.depth) { front.fill(1); curtainAt(); }   // he starts BEHIND the field: every dot is in front of him
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
        // a particle a dot is flying to IS that dot: it is not budded, it is arrived at
        for (let i = 0; i < N; i++) owner[gi[i]] = -1;
        // which dot each remaining particle buds out of: the nearest of its own colour by angle,
        // so it grows out to a place beside its parent rather than across the orb
        const D0 = gb.drawn;
        if (D0) {
          const ang = (j) => Math.atan2(D0.y[j] - gb.centre.y, D0.x[j] - gb.centre.x);
          const byA = (list, key) => list.map(v => [key(v), v]).sort((p, q) => p[0] - q[0]);
          for (const [pool, dots] of [[cores, hots.length ? hots : colds], [rims, colds.length ? colds : hots]]) {
            const da = byA(dots, d => ang(gi[d]));
            for (const j of pool) {
              if (owner[j] < 0) continue;
              const a = ang(j); let lo = 0, hi = da.length - 1;
              while (lo < hi) { const md = (lo + hi) >> 1; if (da[md][0] < a) lo = md + 1; else hi = md; }
              owner[j] = da[lo][1];
            }
          }
        }
        const r = document.getElementById('glorb').getBoundingClientRect();
        const st = new Float32Array(n);   // when each budding particle starts to divide off its dot
        for (let j = 0; j < n; j++) st[j] = FLY - LOCK - BUD + Math.random() * (BUD * 0.7);
        const M = N + n;
        G = { f, n, owner, gb, st, top: r.top, left: r.left, k: gb.centre.scale / 390, landed: false,
              bh: new Int32Array(gb.drawn ? gb.drawn.lut.length : 1), bn: new Int32Array(M), bx: new Float32Array(M), by: new Float32Array(M), br: new Float32Array(M), ba: new Float32Array(M) };
        // his rest geometry, measured off his own frames: ring 0.19-0.30 of the short side, core inside 0.09
        for (let i = 0; i < N; i++) {
          tA[i] = Math.random() * Math.PI * 2; tS[i] = Math.random() < 0.5 ? 1 : -0.6;
          tR[i] = hot[i] ? Math.sqrt(Math.random()) * 0.085 : 0.19 + Math.random() * 0.11;
          /* STRUCTURE, NOT NOISE. When a dot sets off for home is a smooth function of WHERE it
             is, so whole patches leave together -- clumps of every size peel away in turn --
             rather than each dot on its own coin toss (which reads as an even, noisy cloud).
             The flight then rides a curl-noise flow field (below): neighbours get nearly the
             same push, so they travel as strands. */
          const sc = 1 / Math.min(W, H);
          const n = 0.5 + 0.32 * Math.sin(px[i] * sc * 5.1 + 1.3) * Math.cos(py[i] * sc * 4.3 - 0.7)
                        + 0.18 * Math.sin(px[i] * sc * 13.7 - py[i] * sc * 11.9 + 2.1);
          tD[i] = Math.max(0, Math.min(1, n)) * 0.38 * FLY; tC[i] = 0.85 + 0.3 * Math.random();
        }
        for (let i = 0; i < N; i++) {
          sx0[i] = px[i]; sy0[i] = py[i];
          // his dot sizes at rest, measured off his own frames: violet bigger than green
          gz[i] = (isCore(gi[i]) ? 2.2 + Math.random() * 2 : 3.5 + Math.random() * 4.5) * G.k * dotK;
        }
      }
      blown = 0.0001; el.classList.add('out');
    }
    /* The handover. Every one of his particles is put on the dot it belongs to,
       carrying that dot's motion, so the field underneath is exactly the
       picture on top at the instant this canvas starts to let go -- and his own
       physics opens it back out into Glorb from there. */
    /* There are four or five of his particles to every dot, and stacking them all on the dot
       made each pile move as one lump -- the extra density arrived as a ready-made orb sliding
       into place. So only ONE of his particles sits exactly on each dot; the rest are SHED
       along the trail behind it, like smoke off a moving thing, drifting wider the further
       back they are, each with its own swirl round his centre -- so the orb thickens in as
       a swarm spiralling home rather than arriving in formation. */
    function land() {
      G.landed = true;
      if (G.gb.drawn) return;   // the picture on top IS his frame: nothing of his has to move
      if (window.__introDebug) { let y0 = 1e9, y1 = -1e9, far = 0; for (let i = 0; i < N; i++) { y0 = Math.min(y0, py[i]); y1 = Math.max(y1, py[i]); if (py[i] < 0 || py[i] > H) far++; } window.__introDebug = { y0, y1, far, N }; }
      const f = G.f, gb = typeof glorb === 'function' ? glorb() : glorb, c = gb?.centre || { x: W / 2 - G.left, y: H / 2 - G.top };
      const seen = new Uint16Array(N);
      for (let j = 0; j < G.n; j++) {
        const d = G.owner[j], m = seen[d]++;
        let x = px[d] - G.left, y = py[d] - G.top, ux = vx[d], uy = vy[d];
        if (m) {
          const back = (m * 2.2 + Math.random() * 3) * (0.6 + Math.random() * 0.8);   // frames behind the dot
          // a SHORT trail: its length is capped in pixels, not scaled by speed -- a dot arriving
          // mid-bounce is moving fast, and a speed-scaled trail laid 160px of particles off the screen
          const sp = Math.hypot(ux, uy) || 1, len = Math.min(sp * back, 10 + m * 5), spread = Math.min(3 + back * 1.6, 18);
          x -= ux / sp * len + (-uy / sp) * (Math.random() - 0.5) * spread * 2;
          y -= uy / sp * len + (ux / sp) * (Math.random() - 0.5) * spread * 2;
          // a swirl round his centre, a different strength for each, so they do not travel as a sheet
          const rx = x - c.x, ry = y - c.y, rr = Math.hypot(rx, ry) || 1, sw = (1.2 + Math.random() * 2.8) * (Math.random() < 0.5 ? 1 : 0.6);
          ux = ux * (0.55 + Math.random() * 0.3) + (-ry / rr) * sw + (Math.random() - 0.5) * 1.5;
          uy = uy * (0.55 + Math.random() * 0.3) + (rx / rr) * sw + (Math.random() - 0.5) * 1.5;
        } else { x += (Math.random() - 0.5) * 2; y += (Math.random() - 0.5) * 2; }
        // still moving -- but handed over CALMED: Glorb has his own pull and his own drag, and
        // the full mid-bounce speed flung 350 of his particles off the screen
        const um = Math.hypot(ux, uy), uc = Math.min(1, 3 / (um || 1)) * 0.6;
        f.px[j] = x; f.py[j] = y; f.vx[j] = ux * uc; f.vy[j] = uy * uc;
      }
    }
    function finish() { done = true; if (!me.api?.depth) dispatchEvent(new Event('cw:handoff')); if (!me.on) { me.api?.dispose(); me.cv.remove(); } removeEventListener('resize', size); removeEventListener('keydown', key); el.remove(); cvF.remove(); }
    const key = e => { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') enter(); };
    addEventListener('keydown', key);
    el.addEventListener('click', enter);
    el.style.setProperty('--bg', bg);
    el.style.background = bg;
  });
}

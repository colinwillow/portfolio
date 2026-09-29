// The stage: a line-drawn globe with ribbons sweeping round it, the site's
// sections pinned to it like cities, and a web of lines behind. It IS the
// navigation -- the labels are real links, and picking a section turns the
// globe until that label faces you.
//
// Nothing on the page depends on this. If WebGL is missing the site is a
// plain, working page; this file only ever adds.

import * as THREE from '../vendor/three.module.min.js';

const DEG = Math.PI / 180;
const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// Unit vector for a lat/lon, in the globe's own space. +Z faces the camera at
// yaw 0, so a label at lon 0 starts in front.
function llv(lat, lon, r = 1) {
  return new THREE.Vector3(
    r * Math.cos(lat * DEG) * Math.sin(lon * DEG),
    r * Math.sin(lat * DEG),
    r * Math.cos(lat * DEG) * Math.cos(lon * DEG));
}

// Cheap 3D value noise -- only used once, at build, to decide where "land" is.
function hash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const f = t => t * t * (3 - 2 * t);
  const u = f(x - xi), v = f(y - yi), w = f(z - zi);
  let out = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++)
    out += hash(xi + i, yi + j, zi + k) * (i ? u : 1 - u) * (j ? v : 1 - v) * (k ? w : 1 - w);
  return out;
}
const fbm = p => vnoise(p.x * 1.7 + 3, p.y * 1.7, p.z * 1.7) * 0.65 + vnoise(p.x * 4.1, p.y * 4.1 + 7, p.z * 4.1) * 0.35;

// Lines and dots fade as they turn away, so the far side of the globe reads
// as behind rather than as a second layer of clutter.
const FACING_VS = /* glsl */`
  uniform float uSize;
  varying float vF;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vF = dot(normalize(normalMatrix * position), normalize(-mv.xyz));
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize / -mv.z;
  }`;
const FACING_FS = (round) => /* glsl */`
  uniform vec3 uColor; uniform float uA0; uniform float uA1;
  varying float vF;
  void main() {
    ${round ? 'if (length(gl_PointCoord - 0.5) > 0.5) discard;' : ''}
    gl_FragColor = vec4(uColor, mix(uA0, uA1, smoothstep(-0.25, 0.55, vF)));
  }`;

function facingMat(color, a0, a1, points = false, size = 0) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color }, uA0: { value: a0 }, uA1: { value: a1 }, uSize: { value: size } },
    vertexShader: FACING_VS, fragmentShader: FACING_FS(points),
    transparent: true, depthWrite: false,
  });
}

// A ribbon: an arc of a circle in the XY plane, thin at both ends and wide in
// the middle, its width along the circle's axis. Width lives in an attribute
// so the ribbons can swell (on a transition, or to the music) with no rebuild.
function ribbonGeo(R, arc, W, twist, segs = 220) {
  const pos = [], dir = [], half = [], side = [], nrm = [], tt = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, a = -arc / 2 + t * arc;
    const c = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    const tan = new THREE.Vector3(-Math.sin(a), Math.cos(a), 0);
    const d = new THREE.Vector3(0, 0, 1).applyAxisAngle(tan, (t - 0.5) * twist);
    const n = new THREE.Vector3().crossVectors(tan, d).normalize();
    const w = W * Math.pow(Math.sin(Math.PI * t), 0.8) / 2;
    for (const s of [-1, 1]) {
      pos.push(c.x, c.y, c.z); dir.push(d.x, d.y, d.z); half.push(w); side.push(s);
      nrm.push(n.x, n.y, n.z); tt.push(t);
    }
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
  g.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(tt, 1));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R + W);
  return g;
}

function ribbonMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: U, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute vec3 aDir; attribute float aHalf; attribute float aSide; attribute float aT;
      uniform float uAmp;
      varying float vF; varying float vT; varying float vS;
      void main() {
        vec3 p = position + aDir * aHalf * aSide * uAmp;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vF = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        vT = aT; vS = aSide;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uAccent; uniform vec3 uDeep;
      varying float vF; varying float vT; varying float vS;
      void main() {
        vec3 col = mix(uDeep, uAccent, 0.35 + 0.65 * pow(vF, 0.6));
        if (!gl_FrontFacing) col = mix(uDeep, col, 0.6);
        // fine engraved hatching along the length, like the reference's ribbons
        col *= 0.9 + 0.1 * step(0.5, fract(vT * 260.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

export function createGlobe({ canvas, labelLayer, sections }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 7);

  const ink = new THREE.Color('#888'), acc = new THREE.Color('#b07a8f'), deep = new THREE.Color('#5a2c3c');
  const rig = new THREE.Group();     // placed and scaled per mode
  const globe = new THREE.Group();   // turned to face a section
  scene.add(rig); rig.add(globe);

  // --- graticule ------------------------------------------------------------
  {
    const p = [];
    for (let lat = -75; lat <= 75; lat += 15)
      for (let lon = 0; lon < 360; lon += 3) p.push(...llv(lat, lon).toArray(), ...llv(lat, lon + 3).toArray());
    for (let lon = 0; lon < 360; lon += 15)
      for (let lat = -90; lat < 90; lat += 3) p.push(...llv(lat, lon).toArray(), ...llv(lat + 3, lon).toArray());
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    globe.add(new THREE.LineSegments(g, facingMat(ink, 0.03, 0.22)));
  }

  // --- land, as dots ------------------------------------------------------
  const dotMat = facingMat(ink, 0.05, 0.75, true, 26);
  {
    const N = 7000, p = [], v = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
      v.set(Math.cos(th) * r, y, Math.sin(th) * r);
      if (fbm(v) > 0.49) p.push(v.x * 1.004, v.y * 1.004, v.z * 1.004);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    globe.add(new THREE.Points(g, dotMat));
  }

  // --- section markers ----------------------------------------------------
  const markers = sections.map(s => ({ ...s, local: llv(s.lat, s.lon, 1.01) }));
  const pinMat = facingMat(acc, 0.0, 1.0, true, 70);
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(markers.flatMap(m => m.local.toArray()), 3));
    globe.add(new THREE.Points(g, pinMat));
  }

  // --- ribbons --------------------------------------------------------------
  const RU = { uAccent: { value: acc }, uDeep: { value: deep }, uAmp: { value: 1 } };
  const rmat = ribbonMat(RU);
  const ribbons = [
    { R: 1.16, arc: 1.35 * Math.PI, W: 0.62, twist: 0.5, tilt: [0.5, 0.2, 0.9], speed: 0.16 },
    { R: 1.27, arc: 1.10 * Math.PI, W: 0.34, twist: -0.8, tilt: [-0.7, 0.4, -0.3], speed: -0.22 },
    { R: 1.36, arc: 0.85 * Math.PI, W: 0.18, twist: 1.2, tilt: [1.2, -0.6, 0.2], speed: 0.3 },
  ].map(r => {
    const pivot = new THREE.Group();
    pivot.rotation.set(...r.tilt);
    const mesh = new THREE.Mesh(ribbonGeo(r.R, r.arc, r.W, r.twist), rmat);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    pivot.add(mesh); rig.add(pivot);
    return { mesh, speed: r.speed };
  });

  // --- the web behind -------------------------------------------------------
  // Fixed nodes around and behind the globe; each visible section is tied to
  // its two nearest, like the city lines in a news ident.
  const nodes = [];
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2 + (hash(i, 1, 2) - 0.5) * 0.4;
    const r = 2.1 + hash(i, 3, 4) * 0.9;
    nodes.push(new THREE.Vector3(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.8, -0.8 - hash(i, 5, 6) * 1.2));
  }
  const lineMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.22, depthWrite: false });
  {
    const p = [];
    nodes.forEach((n, i) => {
      const near = nodes.map((m, j) => [j, n.distanceTo(m)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
      for (const [j] of near.slice(0, 2)) if (j > i) p.push(...n.toArray(), ...nodes[j].toArray());
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    rig.add(new THREE.LineSegments(g, lineMat));
  }
  const tieBuf = new Float32Array(markers.length * 2 * 2 * 3);
  const tieGeo = new THREE.BufferGeometry();
  tieGeo.setAttribute('position', new THREE.BufferAttribute(tieBuf, 3));
  const ties = new THREE.LineSegments(tieGeo, lineMat.clone());
  ties.frustumCulled = false;
  rig.add(ties);

  // --- labels (real links, positioned over the canvas) ---------------------
  const labels = markers.map((m, i) => {
    const a = document.createElement('a');
    a.href = m.key; a.dataset.link = '';
    a.className = 'glabel tier' + m.tier;
    a.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><span>${m.label}</span>`;
    labelLayer.appendChild(a);
    return a;
  });

  // --- state ------------------------------------------------------------------
  const st = {
    mode: 'home', key: null,
    yaw: 0.4, pitch: 0.28, tYaw: 0.4, tPitch: 0.28, spin: 0.07,
    y: 0, s: 1, tY: 0, tS: 1,
    pulse: 0, level: 0, drag: null,
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  let W = 1, H = 1, visH = 1, visW = 1;

  function layout() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * camera.position.z * Math.tan(camera.fov * DEG / 2);
    visW = visH * camera.aspect;
    if (st.mode === 'home') {
      st.tS = Math.min(visH * 0.31, visW * 0.38) / 1.2;
      st.tY = visH * 0.03;
    } else {
      // The top band above the content sheet (see --band in style.css).
      const band = visH * 0.38;
      st.tS = Math.min(band * 0.40, visW * 0.30) / 1.2;
      st.tY = visH / 2 - band / 2;
    }
  }

  function setMode(mode, key) {
    const was = st.mode + st.key;
    st.mode = mode; st.key = key || null;
    layout();
    const m = markers.find(x => x.key === key);
    if (m) {
      // Ry(-lon) then Rx(lat) brings the marker to +Z; a touch less pitch
      // leaves it just above centre, where the label reads.
      let ty = -m.lon * DEG;
      st.tYaw = st.yaw + wrap(ty - st.yaw);
      st.tPitch = (m.lat - 10) * DEG;
    } else {
      st.tPitch = 0.28;
    }
    labels.forEach((a, i) => a.classList.toggle('on', markers[i].key === key));
    labelLayer.classList.toggle('compact', mode !== 'home');
    if (was !== st.mode + st.key && !st.reduced) st.pulse = 1;
  }

  // Drag to turn it yourself, on the home screen.
  canvas.addEventListener('pointerdown', e => {
    if (st.mode !== 'home') return;
    st.drag = { x: e.clientX, y: e.clientY, yaw: st.tYaw, pitch: st.tPitch };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!st.drag) return;
    st.tYaw = st.drag.yaw + (e.clientX - st.drag.x) * 0.006;
    st.tPitch = Math.max(-1.1, Math.min(1.1, st.drag.pitch + (e.clientY - st.drag.y) * 0.004));
  });
  const endDrag = () => { st.drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const tmp = new THREE.Vector3();
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;

    if (st.mode === 'home' && !st.drag) st.tYaw += st.spin * (st.reduced ? 0.3 : 1) * dt;
    st.yaw = damp(st.yaw, st.tYaw, 3.2, dt);
    st.pitch = damp(st.pitch, st.tPitch, 3.2, dt);
    st.y = damp(st.y, st.tY, 4, dt);
    st.s = damp(st.s, st.tS, 4, dt);
    st.pulse = damp(st.pulse, 0, 2.2, dt);

    globe.rotation.set(st.pitch, st.yaw, 0, 'XYZ');
    rig.position.y = st.y;
    rig.scale.setScalar(st.s);
    const t = now / 1000;
    for (const r of ribbons) r.mesh.rotation.z += r.speed * (1 + st.pulse * 3 + st.level * 2) * dt * (st.reduced ? 0.3 : 1);
    RU.uAmp.value = 1 + st.pulse * 0.45 + st.level * 0.7;
    dotMat.uniforms.uSize.value = 26 * (1 + st.level * 0.6) * renderer.getPixelRatio() * (st.s + 0.4) / 1.4;
    pinMat.uniforms.uSize.value = (60 + Math.sin(t * 3) * 10) * renderer.getPixelRatio() * (st.s + 0.4) / 1.4;

    rig.updateMatrixWorld(true);
    // Labels + ties
    let k = 0;
    markers.forEach((m, i) => {
      tmp.copy(m.local).applyMatrix4(globe.matrixWorld);            // world
      const p = m.local.clone().applyQuaternion(globe.quaternion);   // rig space
      const facing = p.z / p.length();                               // camera is on +Z
      const a = labels[i];
      tmp.project(camera);
      // keep a label on screen even when its pin is near the edge of a narrow phone
      const lw = a._w || (a._w = a.offsetWidth || 90);
      const x = Math.min(W - lw - 6, Math.max(6, (tmp.x * 0.5 + 0.5) * W)), y = (-tmp.y * 0.5 + 0.5) * H;
      const vis = Math.max(0, Math.min(1, (facing + 0.05) / 0.35));
      a.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      a.style.opacity = vis.toFixed(3);
      a.style.pointerEvents = vis > 0.4 ? 'auto' : 'none';
      // ties to the two nearest background nodes (in rig space)
      const near = nodes.map(q => [q, q.distanceToSquared(p)]).sort((u, v) => u[1] - v[1]);
      for (let j = 0; j < 2; j++) {
        const q = vis > 0.05 ? near[j][0] : p;
        tieBuf.set([p.x, p.y, p.z, q.x, q.y, q.z], k); k += 6;
      }
    });
    tieGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  let running = false;
  const start = () => { if (!running) { running = true; last = performance.now(); renderer.setAnimationLoop(frame); } };
  const stop = () => { running = false; renderer.setAnimationLoop(null); };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('resize', layout);
  layout(); st.s = st.tS; st.y = st.tY;
  start();

  return {
    setMode,
    setLevel(v) { st.level = v; },
    setColors({ ink: i, accent: a, deep: d }) {
      ink.set(i); acc.set(a); deep.set(d);
      lineMat.color.set(i); ties.material.color.set(i);
    },
  };
}

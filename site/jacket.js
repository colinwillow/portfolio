// NEON JACKET: Colin's fleece, re-dyed in the site's colours at render time.
//
// The jacket shares one texture ("outfit") with his hoodie, jeans and skin, laid
// out as a jumbled atlas, so it cannot be picked out by position. A mask baked by
// tools/jacket-mask.mjs marks where the knit is (it is the only multi-coloured
// material on him), and this shader patch re-dyes ONLY inside that mask:
//   warm flecks (orange, rust, red)  -> Glorb's violet
//   teal and cyan                    -> his neon green
//   the blues and the greys          -> pushed down toward black
// with a little saturation added and the neon parts glowing faintly, so he wears
// the site rather than a faded photo of a fleece. Nothing outside the mask moves.
export const JACKET = { amt: 1, glow: 0.3, violet: [0.5, 0.06, 1.0], magenta: [1.0, 0.06, 0.55], green: [0.2, 0.95, 0.12], deep: [0.012, 0.006, 0.03] };

export function neonJacket(THREE, model, maskUrl) {
  const mask = new THREE.TextureLoader().load(maskUrl);
  mask.flipY = false;                      // glTF textures are not flipped; the mask matches its atlas
  mask.colorSpace = THREE.NoColorSpace;
  model.traverse(o => {
    if (!o.isMesh || !o.material || o.material.name !== 'outfit' || o.material.userData.neon) return;
    const m = o.material; m.userData.neon = true;
    const u = { uJacket: { value: mask }, uAmt: { value: JACKET.amt }, uGlow: { value: JACKET.glow },
      uViolet: { value: new THREE.Vector3(...JACKET.violet) }, uMagenta: { value: new THREE.Vector3(...JACKET.magenta) }, uGreen: { value: new THREE.Vector3(...JACKET.green) },
      uDeep: { value: new THREE.Vector3(...JACKET.deep) } };
    m.userData.jacket = u;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
uniform sampler2D uJacket; uniform float uAmt, uGlow; uniform vec3 uViolet, uMagenta, uGreen, uDeep;
vec3 jkHsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y), e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}`)
        .replace('#include <map_fragment>', `#include <map_fragment>
  float jkM = 0.0; vec3 jkNeon = vec3(0.0);
  #ifdef USE_MAP
    jkM = texture2D(uJacket, vMapUv).r * uAmt;
    if (jkM > 0.001) {
      vec3 c = diffuseColor.rgb, hsv = jkHsv(c);
      float h = hsv.x, b = hsv.z, chroma = smoothstep(0.12, 0.35, hsv.y);
      float warm = max(1.0 - smoothstep(0.08, 0.14, h), smoothstep(0.9, 0.96, h));
      float cyan = smoothstep(0.36, 0.44, h) * (1.0 - smoothstep(0.53, 0.58, h));
      float violet = smoothstep(0.72, 0.78, h) * (1.0 - smoothstep(0.9, 0.96, h));
      float lift = 0.12 + 1.5 * b * b * 1.6;                                   // keeps the knit's own light and dark
      vec3 col = uDeep * (0.6 + 2.0 * b);                                    // blues and greys -> near black
      // red-ish flecks go magenta, orange ones violet: the knit stays two-toned, not one flat purple
      vec3 hot = mix(uMagenta, uViolet, smoothstep(0.02, 0.09, h < 0.5 ? h : h - 1.0));
      col = mix(col, hot * lift, clamp(warm, 0.0, 1.0) * chroma);
      col = mix(col, uViolet * lift, violet * chroma);
      col = mix(col, uGreen * lift * 0.8, cyan * chroma);
      // flat colours (the hoodie's beige, a grey) keep their own colour rather than going black
      col = mix(c, col, chroma);
      // and anything that looks like SKIN is left alone: bright, warm, not very saturated
      float skin = warm * smoothstep(0.42, 0.6, b) * (1.0 - smoothstep(0.62, 0.8, hsv.y));
      jkM *= 1.0 - skin;
      jkNeon = max(col - uDeep * 2.6, 0.0) * chroma;
      diffuseColor.rgb = mix(c, col, jkM);
    }
  #endif`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  totalEmissiveRadiance += jkNeon * jkM * uGlow;`);
    };
    m.customProgramCacheKey = () => 'neon-jacket';
    m.needsUpdate = true;
  });
}

// STL -> preview GLB for a 3D-print statue: welded, Z-up mm to Y-up m, soles on y=0, draco.
// Needs: npm i --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf
// Usage: npm run print -- in.stl models/prints/name.glb   (then add a PRINTS entry in site/content.js)
import fs from 'fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { weld, draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
const [,, src, out] = process.argv;
const b = fs.readFileSync(src), n = b.readUInt32LE(80);
// STL is Z-up millimetres; glTF is Y-up metres. (x, y, z) -> (x, -z... ) : Y = z, Z = -y keeps it right-handed
const pos = new Float32Array(n * 9);
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
  const o = 84 + 50 * i + 12 + k * 12, x = b.readFloatLE(o), y = b.readFloatLE(o + 4), z = b.readFloatLE(o + 8);
  const v = [x / 1000, z / 1000, -y / 1000];
  for (let a = 0; a < 3; a++) { pos[i * 9 + k * 3 + a] = v[a]; mn[a] = Math.min(mn[a], v[a]); mx[a] = Math.max(mx[a], v[a]); }
}
// centre on x/z, soles on y = 0
const c = [(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2];
for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) pos[i + a] -= c[a];
const doc = new Document(); const buf = doc.createBuffer();
const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf);
const prim = doc.createPrimitive().setAttribute('POSITION', acc);
const mesh = doc.createMesh('print').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('print').setMesh(mesh));
await doc.transform(weld());
doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({ method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER, encodeSpeed: 5, decodeSpeed: 5, quantizePosition: 14 });
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({ 'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule() });
await io.write(out, doc);
console.log(n, 'tris', (mx.map((v, i) => (v - mn[i]) * 1000).map(v => v.toFixed(1))).join(' x '), 'mm', fs.statSync(out).size, 'bytes');

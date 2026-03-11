/**
 * Single-side Injection Mold (Cavity Half) 3D Model Generator
 * One plate with a product cavity, guide pin holes, bolt holes, cooling ports.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateBox(sx, sy, sz, ox = 0, oy = 0, oz = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2, positions = [], normals = [], indices = [];
    const faces = [
        { n: [0, 0, -1], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz]] },
        { n: [0, 0, 1], v: [[-hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz], [hx, -hy, hz]] },
        { n: [0, -1, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz]] },
        { n: [0, 1, 0], v: [[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]] },
        { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, hy, -hz], [-hx, hy, hz], [-hx, -hy, hz]] },
        { n: [1, 0, 0], v: [[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
    ];
    for (const f of faces) {
        const b = positions.length / 3;
        for (const v of f.v) { positions.push(v[0] + ox, v[1] + oy, v[2] + oz); normals.push(f.n[0], f.n[1], f.n[2]); }
        indices.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    return { positions, normals, indices };
}

function generateCylinder(r, h, s, ox = 0, oy = 0, oz = 0) {
    const positions = [], normals = [], indices = [], hy = h / 2;
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, x = Math.cos(t) * r, z = Math.sin(t) * r, nx = Math.cos(t), nz = Math.sin(t);
        positions.push(x + ox, -hy + oy, z + oz); normals.push(nx, 0, nz); positions.push(x + ox, hy + oy, z + oz); normals.push(nx, 0, nz);
    }
    for (let i = 0; i < s; i++) { const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3; indices.push(a, c, b); indices.push(b, c, d); }
    let ci = positions.length / 3; positions.push(ox, hy + oy, oz); normals.push(0, 1, 0);
    for (let i = 0; i <= s; i++) { const t = (i / s) * Math.PI * 2; positions.push(Math.cos(t) * r + ox, hy + oy, Math.sin(t) * r + oz); normals.push(0, 1, 0); }
    for (let i = 0; i < s; i++)indices.push(ci, ci + 1 + i, ci + 1 + i + 1);
    ci = positions.length / 3; positions.push(ox, -hy + oy, oz); normals.push(0, -1, 0);
    for (let i = 0; i <= s; i++) { const t = (i / s) * Math.PI * 2; positions.push(Math.cos(t) * r + ox, -hy + oy, Math.sin(t) * r + oz); normals.push(0, -1, 0); }
    for (let i = 0; i < s; i++)indices.push(ci, ci + 1 + i + 1, ci + 1 + i);
    return { positions, normals, indices };
}

function buildGLB(meshes) {
    const allP = [], allN = [], allI = [], mD = [], acc = [], bv = [], mats = []; const mMap = new Map(); let cOff = 0;
    for (const m of meshes) {
        const mk = JSON.stringify(m.material); let mi;
        if (mMap.has(mk)) { mi = mMap.get(mk); } else { mi = mats.length; mMap.set(mk, mi); mats.push({ pbrMetallicRoughness: { baseColorFactor: [m.material.r, m.material.g, m.material.b, 1], metallicFactor: m.material.metallic, roughnessFactor: m.material.roughness } }); }
        const mx = Math.max(...m.indices), u32 = mx > 65535, iD = u32 ? new Uint32Array(m.indices) : new Uint16Array(m.indices);
        bv.push({ buffer: 0, byteOffset: cOff, byteLength: iD.byteLength, target: 34963 });
        acc.push({ bufferView: bv.length - 1, componentType: u32 ? 5125 : 5123, count: m.indices.length, type: 'SCALAR', max: [mx], min: [Math.min(...m.indices)] });
        const iA = acc.length - 1; allI.push({ data: iD, offset: cOff }); cOff += iD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        const pD = new Float32Array(m.positions); bv.push({ buffer: 0, byteOffset: cOff, byteLength: pD.byteLength, target: 34962 });
        let pn = [Infinity, Infinity, Infinity], px = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < m.positions.length; i += 3)for (let j = 0; j < 3; j++) { pn[j] = Math.min(pn[j], m.positions[i + j]); px[j] = Math.max(px[j], m.positions[i + j]); }
        acc.push({ bufferView: bv.length - 1, componentType: 5126, count: m.positions.length / 3, type: 'VEC3', max: px, min: pn });
        const pA = acc.length - 1; allP.push({ data: pD, offset: cOff }); cOff += pD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        const nD = new Float32Array(m.normals); bv.push({ buffer: 0, byteOffset: cOff, byteLength: nD.byteLength, target: 34962 });
        acc.push({ bufferView: bv.length - 1, componentType: 5126, count: m.normals.length / 3, type: 'VEC3' });
        const nA = acc.length - 1; allN.push({ data: nD, offset: cOff }); cOff += nD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        mD.push({ primitives: [{ attributes: { POSITION: pA, NORMAL: nA }, indices: iA, material: mi }] });
    }
    const tB = cOff, buf = new ArrayBuffer(tB); new Uint8Array(buf).fill(0);
    for (const it of allI) { if (it.data instanceof Uint32Array) new Uint32Array(buf, it.offset, it.data.length).set(it.data); else new Uint16Array(buf, it.offset, it.data.length).set(it.data); }
    for (const it of allP) new Float32Array(buf, it.offset, it.data.length).set(it.data);
    for (const it of allN) new Float32Array(buf, it.offset, it.data.length).set(it.data);
    const nodes = mD.map((_, i) => ({ mesh: i, name: meshes[i].name || `m${i}` }));
    const g = { asset: { version: '2.0', generator: 'MoldGen' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: mD, accessors: acc, bufferViews: bv, buffers: [{ byteLength: tB }], materials: mats };
    const js = JSON.stringify(g), jp = js + ' '.repeat((4 - (js.length % 4)) % 4), jB = Buffer.from(jp, 'utf8'), bB = Buffer.from(buf);
    let bp = bB.length; if (bp % 4) bp += 4 - (bp % 4); const tot = 12 + 8 + jB.length + 8 + bp, gl = Buffer.alloc(tot); let o = 0;
    gl.writeUInt32LE(0x46546C67, o); o += 4; gl.writeUInt32LE(2, o); o += 4; gl.writeUInt32LE(tot, o); o += 4;
    gl.writeUInt32LE(jB.length, o); o += 4; gl.writeUInt32LE(0x4E4F534A, o); o += 4; jB.copy(gl, o); o += jB.length;
    gl.writeUInt32LE(bp, o); o += 4; gl.writeUInt32LE(0x004E4942, o); o += 4; bB.copy(gl, o);
    return gl;
}

function main() {
    console.log('🔧 Generating Single-side Mold...');
    const steel = { r: 0.62, g: 0.65, b: 0.70, metallic: 0.92, roughness: 0.12 };
    const dark = { r: 0.40, g: 0.42, b: 0.46, metallic: 0.85, roughness: 0.25 };
    const cavity = { r: 0.72, g: 0.74, b: 0.78, metallic: 0.95, roughness: 0.06 };
    const copper = { r: 0.72, g: 0.45, b: 0.20, metallic: 0.80, roughness: 0.30 };
    const meshes = [];

    // Main plate
    const W = 0.22, H = 0.07, D = 0.16;
    meshes.push({ ...generateBox(W, H, D), material: steel, name: 'plate' });

    // Cavity (recessed pocket on top face) — rounded rectangle approximated by boxes
    const cavW = 0.10, cavD = 0.07, cavH = 0.018;
    meshes.push({ ...generateBox(cavW, cavH, cavD, 0, H / 2 - cavH / 2 + 0.001, 0), material: cavity, name: 'cavity_main' });
    // Deeper center pocket
    meshes.push({ ...generateBox(cavW * 0.7, cavH * 0.6, cavD * 0.7, 0, H / 2 - cavH + 0.001, 0), material: cavity, name: 'cavity_deep' });

    // Runner channel (groove from cavity to edge)
    meshes.push({ ...generateBox(0.008, 0.006, D / 2 + 0.01, 0, H / 2 - 0.002, D / 4 - 0.01), material: cavity, name: 'runner' });

    // Sprue hole (center top)
    meshes.push({ ...generateCylinder(0.006, 0.015, 24, 0, H / 2 + 0.0075, 0), material: dark, name: 'sprue' });

    // Guide pin holes (4 corners)
    const gpX = W / 2 - 0.022, gpZ = D / 2 - 0.022;
    [[gpX, gpZ], [-gpX, gpZ], [gpX, -gpZ], [-gpX, -gpZ]].forEach((p, i) => {
        meshes.push({ ...generateCylinder(0.009, H + 0.002, 24, p[0], 0, p[1]), material: dark, name: `guide_hole_${i}` });
        // Bronze bushing ring on top
        meshes.push({ ...generateCylinder(0.013, 0.006, 24, p[0], H / 2 + 0.003, p[1]), material: copper, name: `bushing_${i}` });
    });

    // Bolt holes on top surface (hex heads)
    const bX = 0.055, bZ = 0.045;
    [[bX, bZ], [-bX, bZ], [bX, -bZ], [-bX, -bZ]].forEach((p, i) => {
        meshes.push({ ...generateCylinder(0.007, 0.005, 6, p[0], H / 2 + 0.0025, p[1]), material: dark, name: `bolt_${i}` });
    });

    // Cooling port nubs (side face)
    [0.03, -0.02].forEach((z, i) => {
        meshes.push({ ...generateCylinder(0.005, 0.012, 16, W / 2 + 0.006, 0.005, z), material: copper, name: `cool_${i}` });
    });

    // Ejector pin marks on bottom (small circles)
    [[0.02, 0.015], [-0.02, 0.015], [0.02, -0.015], [-0.02, -0.015], [0, 0]].forEach((p, i) => {
        meshes.push({ ...generateCylinder(0.004, 0.003, 16, p[0], -H / 2 - 0.0015, p[1]), material: dark, name: `ej_pin_${i}` });
    });

    console.log(`   Generated ${meshes.length} parts`);
    const glb = buildGLB(meshes);
    const outDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'injection_mold.glb');
    fs.writeFileSync(outPath, glb);
    console.log(`✅ Saved: ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`);
}

main();

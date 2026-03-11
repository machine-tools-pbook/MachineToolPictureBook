/**
 * Spindle Housing 3D Model Generator
 * A cylindrical housing with flanges, bearing seats, bolt holes, and cooling fins.
 * Typical part finished by a grinding machine (precision bore/OD surfaces).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateCylinder(r, h, s, ox = 0, oy = 0, oz = 0) {
    const p = [], n = [], idx = [], hy = h / 2;
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, x = Math.cos(t) * r, z = Math.sin(t) * r;
        p.push(x + ox, -hy + oy, z + oz); n.push(Math.cos(t), 0, Math.sin(t));
        p.push(x + ox, hy + oy, z + oz); n.push(Math.cos(t), 0, Math.sin(t));
    }
    for (let i = 0; i < s; i++) { const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3; idx.push(a, c, b, b, c, d); }
    let ci = p.length / 3; p.push(ox, hy + oy, oz); n.push(0, 1, 0);
    for (let i = 0; i <= s; i++) { const t = (i / s) * Math.PI * 2; p.push(Math.cos(t) * r + ox, hy + oy, Math.sin(t) * r + oz); n.push(0, 1, 0); }
    for (let i = 0; i < s; i++)idx.push(ci, ci + 1 + i, ci + 1 + i + 1);
    ci = p.length / 3; p.push(ox, -hy + oy, oz); n.push(0, -1, 0);
    for (let i = 0; i <= s; i++) { const t = (i / s) * Math.PI * 2; p.push(Math.cos(t) * r + ox, -hy + oy, Math.sin(t) * r + oz); n.push(0, -1, 0); }
    for (let i = 0; i < s; i++)idx.push(ci, ci + 1 + i + 1, ci + 1 + i);
    return { positions: p, normals: n, indices: idx };
}

function generateHollowCyl(oR, iR, h, s, ox = 0, oy = 0, oz = 0) {
    const p = [], n = [], idx = [], hy = h / 2;
    // Outer
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
        p.push(c * oR + ox, -hy + oy, si * oR + oz); n.push(c, 0, si); p.push(c * oR + ox, hy + oy, si * oR + oz); n.push(c, 0, si);
    }
    for (let i = 0; i < s; i++) { const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3; idx.push(a, c, b, b, c, d); }
    // Inner
    const ib = p.length / 3;
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
        p.push(c * iR + ox, -hy + oy, si * iR + oz); n.push(-c, 0, -si); p.push(c * iR + ox, hy + oy, si * iR + oz); n.push(-c, 0, -si);
    }
    for (let i = 0; i < s; i++) { const a = ib + i * 2, b = ib + i * 2 + 1, c = ib + i * 2 + 2, d = ib + i * 2 + 3; idx.push(a, b, c, b, d, c); }
    // Top ring
    const tb = p.length / 3;
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
        p.push(c * oR + ox, hy + oy, si * oR + oz); n.push(0, 1, 0); p.push(c * iR + ox, hy + oy, si * iR + oz); n.push(0, 1, 0);
    }
    for (let i = 0; i < s; i++) { const a = tb + i * 2, b = tb + i * 2 + 1, c = tb + i * 2 + 2, d = tb + i * 2 + 3; idx.push(a, c, b, b, c, d); }
    // Bottom ring
    const bb = p.length / 3;
    for (let i = 0; i <= s; i++) {
        const t = (i / s) * Math.PI * 2, c = Math.cos(t), si = Math.sin(t);
        p.push(c * oR + ox, -hy + oy, si * oR + oz); n.push(0, -1, 0); p.push(c * iR + ox, -hy + oy, si * iR + oz); n.push(0, -1, 0);
    }
    for (let i = 0; i < s; i++) { const a = bb + i * 2, b = bb + i * 2 + 1, c = bb + i * 2 + 2, d = bb + i * 2 + 3; idx.push(a, b, c, b, d, c); }
    return { positions: p, normals: n, indices: idx };
}

function buildGLB(meshes) {
    const allP = [], allN = [], allI = [], mD = [], acc = [], bv = [], mats = []; const mMap = new Map(); let cOff = 0;
    for (const m of meshes) {
        const mk = JSON.stringify(m.material); let mi;
        if (mMap.has(mk)) mi = mMap.get(mk); else { mi = mats.length; mMap.set(mk, mi); mats.push({ pbrMetallicRoughness: { baseColorFactor: [m.material.r, m.material.g, m.material.b, 1], metallicFactor: m.material.metallic, roughnessFactor: m.material.roughness } }); }
        const mx = Math.max(...m.indices), u32 = mx > 65535, iD = u32 ? new Uint32Array(m.indices) : new Uint16Array(m.indices);
        bv.push({ buffer: 0, byteOffset: cOff, byteLength: iD.byteLength, target: 34963 });
        acc.push({ bufferView: bv.length - 1, componentType: u32 ? 5125 : 5123, count: m.indices.length, type: 'SCALAR', max: [mx], min: [Math.min(...m.indices)] });
        allI.push({ data: iD, offset: cOff }); cOff += iD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        const pD = new Float32Array(m.positions); bv.push({ buffer: 0, byteOffset: cOff, byteLength: pD.byteLength, target: 34962 });
        let pn = [Infinity, Infinity, Infinity], px = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < m.positions.length; i += 3)for (let j = 0; j < 3; j++) { pn[j] = Math.min(pn[j], m.positions[i + j]); px[j] = Math.max(px[j], m.positions[i + j]); }
        acc.push({ bufferView: bv.length - 1, componentType: 5126, count: m.positions.length / 3, type: 'VEC3', max: px, min: pn });
        allP.push({ data: pD, offset: cOff }); cOff += pD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        const nD = new Float32Array(m.normals); bv.push({ buffer: 0, byteOffset: cOff, byteLength: nD.byteLength, target: 34962 });
        acc.push({ bufferView: bv.length - 1, componentType: 5126, count: m.normals.length / 3, type: 'VEC3' });
        allN.push({ data: nD, offset: cOff }); cOff += nD.byteLength; if (cOff % 4) cOff += 4 - (cOff % 4);
        mD.push({ primitives: [{ attributes: { POSITION: acc.length - 2, NORMAL: acc.length - 1 }, indices: acc.length - 3, material: mi }] });
    }
    const tB = cOff, buf = new ArrayBuffer(tB); new Uint8Array(buf).fill(0);
    for (const it of allI) { if (it.data instanceof Uint32Array) new Uint32Array(buf, it.offset, it.data.length).set(it.data); else new Uint16Array(buf, it.offset, it.data.length).set(it.data); }
    for (const it of allP) new Float32Array(buf, it.offset, it.data.length).set(it.data);
    for (const it of allN) new Float32Array(buf, it.offset, it.data.length).set(it.data);
    const nodes = mD.map((_, i) => ({ mesh: i, name: meshes[i].name || `m${i}` }));
    const g = { asset: { version: '2.0', generator: 'SpindleHousingGen' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: mD, accessors: acc, bufferViews: bv, buffers: [{ byteLength: tB }], materials: mats };
    const js = JSON.stringify(g), jp = js + ' '.repeat((4 - (js.length % 4)) % 4), jB = Buffer.from(jp, 'utf8'), bB = Buffer.from(buf);
    let bp = bB.length; if (bp % 4) bp += 4 - (bp % 4); const tot = 12 + 8 + jB.length + 8 + bp, gl = Buffer.alloc(tot); let o = 0;
    gl.writeUInt32LE(0x46546C67, o); o += 4; gl.writeUInt32LE(2, o); o += 4; gl.writeUInt32LE(tot, o); o += 4;
    gl.writeUInt32LE(jB.length, o); o += 4; gl.writeUInt32LE(0x4E4F534A, o); o += 4; jB.copy(gl, o); o += jB.length;
    gl.writeUInt32LE(bp, o); o += 4; gl.writeUInt32LE(0x004E4942, o); o += 4; bB.copy(gl, o);
    return gl;
}

function main() {
    console.log('🔧 Generating Spindle Housing 3D model...');

    const bodySteel = { r: 0.62, g: 0.65, b: 0.70, metallic: 0.92, roughness: 0.10 };
    const flangeSteel = { r: 0.55, g: 0.58, b: 0.63, metallic: 0.88, roughness: 0.18 };
    const boreFinish = { r: 0.75, g: 0.78, b: 0.82, metallic: 0.96, roughness: 0.04 }; // mirror-polished bore
    const darkSteel = { r: 0.38, g: 0.40, b: 0.44, metallic: 0.85, roughness: 0.28 };
    const copperPort = { r: 0.72, g: 0.45, b: 0.20, metallic: 0.80, roughness: 0.30 };

    const meshes = [];
    const SEG = 48;

    // === Main body (hollow cylinder) ===
    const bodyOuter = 0.055, bodyInner = 0.038, bodyH = 0.18;
    meshes.push({ ...generateHollowCyl(bodyOuter, bodyInner, bodyH, SEG), material: bodySteel, name: 'body' });

    // === Precision bore insert (slightly different color to show ground surface) ===
    meshes.push({ ...generateHollowCyl(bodyInner + 0.001, bodyInner - 0.003, bodyH * 0.85, SEG, 0, 0, 0), material: boreFinish, name: 'bore_surface' });

    // === Front flange (large disc at front end) ===
    const flangeR = 0.085, flangeH = 0.015;
    meshes.push({ ...generateHollowCyl(flangeR, bodyInner, flangeH, SEG, 0, bodyH / 2 - flangeH / 2, 0), material: flangeSteel, name: 'front_flange' });

    // === Rear flange ===
    const rearFlangeR = 0.075;
    meshes.push({ ...generateHollowCyl(rearFlangeR, bodyInner, flangeH, SEG, 0, -bodyH / 2 + flangeH / 2, 0), material: flangeSteel, name: 'rear_flange' });

    // === Bolt holes on front flange (8 bolts in circle) ===
    const boltCircleR = 0.070;
    const numBolts = 8;
    for (let i = 0; i < numBolts; i++) {
        const angle = (i / numBolts) * Math.PI * 2;
        const bx = Math.cos(angle) * boltCircleR;
        const bz = Math.sin(angle) * boltCircleR;
        meshes.push({
            ...generateCylinder(0.005, 0.005, 6, bx, bodyH / 2 + 0.001, bz),
            material: darkSteel, name: `bolt_${i}`
        });
    }

    // === Bolt holes on rear flange (6 bolts) ===
    const rearBoltR = 0.060;
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const bx = Math.cos(angle) * rearBoltR;
        const bz = Math.sin(angle) * rearBoltR;
        meshes.push({
            ...generateCylinder(0.004, 0.005, 6, bx, -bodyH / 2 - 0.001, bz),
            material: darkSteel, name: `rear_bolt_${i}`
        });
    }

    // === Bearing retaining ring grooves (visual rings on body) ===
    [0.06, -0.04].forEach((y, i) => {
        meshes.push({
            ...generateHollowCyl(bodyOuter + 0.003, bodyOuter - 0.001, 0.006, SEG, 0, y, 0),
            material: darkSteel, name: `retaining_ring_${i}`
        });
    });

    // === Cooling/lubrication ports (copper nubs on body side) ===
    const portAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
    const portY = 0.02;
    portAngles.forEach((angle, i) => {
        const px = Math.cos(angle) * (bodyOuter + 0.006);
        const pz = Math.sin(angle) * (bodyOuter + 0.006);
        meshes.push({
            ...generateCylinder(0.005, 0.012, 16, px, portY, pz),
            material: copperPort, name: `oil_port_${i}`
        });
    });

    // === Stepped bore sections (show bearing seats inside) ===
    // Front bearing seat (slightly wider)
    meshes.push({
        ...generateHollowCyl(bodyInner + 0.004, bodyInner - 0.003, 0.025, SEG, 0, bodyH / 2 - flangeH - 0.0125, 0),
        material: boreFinish, name: 'front_bearing_seat'
    });
    // Rear bearing seat
    meshes.push({
        ...generateHollowCyl(bodyInner + 0.003, bodyInner - 0.003, 0.020, SEG, 0, -bodyH / 2 + flangeH + 0.010, 0),
        material: boreFinish, name: 'rear_bearing_seat'
    });

    // === Nose / locating spigot (front protrusion) ===
    const noseR = 0.045, noseH = 0.012;
    meshes.push({
        ...generateHollowCyl(noseR, bodyInner - 0.003, noseH, SEG, 0, bodyH / 2 + flangeH / 2 + noseH / 2, 0),
        material: bodySteel, name: 'nose_spigot'
    });

    console.log(`   Generated ${meshes.length} parts`);

    const glb = buildGLB(meshes);
    const outDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'spindle_housing.glb');
    fs.writeFileSync(outPath, glb);
    console.log(`✅ Saved: ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`);
}

main();

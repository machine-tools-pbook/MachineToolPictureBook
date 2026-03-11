/**
 * Impeller 3D Model Generator
 * Generates a centrifugal impeller with curved blades, hub, and shroud ring.
 * Typical part made by 5-axis machining.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Geometry helpers
// ============================================================
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

/**
 * Generate a single curved blade.
 * Each blade is a thin curved surface swept from hub to tip with twist.
 */
function generateBlade(bladeIndex, totalBlades, hubRadius, tipRadius, bladeHeight, thickness) {
    const positions = [];
    const normals = [];
    const indices = [];

    const angleOffset = (bladeIndex / totalBlades) * Math.PI * 2;
    const radialSteps = 12;   // from hub to tip
    const heightSteps = 8;    // along blade height
    const twistAngle = Math.PI * 0.35; // blade twist from bottom to top
    const curveAngle = Math.PI * 0.25; // backward curve

    // Generate two surfaces (front and back of blade) for thickness
    for (let side = 0; side < 2; side++) {
        const sideOffset = (side === 0 ? 1 : -1) * thickness / 2;
        const normalSign = side === 0 ? 1 : -1;
        const baseVtx = positions.length / 3;

        for (let ri = 0; ri <= radialSteps; ri++) {
            const rFrac = ri / radialSteps;
            const r = hubRadius + (tipRadius - hubRadius) * rFrac;

            for (let hi = 0; hi <= heightSteps; hi++) {
                const hFrac = hi / heightSteps;
                const y = -bladeHeight / 2 + bladeHeight * hFrac;

                // Blade angle: base angle + twist along height + backward curve along radius
                const angle = angleOffset + twistAngle * hFrac + curveAngle * rFrac;

                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;

                // Offset perpendicular to blade surface for thickness
                // Normal direction (perpendicular to blade tangent)
                const tangentAngle = angle + Math.PI / 2;
                const nx = Math.cos(tangentAngle) * normalSign;
                const nz = Math.sin(tangentAngle) * normalSign;

                positions.push(
                    x + Math.cos(tangentAngle) * sideOffset,
                    y,
                    z + Math.sin(tangentAngle) * sideOffset
                );
                normals.push(nx, 0, nz);
            }
        }

        // Generate indices for this side
        const hS = heightSteps + 1;
        for (let ri = 0; ri < radialSteps; ri++) {
            for (let hi = 0; hi < heightSteps; hi++) {
                const a = baseVtx + ri * hS + hi;
                const b = baseVtx + ri * hS + hi + 1;
                const c = baseVtx + (ri + 1) * hS + hi;
                const d = baseVtx + (ri + 1) * hS + hi + 1;
                if (side === 0) {
                    indices.push(a, b, c);
                    indices.push(b, d, c);
                } else {
                    indices.push(a, c, b);
                    indices.push(b, c, d);
                }
            }
        }
    }

    // Tip edge (connect front and back at outer edge)
    const tipBase = positions.length / 3;
    const hS = heightSteps + 1;
    for (let hi = 0; hi <= heightSteps; hi++) {
        const hFrac = hi / heightSteps;
        const y = -bladeHeight / 2 + bladeHeight * hFrac;
        const angle = angleOffset + twistAngle * hFrac + curveAngle;
        const r = tipRadius;

        for (let side = 0; side < 2; side++) {
            const sideOff = (side === 0 ? 1 : -1) * thickness / 2;
            const tangentAngle = angle + Math.PI / 2;
            positions.push(
                Math.cos(angle) * r + Math.cos(tangentAngle) * sideOff,
                y,
                Math.sin(angle) * r + Math.sin(tangentAngle) * sideOff
            );
            // Outward normal at tip
            normals.push(Math.cos(angle), 0, Math.sin(angle));
        }
    }
    for (let hi = 0; hi < heightSteps; hi++) {
        const a = tipBase + hi * 2;
        const b = tipBase + hi * 2 + 1;
        const c = tipBase + (hi + 1) * 2;
        const d = tipBase + (hi + 1) * 2 + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    return { positions, normals, indices };
}

/**
 * Generate a disc (flat cylinder, used for hub disc and shroud)
 */
function generateDisc(innerR, outerR, y, segments, thickness = 0.004) {
    const positions = [];
    const normals = [];
    const indices = [];
    const ht = thickness / 2;

    // Top face ring
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const c = Math.cos(t), s = Math.sin(t);
        positions.push(c * outerR, y + ht, s * outerR); normals.push(0, 1, 0);
        positions.push(c * innerR, y + ht, s * innerR); normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
        const a = i * 2, b = i * 2 + 1, c2 = i * 2 + 2, d = i * 2 + 3;
        indices.push(a, c2, b); indices.push(b, c2, d);
    }

    // Bottom face ring
    const bBase = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const c = Math.cos(t), s = Math.sin(t);
        positions.push(c * outerR, y - ht, s * outerR); normals.push(0, -1, 0);
        positions.push(c * innerR, y - ht, s * innerR); normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) {
        const a = bBase + i * 2, b = bBase + i * 2 + 1, c2 = bBase + i * 2 + 2, d = bBase + i * 2 + 3;
        indices.push(a, b, c2); indices.push(b, d, c2);
    }

    // Outer rim
    const oBase = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const c = Math.cos(t), s = Math.sin(t);
        positions.push(c * outerR, y + ht, s * outerR); normals.push(c, 0, s);
        positions.push(c * outerR, y - ht, s * outerR); normals.push(c, 0, s);
    }
    for (let i = 0; i < segments; i++) {
        const a = oBase + i * 2, b = oBase + i * 2 + 1, c2 = oBase + i * 2 + 2, d = oBase + i * 2 + 3;
        indices.push(a, c2, b); indices.push(b, c2, d);
    }

    return { positions, normals, indices };
}

// ============================================================
// GLB builder
// ============================================================
function buildGLB(meshes) {
    const allP = [], allN = [], allI = [], mD = [], acc = [], bv = [], mats = []; const mMap = new Map(); let cOff = 0;
    for (const m of meshes) {
        const mk = JSON.stringify(m.material); let mi;
        if (mMap.has(mk)) { mi = mMap.get(mk); } else { mi = mats.length; mMap.set(mk, mi); mats.push({ pbrMetallicRoughness: { baseColorFactor: [m.material.r, m.material.g, m.material.b, 1], metallicFactor: m.material.metallic, roughnessFactor: m.material.roughness }, doubleSided: !!m.material.doubleSided }); }
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
    const g = { asset: { version: '2.0', generator: 'ImpellerGen' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: mD, accessors: acc, bufferViews: bv, buffers: [{ byteLength: tB }], materials: mats };
    const js = JSON.stringify(g), jp = js + ' '.repeat((4 - (js.length % 4)) % 4), jB = Buffer.from(jp, 'utf8'), bB = Buffer.from(buf);
    let bp = bB.length; if (bp % 4) bp += 4 - (bp % 4); const tot = 12 + 8 + jB.length + 8 + bp, gl = Buffer.alloc(tot); let o = 0;
    gl.writeUInt32LE(0x46546C67, o); o += 4; gl.writeUInt32LE(2, o); o += 4; gl.writeUInt32LE(tot, o); o += 4;
    gl.writeUInt32LE(jB.length, o); o += 4; gl.writeUInt32LE(0x4E4F534A, o); o += 4; jB.copy(gl, o); o += jB.length;
    gl.writeUInt32LE(bp, o); o += 4; gl.writeUInt32LE(0x004E4942, o); o += 4; bB.copy(gl, o);
    return gl;
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log('🔧 Generating Impeller 3D model...');

    const bladeMetal = { r: 0.75, g: 0.78, b: 0.82, metallic: 0.95, roughness: 0.08, doubleSided: true };
    const hubMetal = { r: 0.60, g: 0.63, b: 0.68, metallic: 0.90, roughness: 0.15 };
    const boreMetal = { r: 0.50, g: 0.52, b: 0.56, metallic: 0.85, roughness: 0.25 };

    const meshes = [];

    const numBlades = 7;
    const hubRadius = 0.025;
    const tipRadius = 0.09;
    const bladeHeight = 0.04;
    const bladeThickness = 0.003;

    // Hub cylinder (center)
    meshes.push({
        ...generateCylinder(hubRadius, bladeHeight * 1.2, 32),
        material: hubMetal, name: 'hub'
    });

    // Hub bore (center hole)
    meshes.push({
        ...generateCylinder(0.010, bladeHeight * 1.3, 24),
        material: boreMetal, name: 'bore'
    });

    // Hub disc (bottom plate connecting blades)
    meshes.push({
        ...generateDisc(hubRadius, tipRadius * 0.95, -bladeHeight / 2, 48, 0.005),
        material: hubMetal, name: 'hub_disc'
    });

    // Blades
    for (let i = 0; i < numBlades; i++) {
        const blade = generateBlade(i, numBlades, hubRadius, tipRadius, bladeHeight, bladeThickness);
        meshes.push({ ...blade, material: bladeMetal, name: `blade_${i}` });
    }

    // Shroud ring (top outer ring, partial - open impeller style)
    meshes.push({
        ...generateDisc(tipRadius * 0.7, tipRadius, bladeHeight / 2 - 0.002, 48, 0.003),
        material: hubMetal, name: 'shroud_ring'
    });

    // Keyway slot on bore
    const kwPositions = [], kwNormals = [], kwIndices = [];
    const kwW = 0.004, kwD = 0.005, kwH = bladeHeight * 1.2;
    const kwHx = kwW / 2, kwHy = kwH / 2, kwR = 0.010;
    // Simple box at bore surface
    const faces = [
        { n: [0, 0, -1], v: [[-kwHx, -kwHy, kwR], [kwHx, -kwHy, kwR], [kwHx, kwHy, kwR], [-kwHx, kwHy, kwR]] },
        { n: [0, 0, 1], v: [[-kwHx, -kwHy, kwR + kwD], [-kwHx, kwHy, kwR + kwD], [kwHx, kwHy, kwR + kwD], [kwHx, -kwHy, kwR + kwD]] },
        { n: [0, -1, 0], v: [[-kwHx, -kwHy, kwR], [-kwHx, -kwHy, kwR + kwD], [kwHx, -kwHy, kwR + kwD], [kwHx, -kwHy, kwR]] },
        { n: [0, 1, 0], v: [[-kwHx, kwHy, kwR], [kwHx, kwHy, kwR], [kwHx, kwHy, kwR + kwD], [-kwHx, kwHy, kwR + kwD]] },
        { n: [-1, 0, 0], v: [[-kwHx, -kwHy, kwR], [-kwHx, kwHy, kwR], [-kwHx, kwHy, kwR + kwD], [-kwHx, -kwHy, kwR + kwD]] },
        { n: [1, 0, 0], v: [[kwHx, -kwHy, kwR], [kwHx, -kwHy, kwR + kwD], [kwHx, kwHy, kwR + kwD], [kwHx, kwHy, kwR]] },
    ];
    for (const f of faces) { const b = kwPositions.length / 3; for (const v of f.v) { kwPositions.push(...v); kwNormals.push(...f.n); } kwIndices.push(b, b + 1, b + 2, b, b + 2, b + 3); }
    meshes.push({ positions: kwPositions, normals: kwNormals, indices: kwIndices, material: boreMetal, name: 'keyway' });

    console.log(`   Generated ${meshes.length} parts`);

    const glb = buildGLB(meshes);

    const outDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'impeller.glb');
    fs.writeFileSync(outPath, glb);
    console.log(`✅ Saved: ${outPath} (${(glb.length / 1024).toFixed(1)} KB)`);
}

main();

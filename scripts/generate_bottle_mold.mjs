/**
 * Injection Mold 3D Model Generator
 * Generates a typical injection mold (2-plate mold) as a GLB file.
 * - Upper plate (cavity side) and lower plate (core side)
 * - Guide pins at corners
 * - Simple rectangular cavity
 * - Sprue bushing / locating ring on top
 * - Ejector pins on bottom
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Geometry helpers
// ============================================================

function generateBox(sx, sy, sz, ox = 0, oy = 0, oz = 0) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const positions = [];
    const normals = [];
    const indices = [];

    const faces = [
        { n: [0, 0, -1], verts: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz]] },
        { n: [0, 0, 1], verts: [[-hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz], [hx, -hy, hz]] },
        { n: [0, -1, 0], verts: [[-hx, -hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz]] },
        { n: [0, 1, 0], verts: [[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]] },
        { n: [-1, 0, 0], verts: [[-hx, -hy, -hz], [-hx, hy, -hz], [-hx, hy, hz], [-hx, -hy, hz]] },
        { n: [1, 0, 0], verts: [[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]] },
    ];

    for (const face of faces) {
        const base = positions.length / 3;
        for (const v of face.verts) {
            positions.push(v[0] + ox, v[1] + oy, v[2] + oz);
            normals.push(face.n[0], face.n[1], face.n[2]);
        }
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    return { positions, normals, indices };
}

function generateCylinder(radius, height, segments, ox = 0, oy = 0, oz = 0) {
    const positions = [];
    const normals = [];
    const indices = [];
    const hy = height / 2;

    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t) * radius, z = Math.sin(t) * radius;
        const nx = Math.cos(t), nz = Math.sin(t);
        positions.push(x + ox, -hy + oy, z + oz); normals.push(nx, 0, nz);
        positions.push(x + ox, hy + oy, z + oz); normals.push(nx, 0, nz);
    }
    for (let i = 0; i < segments; i++) {
        const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
        indices.push(a, c, b); indices.push(b, c, d);
    }

    // Top cap
    let cIdx = positions.length / 3;
    positions.push(ox, hy + oy, oz); normals.push(0, 1, 0);
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(t) * radius + ox, hy + oy, Math.sin(t) * radius + oz);
        normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) indices.push(cIdx, cIdx + 1 + i, cIdx + 1 + i + 1);

    // Bottom cap
    cIdx = positions.length / 3;
    positions.push(ox, -hy + oy, oz); normals.push(0, -1, 0);
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(t) * radius + ox, -hy + oy, Math.sin(t) * radius + oz);
        normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) indices.push(cIdx, cIdx + 1 + i + 1, cIdx + 1 + i);

    return { positions, normals, indices };
}

/** Hollow cylinder (ring/tube) */
function generateHollowCylinder(outerR, innerR, height, segments, ox = 0, oy = 0, oz = 0) {
    const positions = [];
    const normals = [];
    const indices = [];
    const hy = height / 2;

    // Outer surface
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t), z = Math.sin(t);
        positions.push(x * outerR + ox, -hy + oy, z * outerR + oz); normals.push(x, 0, z);
        positions.push(x * outerR + ox, hy + oy, z * outerR + oz); normals.push(x, 0, z);
    }
    for (let i = 0; i < segments; i++) {
        const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
        indices.push(a, c, b); indices.push(b, c, d);
    }

    // Inner surface (normals inward)
    const innerBase = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t), z = Math.sin(t);
        positions.push(x * innerR + ox, -hy + oy, z * innerR + oz); normals.push(-x, 0, -z);
        positions.push(x * innerR + ox, hy + oy, z * innerR + oz); normals.push(-x, 0, -z);
    }
    for (let i = 0; i < segments; i++) {
        const a = innerBase + i * 2, b = innerBase + i * 2 + 1, c = innerBase + i * 2 + 2, d = innerBase + i * 2 + 3;
        indices.push(a, b, c); indices.push(b, d, c);
    }

    // Top ring
    const topBase = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t), z = Math.sin(t);
        positions.push(x * outerR + ox, hy + oy, z * outerR + oz); normals.push(0, 1, 0);
        positions.push(x * innerR + ox, hy + oy, z * innerR + oz); normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
        const a = topBase + i * 2, b = topBase + i * 2 + 1, c = topBase + i * 2 + 2, d = topBase + i * 2 + 3;
        indices.push(a, c, b); indices.push(b, c, d);
    }

    // Bottom ring
    const botBase = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t), z = Math.sin(t);
        positions.push(x * outerR + ox, -hy + oy, z * outerR + oz); normals.push(0, -1, 0);
        positions.push(x * innerR + ox, -hy + oy, z * innerR + oz); normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) {
        const a = botBase + i * 2, b = botBase + i * 2 + 1, c = botBase + i * 2 + 2, d = botBase + i * 2 + 3;
        indices.push(a, b, c); indices.push(b, d, c);
    }

    return { positions, normals, indices };
}

// ============================================================
// GLB builder (same as other scripts)
// ============================================================
function buildGLB(meshes) {
    const allPositions = [], allNormals = [], allIndices = [];
    const meshDefs = [], accessors = [], bufferViews = [], materials = [];
    const materialMap = new Map();
    let currentByteOffset = 0;

    for (const mesh of meshes) {
        const matKey = JSON.stringify(mesh.material);
        let matIdx;
        if (materialMap.has(matKey)) { matIdx = materialMap.get(matKey); }
        else {
            matIdx = materials.length;
            materialMap.set(matKey, matIdx);
            materials.push({
                pbrMetallicRoughness: {
                    baseColorFactor: [mesh.material.r, mesh.material.g, mesh.material.b, 1.0],
                    metallicFactor: mesh.material.metallic,
                    roughnessFactor: mesh.material.roughness,
                },
                ...(mesh.material.doubleSided ? { doubleSided: true } : {}),
            });
        }

        const maxIndex = Math.max(...mesh.indices);
        const use32 = maxIndex > 65535;
        const indexData = use32 ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices);
        bufferViews.push({ buffer: 0, byteOffset: currentByteOffset, byteLength: indexData.byteLength, target: 34963 });
        accessors.push({ bufferView: bufferViews.length - 1, componentType: use32 ? 5125 : 5123, count: mesh.indices.length, type: 'SCALAR', max: [maxIndex], min: [Math.min(...mesh.indices)] });
        const idxAccIdx = accessors.length - 1;
        allIndices.push({ data: indexData, offset: currentByteOffset });
        currentByteOffset += indexData.byteLength;
        if (currentByteOffset % 4) currentByteOffset += 4 - (currentByteOffset % 4);

        const posData = new Float32Array(mesh.positions);
        bufferViews.push({ buffer: 0, byteOffset: currentByteOffset, byteLength: posData.byteLength, target: 34962 });
        let pMin = [Infinity, Infinity, Infinity], pMax = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < mesh.positions.length; i += 3) for (let j = 0; j < 3; j++) { pMin[j] = Math.min(pMin[j], mesh.positions[i + j]); pMax[j] = Math.max(pMax[j], mesh.positions[i + j]); }
        accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: mesh.positions.length / 3, type: 'VEC3', max: pMax, min: pMin });
        const posAccIdx = accessors.length - 1;
        allPositions.push({ data: posData, offset: currentByteOffset });
        currentByteOffset += posData.byteLength;
        if (currentByteOffset % 4) currentByteOffset += 4 - (currentByteOffset % 4);

        const normData = new Float32Array(mesh.normals);
        bufferViews.push({ buffer: 0, byteOffset: currentByteOffset, byteLength: normData.byteLength, target: 34962 });
        accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: mesh.normals.length / 3, type: 'VEC3' });
        const normAccIdx = accessors.length - 1;
        allNormals.push({ data: normData, offset: currentByteOffset });
        currentByteOffset += normData.byteLength;
        if (currentByteOffset % 4) currentByteOffset += 4 - (currentByteOffset % 4);

        meshDefs.push({ primitives: [{ attributes: { POSITION: posAccIdx, NORMAL: normAccIdx }, indices: idxAccIdx, material: matIdx }] });
    }

    const totalBin = currentByteOffset;
    const buf = new ArrayBuffer(totalBin);
    new Uint8Array(buf).fill(0);
    for (const it of allIndices) { if (it.data instanceof Uint32Array) new Uint32Array(buf, it.offset, it.data.length).set(it.data); else new Uint16Array(buf, it.offset, it.data.length).set(it.data); }
    for (const it of allPositions) new Float32Array(buf, it.offset, it.data.length).set(it.data);
    for (const it of allNormals) new Float32Array(buf, it.offset, it.data.length).set(it.data);

    const nodes = meshDefs.map((_, i) => ({ mesh: i, name: meshes[i].name || `mesh_${i}` }));
    const gltf = { asset: { version: '2.0', generator: 'MoldGenerator' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: meshDefs, accessors, bufferViews, buffers: [{ byteLength: totalBin }], materials };

    const jsonStr = JSON.stringify(gltf);
    const jsonPad = jsonStr + ' '.repeat((4 - (jsonStr.length % 4)) % 4);
    const jsonBuf = Buffer.from(jsonPad, 'utf8');
    const binBuf = Buffer.from(buf);
    let binPad = binBuf.length; if (binPad % 4) binPad += 4 - (binPad % 4);
    const total = 12 + 8 + jsonBuf.length + 8 + binPad;
    const glb = Buffer.alloc(total);
    let o = 0;
    glb.writeUInt32LE(0x46546C67, o); o += 4; glb.writeUInt32LE(2, o); o += 4; glb.writeUInt32LE(total, o); o += 4;
    glb.writeUInt32LE(jsonBuf.length, o); o += 4; glb.writeUInt32LE(0x4E4F534A, o); o += 4; jsonBuf.copy(glb, o); o += jsonBuf.length;
    glb.writeUInt32LE(binPad, o); o += 4; glb.writeUInt32LE(0x004E4942, o); o += 4; binBuf.copy(glb, o);
    return glb;
}

// ============================================================
// MAIN — Build a typical 2-plate injection mold
// ============================================================
function main() {
    console.log('🔧 Generating Injection Mold 3D model...');

    // Materials
    const steelBody = { r: 0.62, g: 0.65, b: 0.70, metallic: 0.92, roughness: 0.12 };
    const steelDark = { r: 0.40, g: 0.42, b: 0.46, metallic: 0.85, roughness: 0.25 };
    const steelMid = { r: 0.52, g: 0.55, b: 0.60, metallic: 0.88, roughness: 0.20 };
    const cavitySurf = { r: 0.70, g: 0.72, b: 0.75, metallic: 0.95, roughness: 0.08 };
    const copperColor = { r: 0.72, g: 0.45, b: 0.20, metallic: 0.80, roughness: 0.30 };

    const meshes = [];

    // Dimensions
    const plateW = 0.24;  // width (X)
    const plateD = 0.18;  // depth (Z)
    const plateH = 0.06;  // height per plate (Y)
    const gap = 0.015;    // gap between plates (open state)

    // === UPPER PLATE (Cavity side) ===
    const upperY = plateH / 2 + gap / 2;
    meshes.push({ ...generateBox(plateW, plateH, plateD, 0, upperY, 0), material: steelBody, name: 'upper_plate' });

    // === LOWER PLATE (Core side) ===
    const lowerY = -(plateH / 2 + gap / 2);
    meshes.push({ ...generateBox(plateW, plateH, plateD, 0, lowerY, 0), material: steelBody, name: 'lower_plate' });

    // === CAVITY (rectangular pocket on upper plate's bottom face) ===
    const cavW = 0.10, cavD = 0.08, cavH = 0.004;
    meshes.push({ ...generateBox(cavW, cavH, cavD, 0, gap / 2 - cavH / 2, 0), material: cavitySurf, name: 'cavity' });

    // === CORE (raised block on lower plate's top face) ===
    const coreW = 0.09, coreD = 0.07, coreH = 0.008;
    meshes.push({ ...generateBox(coreW, coreH, coreD, 0, -gap / 2 + coreH / 2, 0), material: cavitySurf, name: 'core' });

    // === GUIDE PINS (4 corners) ===
    const pinR = 0.008;
    const pinH = plateH + gap + 0.02;
    const gpX = plateW / 2 - 0.025;
    const gpZ = plateD / 2 - 0.025;
    const guidePinPositions = [
        [gpX, 0, gpZ],
        [-gpX, 0, gpZ],
        [gpX, 0, -gpZ],
        [-gpX, 0, -gpZ],
    ];
    guidePinPositions.forEach((pos, i) => {
        meshes.push({ ...generateCylinder(pinR, pinH, 24, pos[0], pos[1], pos[2]), material: steelMid, name: `guide_pin_${i}` });
    });

    // === GUIDE BUSHINGS (rings around guide pins on upper plate) ===
    guidePinPositions.forEach((pos, i) => {
        meshes.push({
            ...generateHollowCylinder(0.014, 0.009, 0.015, 24, pos[0], upperY - plateH / 2 + 0.0075, pos[2]),
            material: copperColor, name: `guide_bushing_${i}`
        });
    });

    // === SPRUE BUSHING (top of upper plate, center) ===
    const sprueOuterR = 0.015;
    const sprueH = 0.025;
    meshes.push({
        ...generateCylinder(sprueOuterR, sprueH, 32, 0, upperY + plateH / 2 + sprueH / 2 - 0.005, 0),
        material: steelDark, name: 'sprue_bushing'
    });

    // === LOCATING RING (large ring on top) ===
    meshes.push({
        ...generateHollowCylinder(0.030, 0.016, 0.008, 32, 0, upperY + plateH / 2 + sprueH - 0.005 + 0.004, 0),
        material: steelMid, name: 'locating_ring'
    });

    // === CLAMPING SLOTS (side grooves on both plates) ===
    const slotW = 0.015, slotH = 0.012, slotD = plateD * 0.6;
    // Upper plate sides
    meshes.push({ ...generateBox(slotW, slotH, slotD, plateW / 2 + slotW / 2 - 0.005, upperY, 0), material: steelDark, name: 'clamp_slot_upper_R' });
    meshes.push({ ...generateBox(slotW, slotH, slotD, -(plateW / 2 + slotW / 2 - 0.005), upperY, 0), material: steelDark, name: 'clamp_slot_upper_L' });
    // Lower plate sides
    meshes.push({ ...generateBox(slotW, slotH, slotD, plateW / 2 + slotW / 2 - 0.005, lowerY, 0), material: steelDark, name: 'clamp_slot_lower_R' });
    meshes.push({ ...generateBox(slotW, slotH, slotD, -(plateW / 2 + slotW / 2 - 0.005), lowerY, 0), material: steelDark, name: 'clamp_slot_lower_L' });

    // === EJECTOR PINS (bottom of lower plate, 4 pins) ===
    const ejPinR = 0.004, ejPinH = 0.025;
    const ejPositions = [
        [0.025, 0, 0.015],
        [-0.025, 0, 0.015],
        [0.025, 0, -0.015],
        [-0.025, 0, -0.015],
    ];
    ejPositions.forEach((pos, i) => {
        meshes.push({
            ...generateCylinder(ejPinR, ejPinH, 16, pos[0], lowerY - plateH / 2 - ejPinH / 2 + 0.005, pos[2]),
            material: steelMid, name: `ejector_pin_${i}`
        });
    });

    // === EJECTOR PLATE (below lower plate) ===
    const ejPlateW = 0.14, ejPlateD = 0.10, ejPlateH = 0.012;
    meshes.push({
        ...generateBox(ejPlateW, ejPlateH, ejPlateD, 0, lowerY - plateH / 2 - ejPinH + 0.005 - ejPlateH / 2, 0),
        material: steelDark, name: 'ejector_plate'
    });

    // === BOLT HEADS on upper plate surface (visual detail) ===
    const boltR = 0.006, boltH = 0.004;
    const boltPositions = [
        [0.06, upperY + plateH / 2 + boltH / 2, 0.05],
        [-0.06, upperY + plateH / 2 + boltH / 2, 0.05],
        [0.06, upperY + plateH / 2 + boltH / 2, -0.05],
        [-0.06, upperY + plateH / 2 + boltH / 2, -0.05],
    ];
    boltPositions.forEach((pos, i) => {
        meshes.push({ ...generateCylinder(boltR, boltH, 6, pos[0], pos[1], pos[2]), material: steelDark, name: `bolt_${i}` });
    });

    // === COOLING CHANNEL PORTS (side of upper plate) ===
    const coolR = 0.005, coolH = 0.010;
    const coolPositions = [
        [plateW / 2 + coolH / 2, upperY + 0.01, 0.03],
        [plateW / 2 + coolH / 2, upperY + 0.01, -0.03],
        [plateW / 2 + coolH / 2, upperY - 0.01, 0],
    ];
    coolPositions.forEach((pos, i) => {
        // Side-facing cylinder: generate along Y then place sideways by using Z offset trick
        meshes.push({ ...generateCylinder(coolR, coolH, 16, pos[0], pos[1], pos[2]), material: copperColor, name: `cooling_port_${i}` });
    });

    console.log(`   Generated ${meshes.length} mesh parts`);

    const glbBuffer = buildGLB(meshes);

    const outputDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'injection_mold.glb');
    fs.writeFileSync(outputPath, glbBuffer);
    console.log(`✅ GLB file saved: ${outputPath}`);
    console.log(`   File size: ${(glbBuffer.length / 1024).toFixed(1)} KB`);
    console.log('🎉 Done!');
}

main();

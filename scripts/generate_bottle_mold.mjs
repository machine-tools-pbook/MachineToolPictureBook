/**
 * PET Bottle Mold 3D Model Generator
 * Generates a realistic PET bottle blow mold half as a GLB file.
 * The mold is a rectangular steel block with a bottle-shaped cavity.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEGMENTS = 48;

// ============================================================
// Geometry helpers
// ============================================================

/** Generate a box (6 faces) */
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

/** Generate a cylinder along Y axis */
function generateCylinder(radius, height, segments, ox = 0, oy = 0, oz = 0) {
    const positions = [];
    const normals = [];
    const indices = [];
    const hy = height / 2;

    // Side
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        const nx = Math.cos(theta);
        const nz = Math.sin(theta);

        positions.push(x + ox, -hy + oy, z + oz);
        normals.push(nx, 0, nz);
        positions.push(x + ox, hy + oy, z + oz);
        normals.push(nx, 0, nz);
    }
    for (let i = 0; i < segments; i++) {
        const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    // Top cap
    const topCenter = positions.length / 3;
    positions.push(ox, hy + oy, oz);
    normals.push(0, 1, 0);
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(theta) * radius + ox, hy + oy, Math.sin(theta) * radius + oz);
        normals.push(0, 1, 0);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(topCenter, topCenter + 1 + i, topCenter + 1 + i + 1);
    }

    // Bottom cap
    const botCenter = positions.length / 3;
    positions.push(ox, -hy + oy, oz);
    normals.push(0, -1, 0);
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        positions.push(Math.cos(theta) * radius + ox, -hy + oy, Math.sin(theta) * radius + oz);
        normals.push(0, -1, 0);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(botCenter, botCenter + 1 + i + 1, botCenter + 1 + i);
    }

    return { positions, normals, indices };
}

/**
 * Generate a surface of revolution from a 2D profile.
 * Profile is an array of {r, y} points.
 * The normals point INWARD (for a cavity).
 */
function generateRevolution(profile, segments, ox = 0, oy = 0, oz = 0) {
    const positions = [];
    const normals = [];
    const indices = [];

    // Calculate tangent-based normals for each profile point
    const profileNormals = profile.map((p, i) => {
        let dy, dr;
        if (i === 0) {
            dy = profile[1].y - profile[0].y;
            dr = profile[1].r - profile[0].r;
        } else if (i === profile.length - 1) {
            dy = profile[i].y - profile[i - 1].y;
            dr = profile[i].r - profile[i - 1].r;
        } else {
            dy = profile[i + 1].y - profile[i - 1].y;
            dr = profile[i + 1].r - profile[i - 1].r;
        }
        // Normal perpendicular to tangent, pointing inward
        const len = Math.sqrt(dy * dy + dr * dr) || 1;
        return { nr: dy / len, ny: -dr / len };
    });

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        for (let j = 0; j < profile.length; j++) {
            const { r, y } = profile[j];
            const { nr, ny } = profileNormals[j];

            positions.push(cosT * r + ox, y + oy, sinT * r + oz);
            // Inward-facing normals for cavity
            normals.push(-cosT * nr, -ny, -sinT * nr);
        }
    }

    const pLen = profile.length;
    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < pLen - 1; j++) {
            const a = i * pLen + j;
            const b = i * pLen + j + 1;
            const c = (i + 1) * pLen + j;
            const d = (i + 1) * pLen + j + 1;
            // Winding for inward-facing
            indices.push(a, b, c);
            indices.push(b, d, c);
        }
    }

    return { positions, normals, indices };
}

// ============================================================
// PET Bottle Profile (half cross-section)
// ============================================================
function getBottleProfile() {
    const profile = [];

    // Bottom dome
    for (let i = 0; i <= 8; i++) {
        const t = (i / 8) * Math.PI / 2;
        profile.push({ r: Math.sin(t) * 0.035, y: -0.14 + (1 - Math.cos(t)) * 0.02 });
    }

    // Lower body (slight taper out)
    profile.push({ r: 0.038, y: -0.10 });
    profile.push({ r: 0.040, y: -0.06 });

    // Main body
    profile.push({ r: 0.042, y: -0.03 });
    profile.push({ r: 0.042, y: 0.03 });
    profile.push({ r: 0.042, y: 0.06 });

    // Grip area (waist indentation)
    profile.push({ r: 0.040, y: 0.07 });
    profile.push({ r: 0.036, y: 0.08 });
    profile.push({ r: 0.034, y: 0.09 });
    profile.push({ r: 0.036, y: 0.10 });
    profile.push({ r: 0.040, y: 0.11 });

    // Upper body
    profile.push({ r: 0.042, y: 0.12 });
    profile.push({ r: 0.042, y: 0.14 });

    // Shoulder taper
    profile.push({ r: 0.040, y: 0.15 });
    profile.push({ r: 0.035, y: 0.16 });
    profile.push({ r: 0.028, y: 0.17 });

    // Neck
    profile.push({ r: 0.016, y: 0.18 });
    profile.push({ r: 0.014, y: 0.19 });
    profile.push({ r: 0.014, y: 0.21 });

    // Thread area (slightly wider)
    profile.push({ r: 0.016, y: 0.215 });
    profile.push({ r: 0.016, y: 0.225 });
    profile.push({ r: 0.014, y: 0.23 });

    return profile;
}

// ============================================================
// Build GLB binary (reused from generate_shaft.mjs)
// ============================================================
function buildGLB(meshes) {
    const allPositions = [];
    const allNormals = [];
    const allIndices = [];
    const meshDefs = [];
    const accessors = [];
    const bufferViews = [];
    const materials = [];
    const materialMap = new Map();

    let currentByteOffset = 0;

    for (const mesh of meshes) {
        const matKey = JSON.stringify(mesh.material);
        let matIdx;
        if (materialMap.has(matKey)) {
            matIdx = materialMap.get(matKey);
        } else {
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

        // Check if indices exceed 16-bit range
        const maxIndex = Math.max(...mesh.indices);
        const use32bit = maxIndex > 65535;

        // Indices
        const indexData = use32bit ? new Uint32Array(mesh.indices) : new Uint16Array(mesh.indices);
        const indexByteLength = indexData.byteLength;
        const indexBufferViewIdx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: currentByteOffset,
            byteLength: indexByteLength,
            target: 34963,
        });
        const indexAccessorIdx = accessors.length;
        accessors.push({
            bufferView: indexBufferViewIdx,
            componentType: use32bit ? 5125 : 5123, // UNSIGNED_INT or UNSIGNED_SHORT
            count: mesh.indices.length,
            type: 'SCALAR',
            max: [maxIndex],
            min: [Math.min(...mesh.indices)],
        });
        allIndices.push({ data: indexData, offset: currentByteOffset });
        currentByteOffset += indexByteLength;
        if (currentByteOffset % 4 !== 0) currentByteOffset += 4 - (currentByteOffset % 4);

        // Positions
        const posData = new Float32Array(mesh.positions);
        const posByteLength = posData.byteLength;
        const posBufferViewIdx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: currentByteOffset,
            byteLength: posByteLength,
            target: 34962,
        });
        let pMin = [Infinity, Infinity, Infinity];
        let pMax = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < mesh.positions.length; i += 3) {
            for (let j = 0; j < 3; j++) {
                pMin[j] = Math.min(pMin[j], mesh.positions[i + j]);
                pMax[j] = Math.max(pMax[j], mesh.positions[i + j]);
            }
        }
        const posAccessorIdx = accessors.length;
        accessors.push({
            bufferView: posBufferViewIdx,
            componentType: 5126,
            count: mesh.positions.length / 3,
            type: 'VEC3',
            max: pMax,
            min: pMin,
        });
        allPositions.push({ data: posData, offset: currentByteOffset });
        currentByteOffset += posByteLength;
        if (currentByteOffset % 4 !== 0) currentByteOffset += 4 - (currentByteOffset % 4);

        // Normals
        const normData = new Float32Array(mesh.normals);
        const normByteLength = normData.byteLength;
        const normBufferViewIdx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: currentByteOffset,
            byteLength: normByteLength,
            target: 34962,
        });
        const normAccessorIdx = accessors.length;
        accessors.push({
            bufferView: normBufferViewIdx,
            componentType: 5126,
            count: mesh.normals.length / 3,
            type: 'VEC3',
        });
        allNormals.push({ data: normData, offset: currentByteOffset });
        currentByteOffset += normByteLength;
        if (currentByteOffset % 4 !== 0) currentByteOffset += 4 - (currentByteOffset % 4);

        meshDefs.push({
            primitives: [{
                attributes: { POSITION: posAccessorIdx, NORMAL: normAccessorIdx },
                indices: indexAccessorIdx,
                material: matIdx,
            }],
        });
    }

    const totalBinaryLength = currentByteOffset;
    const binaryBuffer = new ArrayBuffer(totalBinaryLength);
    new Uint8Array(binaryBuffer).fill(0);

    for (const item of allIndices) {
        if (item.data instanceof Uint32Array) {
            new Uint32Array(binaryBuffer, item.offset, item.data.length).set(item.data);
        } else {
            new Uint16Array(binaryBuffer, item.offset, item.data.length).set(item.data);
        }
    }
    for (const item of allPositions) {
        new Float32Array(binaryBuffer, item.offset, item.data.length).set(item.data);
    }
    for (const item of allNormals) {
        new Float32Array(binaryBuffer, item.offset, item.data.length).set(item.data);
    }

    const nodes = meshDefs.map((_, i) => ({ mesh: i, name: meshes[i].name || `mesh_${i}` }));

    const gltf = {
        asset: { version: '2.0', generator: 'BottleMoldGenerator' },
        scene: 0,
        scenes: [{ nodes: nodes.map((_, i) => i) }],
        nodes,
        meshes: meshDefs,
        accessors,
        bufferViews,
        buffers: [{ byteLength: totalBinaryLength }],
        materials,
    };

    const jsonString = JSON.stringify(gltf);
    const jsonPadded = jsonString + ' '.repeat((4 - (jsonString.length % 4)) % 4);
    const jsonBytes = Buffer.from(jsonPadded, 'utf8');
    const binBytes = Buffer.from(binaryBuffer);

    let binPadLength = binBytes.length;
    if (binPadLength % 4 !== 0) binPadLength += 4 - (binPadLength % 4);

    const totalLength = 12 + 8 + jsonBytes.length + 8 + binPadLength;
    const glb = Buffer.alloc(totalLength);
    let offset = 0;

    glb.writeUInt32LE(0x46546C67, offset); offset += 4;
    glb.writeUInt32LE(2, offset); offset += 4;
    glb.writeUInt32LE(totalLength, offset); offset += 4;

    glb.writeUInt32LE(jsonBytes.length, offset); offset += 4;
    glb.writeUInt32LE(0x4E4F534A, offset); offset += 4;
    jsonBytes.copy(glb, offset); offset += jsonBytes.length;

    glb.writeUInt32LE(binPadLength, offset); offset += 4;
    glb.writeUInt32LE(0x004E4942, offset); offset += 4;
    binBytes.copy(glb, offset);

    return glb;
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log('🔧 Generating PET Bottle Mold 3D model...');

    const steelColor = { r: 0.65, g: 0.68, b: 0.72, metallic: 0.9, roughness: 0.15 };
    const cavityColor = { r: 0.50, g: 0.52, b: 0.56, metallic: 0.8, roughness: 0.25, doubleSided: true };
    const boltColor = { r: 0.35, g: 0.37, b: 0.40, metallic: 0.85, roughness: 0.3 };
    const partingColor = { r: 0.55, g: 0.58, b: 0.62, metallic: 0.7, roughness: 0.4 };

    const meshes = [];

    // 1. Mold body (rectangular block)
    const moldWidth = 0.16;
    const moldHeight = 0.32;
    const moldDepth = 0.08;

    const moldBody = generateBox(moldWidth, moldHeight, moldDepth);
    meshes.push({ ...moldBody, material: steelColor, name: 'mold_body' });

    // 2. Bottle cavity (inside the mold - revolution surface)
    const bottleProfile = getBottleProfile();
    const cavity = generateRevolution(bottleProfile, SEGMENTS, 0, 0, 0);
    meshes.push({ ...cavity, material: cavityColor, name: 'bottle_cavity' });

    // 3. Parting line (thin plate on the front face)
    const partingLine = generateBox(moldWidth + 0.005, 0.003, moldDepth + 0.005, 0, 0, 0);
    meshes.push({ ...partingLine, material: partingColor, name: 'parting_line' });

    // 4. Bolt holes (4 corners)
    const boltPositions = [
        [-0.055, 0.12, moldDepth / 2 + 0.001],
        [0.055, 0.12, moldDepth / 2 + 0.001],
        [-0.055, -0.12, moldDepth / 2 + 0.001],
        [0.055, -0.12, moldDepth / 2 + 0.001],
    ];

    boltPositions.forEach((pos, i) => {
        const bolt = generateCylinder(0.008, 0.012, 24, pos[0], pos[1], pos[2]);
        meshes.push({ ...bolt, material: boltColor, name: `bolt_${i}` });
    });

    // 5. Alignment pins (2 on top and bottom)
    const pinPositions = [
        [0, 0.145, moldDepth / 2 + 0.005],
        [0, -0.145, moldDepth / 2 + 0.005],
    ];

    pinPositions.forEach((pos, i) => {
        const pin = generateCylinder(0.005, 0.015, 24, pos[0], pos[1], pos[2]);
        meshes.push({ ...pin, material: boltColor, name: `alignment_pin_${i}` });
    });

    // 6. Cooling channel holes (side of the mold)
    const coolingPositions = [
        [moldWidth / 2 + 0.001, 0.08, 0],
        [moldWidth / 2 + 0.001, -0.04, 0],
        [moldWidth / 2 + 0.001, -0.10, 0],
    ];

    coolingPositions.forEach((pos, i) => {
        // Horizontal cylinder for cooling channel entrance
        const cooling = generateCylinder(0.004, 0.008, 16, pos[0], pos[1], pos[2]);
        // Rotate 90 degrees by swapping x/y in positions (manual rotation around Z)
        meshes.push({ ...cooling, material: boltColor, name: `cooling_channel_${i}` });
    });

    // 7. Top plate / clamp area
    const topPlate = generateBox(moldWidth + 0.02, 0.015, moldDepth + 0.015, 0, moldHeight / 2 + 0.0075, 0);
    meshes.push({ ...topPlate, material: partingColor, name: 'top_plate' });

    const bottomPlate = generateBox(moldWidth + 0.02, 0.015, moldDepth + 0.015, 0, -moldHeight / 2 - 0.0075, 0);
    meshes.push({ ...bottomPlate, material: partingColor, name: 'bottom_plate' });

    console.log(`   Generated ${meshes.length} mesh parts`);

    const glbBuffer = buildGLB(meshes);

    const outputDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'bottle_mold.glb');
    fs.writeFileSync(outputPath, glbBuffer);
    console.log(`✅ GLB file saved: ${outputPath}`);
    console.log(`   File size: ${(glbBuffer.length / 1024).toFixed(1)} KB`);
    console.log('🎉 Done!');
}

main();

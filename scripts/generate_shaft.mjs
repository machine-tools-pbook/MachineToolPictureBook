/**
 * Motor Shaft 3D Model Generator
 * Generates a realistic stepped motor shaft as a GLB file
 * Using manual glTF 2.0 binary construction (no browser APIs needed)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// SHAFT PROFILE DEFINITION
// ============================================================
const SHAFT_SECTIONS = [
    { name: 'coupling_end', length: 0.25, radius: 0.10 },
    { name: 'front_bearing', length: 0.20, radius: 0.12 },
    { name: 'front_shoulder', length: 0.05, radius: 0.15 },
    { name: 'rotor_seat', length: 0.80, radius: 0.15 },
    { name: 'rear_shoulder', length: 0.05, radius: 0.15 },
    { name: 'rear_bearing', length: 0.20, radius: 0.12 },
    { name: 'output_end', length: 0.18, radius: 0.08 },
];

const RADIAL_SEGMENTS = 48;

// ============================================================
// Generate cylinder vertices, normals, indices for one section
// ============================================================
function generateCylinderData(radius, length, startZ, segments) {
    const positions = [];
    const normals = [];
    const indices = [];

    // Generate vertices for top and bottom circles
    // Bottom circle (startZ)
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;

        // Side vertex - bottom
        positions.push(x, y, startZ);
        normals.push(Math.cos(theta), Math.sin(theta), 0);

        // Side vertex - top
        positions.push(x, y, startZ + length);
        normals.push(Math.cos(theta), Math.sin(theta), 0);
    }

    // Generate indices for side faces
    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;

        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    // Bottom cap
    const bottomCenterIdx = positions.length / 3;
    positions.push(0, 0, startZ);
    normals.push(0, 0, -1);
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        positions.push(x, y, startZ);
        normals.push(0, 0, -1);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenterIdx, bottomCenterIdx + 1 + i + 1, bottomCenterIdx + 1 + i);
    }

    // Top cap
    const topCenterIdx = positions.length / 3;
    positions.push(0, 0, startZ + length);
    normals.push(0, 0, 1);
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        positions.push(x, y, startZ + length);
        normals.push(0, 0, 1);
    }
    for (let i = 0; i < segments; i++) {
        indices.push(topCenterIdx, topCenterIdx + 1 + i, topCenterIdx + 1 + i + 1);
    }

    return { positions, normals, indices };
}

// ============================================================
// Generate transition ring (chamfer visual) between two radii
// ============================================================
function generateTransitionRing(rFrom, rTo, z, segments, ringLength = 0.008) {
    const positions = [];
    const normals = [];
    const indices = [];

    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // Bottom circle (rFrom)
        positions.push(cosT * rFrom, sinT * rFrom, z - ringLength / 2);
        const nz1 = (rFrom - rTo) / ringLength;
        const len1 = Math.sqrt(1 + nz1 * nz1);
        normals.push(cosT / len1, sinT / len1, nz1 / len1);

        // Top circle (rTo)
        positions.push(cosT * rTo, sinT * rTo, z + ringLength / 2);
        normals.push(cosT / len1, sinT / len1, nz1 / len1);
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;
        indices.push(a, c, b);
        indices.push(b, c, d);
    }

    return { positions, normals, indices };
}

// ============================================================
// Generate the keyway groove (rectangular subtraction visual)
// ============================================================
function generateKeywayBox(width, depth, length, radius, startZ) {
    // Simple box positioned at the top of the shaft
    const hw = width / 2;
    const yBottom = radius - depth;
    const yTop = radius + 0.002; // slightly above surface
    const zStart = startZ;
    const zEnd = startZ + length;

    const positions = [
        // Front face
        -hw, yBottom, zStart, hw, yBottom, zStart, hw, yTop, zStart, -hw, yTop, zStart,
        // Back face
        -hw, yBottom, zEnd, -hw, yTop, zEnd, hw, yTop, zEnd, hw, yBottom, zEnd,
        // Top face
        -hw, yTop, zStart, hw, yTop, zStart, hw, yTop, zEnd, -hw, yTop, zEnd,
        // Bottom face
        -hw, yBottom, zStart, -hw, yBottom, zEnd, hw, yBottom, zEnd, hw, yBottom, zStart,
        // Left face
        -hw, yBottom, zStart, -hw, yTop, zStart, -hw, yTop, zEnd, -hw, yBottom, zEnd,
        // Right face
        hw, yBottom, zStart, hw, yBottom, zEnd, hw, yTop, zEnd, hw, yTop, zStart,
    ];

    const normals = [
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    ];

    const indices = [];
    for (let face = 0; face < 6; face++) {
        const base = face * 4;
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    return { positions, normals, indices };
}

// ============================================================
// Build GLB binary
// ============================================================
function buildGLB(meshes) {
    // meshes: Array<{ positions: number[], normals: number[], indices: number[], material: {r,g,b, metallic, roughness} }>

    // Collect all accessors, buffer views, etc.
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
        // Material dedup
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
            });
        }

        // Indices
        const indexData = new Uint16Array(mesh.indices);
        const indexByteLength = indexData.byteLength;
        const indexBufferViewIdx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: currentByteOffset,
            byteLength: indexByteLength,
            target: 34963, // ELEMENT_ARRAY_BUFFER
        });
        const indexAccessorIdx = accessors.length;
        accessors.push({
            bufferView: indexBufferViewIdx,
            componentType: 5123, // UNSIGNED_SHORT
            count: mesh.indices.length,
            type: 'SCALAR',
            max: [Math.max(...mesh.indices)],
            min: [Math.min(...mesh.indices)],
        });
        allIndices.push({ data: indexData, offset: currentByteOffset });
        currentByteOffset += indexByteLength;
        // Align to 4 bytes
        if (currentByteOffset % 4 !== 0) {
            currentByteOffset += 4 - (currentByteOffset % 4);
        }

        // Positions
        const posData = new Float32Array(mesh.positions);
        const posByteLength = posData.byteLength;
        const posBufferViewIdx = bufferViews.length;
        bufferViews.push({
            buffer: 0,
            byteOffset: currentByteOffset,
            byteLength: posByteLength,
            target: 34962, // ARRAY_BUFFER
        });
        // Calculate min/max for positions
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
            componentType: 5126, // FLOAT
            count: mesh.positions.length / 3,
            type: 'VEC3',
            max: pMax,
            min: pMin,
        });
        allPositions.push({ data: posData, offset: currentByteOffset });
        currentByteOffset += posByteLength;
        if (currentByteOffset % 4 !== 0) {
            currentByteOffset += 4 - (currentByteOffset % 4);
        }

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
        if (currentByteOffset % 4 !== 0) {
            currentByteOffset += 4 - (currentByteOffset % 4);
        }

        meshDefs.push({
            primitives: [{
                attributes: {
                    POSITION: posAccessorIdx,
                    NORMAL: normAccessorIdx,
                },
                indices: indexAccessorIdx,
                material: matIdx,
            }],
        });
    }

    const totalBinaryLength = currentByteOffset;

    // Build binary buffer
    const binaryBuffer = new ArrayBuffer(totalBinaryLength);
    const binaryView = new DataView(binaryBuffer);
    // Fill with zeros
    new Uint8Array(binaryBuffer).fill(0);

    // Write all data
    for (const item of allIndices) {
        const target = new Uint16Array(binaryBuffer, item.offset, item.data.length);
        target.set(item.data);
    }
    for (const item of allPositions) {
        const target = new Float32Array(binaryBuffer, item.offset, item.data.length);
        target.set(item.data);
    }
    for (const item of allNormals) {
        const target = new Float32Array(binaryBuffer, item.offset, item.data.length);
        target.set(item.data);
    }

    // Create nodes (one per mesh)
    const nodes = meshDefs.map((_, i) => ({ mesh: i, name: meshes[i].name || `mesh_${i}` }));

    // glTF JSON
    const gltf = {
        asset: { version: '2.0', generator: 'MotorShaftGenerator' },
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
    // Pad JSON to 4-byte alignment
    const jsonPadded = jsonString + ' '.repeat((4 - (jsonString.length % 4)) % 4);
    const jsonBytes = Buffer.from(jsonPadded, 'utf8');
    const binBytes = Buffer.from(binaryBuffer);

    // GLB Header: magic (4) + version (4) + length (4) = 12
    // JSON chunk: length (4) + type (4) + data
    // BIN chunk: length (4) + type (4) + data
    // Pad bin to 4 bytes
    let binPadLength = binBytes.length;
    if (binPadLength % 4 !== 0) {
        binPadLength += 4 - (binPadLength % 4);
    }

    const totalLength = 12 + 8 + jsonBytes.length + 8 + binPadLength;

    const glb = Buffer.alloc(totalLength);
    let offset = 0;

    // Header
    glb.writeUInt32LE(0x46546C67, offset); offset += 4; // 'glTF'
    glb.writeUInt32LE(2, offset); offset += 4;           // version
    glb.writeUInt32LE(totalLength, offset); offset += 4;

    // JSON chunk
    glb.writeUInt32LE(jsonBytes.length, offset); offset += 4;
    glb.writeUInt32LE(0x4E4F534A, offset); offset += 4; // 'JSON'
    jsonBytes.copy(glb, offset); offset += jsonBytes.length;

    // BIN chunk
    glb.writeUInt32LE(binPadLength, offset); offset += 4;
    glb.writeUInt32LE(0x004E4942, offset); offset += 4; // 'BIN\0'
    binBytes.copy(glb, offset); offset += binBytes.length;

    return glb;
}

// ============================================================
// MAIN
// ============================================================
function main() {
    console.log('🔧 Generating Motor Shaft 3D model...');

    const totalLength = SHAFT_SECTIONS.reduce((s, sec) => s + sec.length, 0);
    const centerOffset = totalLength / 2;

    const steelColor = { r: 0.72, g: 0.77, b: 0.80, metallic: 0.85, roughness: 0.18 };
    const darkSteelColor = { r: 0.40, g: 0.42, b: 0.47, metallic: 0.7, roughness: 0.35 };
    const keywayColor = { r: 0.20, g: 0.20, b: 0.25, metallic: 0.5, roughness: 0.6 };

    const meshes = [];
    let currentZ = -centerOffset; // center the shaft

    for (let i = 0; i < SHAFT_SECTIONS.length; i++) {
        const section = SHAFT_SECTIONS[i];
        const geo = generateCylinderData(section.radius, section.length, currentZ, RADIAL_SEGMENTS);
        meshes.push({
            ...geo,
            material: steelColor,
            name: section.name,
        });

        // Transition rings between different-radius sections
        if (i < SHAFT_SECTIONS.length - 1) {
            const next = SHAFT_SECTIONS[i + 1];
            if (Math.abs(section.radius - next.radius) > 0.001) {
                const ring = generateTransitionRing(
                    section.radius, next.radius,
                    currentZ + section.length,
                    RADIAL_SEGMENTS
                );
                meshes.push({
                    ...ring,
                    material: darkSteelColor,
                    name: `transition_${section.name}_to_${next.name}`,
                });
            }
        }

        // Keyway on coupling end
        if (section.name === 'coupling_end') {
            const keyway = generateKeywayBox(
                0.03,  // width
                0.02,  // depth
                section.length * 0.85, // length
                section.radius,
                currentZ + section.length * 0.075,
            );
            meshes.push({
                ...keyway,
                material: keywayColor,
                name: 'keyway',
            });
        }

        currentZ += section.length;
    }

    // Add groove rings on rotor seat for visual detail
    const rotorSection = SHAFT_SECTIONS.find(s => s.name === 'rotor_seat');
    if (rotorSection) {
        let rotorStartZ = -centerOffset;
        for (const s of SHAFT_SECTIONS) {
            if (s.name === 'rotor_seat') break;
            rotorStartZ += s.length;
        }
        const numGrooves = 6;
        for (let i = 1; i <= numGrooves; i++) {
            const gz = rotorStartZ + (rotorSection.length / (numGrooves + 1)) * i;
            const grooveRing = generateCylinderData(rotorSection.radius + 0.003, 0.004, gz - 0.002, RADIAL_SEGMENTS);
            meshes.push({
                ...grooveRing,
                material: darkSteelColor,
                name: `groove_ring_${i}`,
            });
        }
    }

    console.log(`   Generated ${meshes.length} mesh parts`);

    const glbBuffer = buildGLB(meshes);

    const outputDir = path.resolve(__dirname, '..', 'public', 'models');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'motor_shaft.glb');
    fs.writeFileSync(outputPath, glbBuffer);
    console.log(`✅ GLB file saved: ${outputPath}`);
    console.log(`   File size: ${(glbBuffer.length / 1024).toFixed(1)} KB`);
    console.log('🎉 Done! Motor shaft model generated successfully.');
}

main();

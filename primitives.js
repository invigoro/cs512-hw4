
//for storing buffer objs and individual shape data (rot, pos, scale)
class shape {
  constructor(bvbo, bnbo, bibo, bnorbo, len, vertexCount, id, color1 = null, color2 = null) {
    this.vbo = bvbo;
    this.nbo = bnbo;
    this.ibo = bibo;
    this.norbo = bnorbo;
    this.length = len;
    this.vertexCount = vertexCount;
    this.id = id;
    this.pickColor = idToColor(id); //this is just id encoded as a color for the onclick event
    //redudancy makes it so the conversion has to happen less frequently. Not that this is computationally intensive lol
    this.color1 = color1;
    this.color2 = color2;
  }
  posX = 0;
  posY = 0;
  posZ = 0;
  rotX = 0;
  rotY = 0;
  rotZ = 0;
  scaX = 1;
  scaY = 1;
  scaZ = 1;
  parent = null;
  children = [];
  nodeTransformMatrix = mat4Identity();

  //animation properties
  canMove = false;
  timeDiff = 0.0;
  rotXSpeed = 0;
  rotYSpeed= 0;
  rotZSpeed = 0;

  //colors
  color1;
  color2;

isLight = false;          
lightIntensity = 1.0;     

getWorldPosition() {
  // Extract position from nodeTransformMatrix
  const m = this.nodeTransformMatrix;
  return [m[12], m[13], m[14]];
}

  getRotationMatrix() {
    const cx = Math.cos(this.rotY), sx = Math.sin(this.rotY);
    const cy = Math.cos(this.rotX), sy = Math.sin(this.rotX);
    const cz = Math.cos(this.rotZ), sz = Math.sin(this.rotZ);

    // Rotation X
    const rotXMat = [
      1, 0, 0, 0,
      0, cy, sy, 0,
      0, -sy, cy, 0,
      0, 0, 0, 1
    ];

    // Rotation Y
    const rotYMat = [
      cx, 0, -sx, 0,
      0, 1, 0, 0,
      sx, 0, cx, 0,
      0, 0, 0, 1
    ];

    // Rotation Z (optional, will come back to this (probably))
    const rotZMat = [
      cz, sz, 0, 0,
      -sz, cz, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];

    // Combine Y * X * Z (order matters)
    return multiplyMat4(multiplyMat4(rotYMat, rotXMat), rotZMat);
  }
  getTranslationMatrix() {
    return mat4Translate(mat4Identity(), [this.posX, this.posY, this.posZ]);
  }
  getScaleVector() {
    return [this.scaX, this.scaY, this.scaZ];
  }

  getFullTransformMatrix(canMove = true, timeDiff = 0.0) {

    //first set local vals for potential animation
    this.canMove = canMove;
    this.timeDiff = timeDiff;

  // Apply parent transform
  this.nodeTransformMatrix = this.parent
    ? multiplyMat4(this.parent.getFullTransformMatrix(), this.getLocalTransformMatrix())
    : this.getLocalTransformMatrix();

  return this.nodeTransformMatrix;
}
getLocalTransformMatrix() {
  //apply anims
  let rotCoeff = 0.1; //arbitrary const for now, idk how fast to make this lol
  if(this.canMove){ //ignore on currently selected obj, otherwise how you gonna do your transforms? riddle me that
    this.rotX += this.rotXSpeed * (this.timeDiff * rotCoeff);
    this.rotY += this.rotYSpeed * (this.timeDiff * rotCoeff);
    this.rotZ += this.rotZSpeed * (this.timeDiff * rotCoeff);
  }

  //then calculate the matrices
  const T = this.getTranslationMatrix();        // pos, mat4Translate(mat4Identity(), [posX,posY,posZ])
  const R = this.getRotationMatrix();           // rot
  const S = mat4Scale(mat4Identity(), this.getScaleVector()); //scale

  // local = T * R * S , scale then rotate then translate
  return multiplyMat4(multiplyMat4(T, R), S);
}
setColors(c1, c2) {
gl.bindBuffer(gl.ARRAY_BUFFER, this.nbo);
  this.color1 = c1;
  this.color2 = c2;
  console.log(c1);
  console.log(c2);
  let colors = interpolateColors(this.vertexCount, 0, c1, c2);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
}


}
function idToColor(id) {
  return [
    (id & 0xFF) / 255,
    ((id >> 8) & 0xFF) / 255,
    ((id >> 16) & 0xFF) / 255
  ];
}
function colorToId([r, g, b]) {
  return r + (g << 8) + (b << 16);
}

// cube
const cubePositions = new Float32Array([
  -1, -1, -1,  // 0
  1, -1, -1,  // 1
  1, 1, -1,  // 2
  -1, 1, -1,  // 3
  -1, -1, 1,  // 4
  1, -1, 1,  // 5
  1, 1, 1,  // 6
  -1, 1, 1   // 7
]);

const cubeIndices = new Uint16Array([
  // Front
  4, 5, 6, 4, 6, 7,
  // Back
  1, 0, 3, 1, 3, 2,
  // Top
  3, 7, 6, 3, 6, 2,
  // Bottom
  0, 1, 5, 0, 5, 4,
  // Right
  1, 2, 6, 1, 6, 5,
  // Left
  0, 4, 7, 0, 7, 3,
]);

const tetrahedronPositions = new Float32Array([
  1, 1, 1,    // Vertex 0
  -1, -1, 1,   // Vertex 1
  -1, 1, -1,   // Vertex 2
  1, -1, -1    // Vertex 3
]);

const tetrahedronIndices = new Uint16Array([
  0, 1, 2,
  0, 3, 1,
  0, 2, 3,
  1, 3, 2
]);
function interpolateColors(count = 1, minBrightness = 0.1, color1 = null, color2 = null) {
  //make this a minimum avg brightness of .5 by default
  const colors = [];
  
  // Ensure we have two valid colors
  let [r1, g1, b1] = color1 ?? randomBrightColor(minBrightness);
  let [r2, g2, b2] = color2 ?? randomBrightColor(minBrightness);

  // Interpolate smoothly from color1 to color2
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // from 0 to 1
    const r = r1 + t * (r2 - r1);
    const g = g1 + t * (g2 - g1);
    const b = b1 + t * (b2 - b1);
    colors.push(r, g, b);
  }

  return new Float32Array(colors);
}

function randomBrightColor(minBrightness = 0.1) {
  let r, g, b;
  do {
    r = Math.random();
    g = Math.random();
    b = Math.random();
  } while ((r + g + b) / 3 < minBrightness);
  return [r, g, b];
}
//Scale by factor
function scale(array, factor = 1) {
  return array.map(x => x * factor);
}

function createCube(radius = 1) {
  const normals = computeVertexNormals(cubePositions, cubeIndices);
  return {
    positions: scale(cubePositions, radius),
    colors: interpolateColors(cubePositions.length),
    indices: cubeIndices,
    normals: normals
  };
}

function createTetrahedron(radius = 1) {
  const normals = computeVertexNormals(tetrahedronPositions, tetrahedronIndices);
  return {
    positions: scale(tetrahedronPositions, radius),
    colors: interpolateColors(tetrahedronPositions.length),
    indices: tetrahedronIndices,
    normals: normals
  };
}


function createCylinder(radius = 1, height = 2, segments = 32) {
  const positions = [];
  const indices = [];

  // Generate vertices
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);

    // Top circle
    positions.push(x, height / 2, z);

    // Bottom circle
    positions.push(x, -height / 2, z);
  }

  // Center points for caps
  const topCenterIndex = positions.length / 3;
  positions.push(0, height / 2, 0);
  const bottomCenterIndex = positions.length / 3;
  positions.push(0, -height / 2, 0);

  // Side indices
  for (let i = 0; i < segments; i++) {
    let p1 = i * 2;
    let p2 = p1 + 1;
    let p3 = ((i + 1) % segments) * 2;
    let p4 = p3 + 1;

    // Side face (two triangles)
    indices.push(p1, p3, p2);
    indices.push(p3, p4, p2);
  }

  // Top cap (CCW order for top face)
  for (let i = 0; i < segments; i++) {
    let p1 = ((i + 1) % segments) * 2;
    let p2 = i * 2;
    indices.push(topCenterIndex, p1, p2);
  }

  // Bottom cap (CCW order from bottom view)
  for (let i = 0; i < segments; i++) {
    let p1 = i * 2 + 1;
    let p2 = ((i + 1) % segments) * 2 + 1;
    indices.push(bottomCenterIndex, p1, p2);
  }

  const normals = computeVertexNormals(positions, indices);
  return {
    positions: new Float32Array(positions),
    colors: interpolateColors(positions.length),
    indices: new Uint16Array(indices),
    normals: normals
  };
}

function createSphere(radius = 1, latBands = 24, longBands = 24) {
  const positions = [];
  const indices = [];

  for (let lat = 0; lat <= latBands; lat++) {
    const theta = (lat * Math.PI) / latBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = radius * cosPhi * sinTheta;
      const y = radius * cosTheta;
      const z = radius * sinPhi * sinTheta;

      positions.push(x, y, z);
    }
  }

  for (let lat = 0; lat < latBands; lat++) {
    for (let lon = 0; lon < longBands; lon++) {
      const first = lat * (longBands + 1) + lon;
      const second = first + longBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  const normals = computeVertexNormals(positions, indices);
  return {
    positions: new Float32Array(positions),
    colors: interpolateColors(positions.length),
    indices: new Uint16Array(indices),
    normals: normals
  };
}

function createCone(radius = 1, height = 2, segments = 32) {
  const positions = [];
  const indices = [];

  const apexIndex = 0;
  positions.push(0, height / 2, 0); // Apex

  // Circle vertices
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const x = radius * Math.cos(theta);
    const z = radius * Math.sin(theta);
    positions.push(x, -height / 2, z);
  }

  const baseCenterIndex = positions.length / 3;
  positions.push(0, -height / 2, 0); // center of base

  // Side triangles
  for (let i = 1; i <= segments; i++) {
    const next = i % segments + 1;
    indices.push(apexIndex, i, next);
  }

  // Base triangles
  for (let i = 1; i <= segments; i++) {
    const next = i % segments + 1;
    indices.push(baseCenterIndex, next, i);
  }

  const normals = computeVertexNormals(positions, indices);
  return {
    positions: new Float32Array(positions),
    colors: interpolateColors(positions.length),
    indices: new Uint16Array(indices),
    normals: normals
  };
}

function createTorus(majorRadius = 1, minorRadius = 0.3, majorSegments = 32, minorSegments = 16) {
  const positions = [];
  const indices = [];

  for (let i = 0; i <= majorSegments; i++) {
    const theta = (i / majorSegments) * 2 * Math.PI;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    for (let j = 0; j <= minorSegments; j++) {
      const phi = (j / minorSegments) * 2 * Math.PI;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);

      const x = (majorRadius + minorRadius * cosPhi) * cosTheta;
      const y = minorRadius * sinPhi;
      const z = (majorRadius + minorRadius * cosPhi) * sinTheta;

      positions.push(x, y, z);
    }
  }

  for (let i = 0; i < majorSegments; i++) {
    for (let j = 0; j < minorSegments; j++) {
      const first = i * (minorSegments + 1) + j;
      const second = first + minorSegments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }
  const normals = computeVertexNormals(positions, indices);

  return {
    positions: new Float32Array(positions),
    colors: interpolateColors(positions.length),
    indices: new Uint16Array(indices), 
    normals: normals
  };
}

function computeVertexNormals(positions, indices) {
  const normals = new Float32Array(positions.length);
  const vA = [0, 0, 0], vB = [0, 0, 0], vC = [0, 0, 0];
  const edge1 = [0, 0, 0], edge2 = [0, 0, 0], n = [0, 0, 0];

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;

    // positions
    vA[0] = positions[i0]; vA[1] = positions[i0 + 1]; vA[2] = positions[i0 + 2];
    vB[0] = positions[i1]; vB[1] = positions[i1 + 1]; vB[2] = positions[i1 + 2];
    vC[0] = positions[i2]; vC[1] = positions[i2 + 1]; vC[2] = positions[i2 + 2];

    // edges
    edge1[0] = vB[0] - vA[0];
    edge1[1] = vB[1] - vA[1];
    edge1[2] = vB[2] - vA[2];

    edge2[0] = vC[0] - vA[0];
    edge2[1] = vC[1] - vA[1];
    edge2[2] = vC[2] - vA[2];

    // face normal = cross(edge1, edge2)
    n[0] = edge1[1] * edge2[2] - edge1[2] * edge2[1];
    n[1] = edge1[2] * edge2[0] - edge1[0] * edge2[2];
    n[2] = edge1[0] * edge2[1] - edge1[1] * edge2[0];

    // add face normal to each vertex normal
    normals[i0] += n[0]; normals[i0 + 1] += n[1]; normals[i0 + 2] += n[2];
    normals[i1] += n[0]; normals[i1 + 1] += n[1]; normals[i1 + 2] += n[2];
    normals[i2] += n[0]; normals[i2 + 1] += n[1]; normals[i2 + 2] += n[2];
  }

  // normalize all vertex normals
  for (let i = 0; i < normals.length; i += 3) {
    const x = normals[i], y = normals[i + 1], z = normals[i + 2];
    const len = Math.hypot(x, y, z) || 1;
    normals[i] /= len;
    normals[i + 1] /= len;
    normals[i + 2] /= len;
  }

  return normals;
}

function samplePointOnCube() {
  // pick random face (6), then random u,v in [-0.5, 0.5]
  const face = Math.floor(Math.random() * 6);
  const u = Math.random() - 0.5;
  const v = Math.random() - 0.5;
  switch (face) {
    case 0: return [0.5, u, v];   // +X
    case 1: return [-0.5, u, v];  // -X
    case 2: return [u, 0.5, v];   // +Y
    case 3: return [u, -0.5, v];  // -Y
    case 4: return [u, v, 0.5];   // +Z
    default: return [u, v, -0.5]; // -Z
  }
}

function samplePointOnSphere() {
  const u = Math.random();
  const v = Math.random();
  const theta = 2.0 * Math.PI * u;
  const phi = Math.acos(2.0 * v - 1.0);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.sin(phi) * Math.sin(theta);
  const z = Math.cos(phi);
  return [x * 0.5, y * 0.5, z * 0.5];
}

function samplePointOnCylinder() {
  const theta = Math.random() * 2.0 * Math.PI;
  const z = Math.random() - 0.5;
  const r = 0.5;
  return [r * Math.cos(theta), z, r * Math.sin(theta)];
}

function samplePointOnCone() {
  const theta = Math.random() * 2.0 * Math.PI;
  const h = Math.random();
  const r = 0.5 * (1.0 - h);
  return [r * Math.cos(theta), h - 0.5, r * Math.sin(theta)];
}

function samplePointOnTorus() {
  const R = 0.6, r = 0.2;
  const theta = Math.random() * 2 * Math.PI;
  const phi = Math.random() * 2 * Math.PI;
  const x = (R + r * Math.cos(phi)) * Math.cos(theta);
  const y = (R + r * Math.cos(phi)) * Math.sin(theta);
  const z = r * Math.sin(phi);
  return [x, y, z];
}

// Given a shape, sample a random point on its surface in world space
function samplePointOnShape(shape) {
  let pLocal;
  switch (shape.name) {
    case "Cube": pLocal = samplePointOnCube(); break;
    case "Sphere": pLocal = samplePointOnSphere(); break;
    case "Cylinder": pLocal = samplePointOnCylinder(); break;
    case "Cone": pLocal = samplePointOnCone(); break;
    case "Torus": pLocal = samplePointOnTorus(); break;
    default: pLocal = [0, 0, 0];
  }

  // Transform by shape's world matrix
  const M = shape.getFullTransformMatrix(false);
  const x = pLocal[0], y = pLocal[1], z = pLocal[2];
  return [
    M[0]*x + M[4]*y + M[8]*z + M[12],
    M[1]*x + M[5]*y + M[9]*z + M[13],
    M[2]*x + M[6]*y + M[10]*z + M[14]
  ];
}
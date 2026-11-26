import * as THREE from '../vendor/three.module.min.js';

const WORLD_SIZE = 5200;
const GRID_STEPS = 150;

function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
}

function addNoise(x, z, seed) {
  let sum = 0, amplitude = 1, total = 0, frequency = 0.0016;
  for (let octave = 0; octave < 5; octave += 1) {
    sum += smoothNoise(x * frequency, z * frequency, seed + octave * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.52;
    frequency *= 2.05;
  }
  return sum / total;
}

export const ISLANDS = [
  { name: 'Marrow Quay', x: -900, z: 500, radius: 690, height: 245, ridge: 0.35 },
  { name: 'Ash Cone', x: 240, z: -760, radius: 570, height: 520, ridge: 0.85 },
  { name: 'Lantern Rock', x: 1160, z: 250, radius: 480, height: 330, ridge: 0.5 },
  { name: 'Cedar Keys', x: 520, z: 1130, radius: 540, height: 190, ridge: 0.25 },
  { name: 'Gull Wing Bay', x: -560, z: -1180, radius: 470, height: 165, ridge: 0.2 },
  { name: 'Seal Bank', x: 1580, z: -870, radius: 330, height: 120, ridge: 0.15 },
];

export function landHeight(x, z, seed) {
  let height = -70;
  for (const island of ISLANDS) {
    const dx = x - island.x, dz = z - island.z;
    const dist = Math.sqrt(dx * dx + dz * dz) / island.radius;
    if (dist > 1.15) continue;
    const falloff = Math.max(0, 1 - dist * dist);
    const detail = addNoise(x, z, seed);
    const ridge = Math.pow(Math.abs(detail - 0.5) * 2, 0.7);
    const shape = falloff * (0.72 + detail * 0.5 + ridge * island.ridge);
    const candidate = shape * island.height - 26;
    if (candidate > height) height = candidate;
  }
  return Math.max(-40, height);
}

function terrainColor(height, slope, seed, x, z) {
  const color = new THREE.Color();
  if (height < 8) color.setHex(0xd8c092);
  else if (height < 42) color.setHex(0xc4b27c);
  else if (height < 150) color.setHex(0x5f8656);
  else if (height < 300) color.setHex(0x456b4b);
  else if (height < 430) color.setHex(0x6c6a5e);
  else color.setHex(0xa9a39a);
  const grain = (hash2(Math.floor(x * 0.02), Math.floor(z * 0.02), seed) - 0.5) * 0.11;
  color.offsetHSL(grain * 0.08, 0, grain - slope * 0.05);
  return color;
}

function buildTerrain(scene, seed) {
  const positions = [];
  const colors = [];
  const step = WORLD_SIZE / GRID_STEPS;
  const half = WORLD_SIZE / 2;
  const heights = [];
  for (let iz = 0; iz <= GRID_STEPS; iz += 1) {
    heights[iz] = [];
    for (let ix = 0; ix <= GRID_STEPS; ix += 1) {
      heights[iz][ix] = landHeight(-half + ix * step, -half + iz * step, seed);
    }
  }
  const pushVertex = (ix, iz) => {
    const x = -half + ix * step, z = -half + iz * step;
    const h = heights[iz][ix];
    const hx = heights[iz][Math.max(0, ix - 1)], hz = heights[Math.max(0, iz - 1)][ix];
    const slope = Math.min(1, (Math.abs(h - hx) + Math.abs(h - hz)) / 90);
    positions.push(x, h, z);
    const color = terrainColor(h, slope, seed, x, z);
    colors.push(color.r, color.g, color.b);
  };
  for (let iz = 0; iz < GRID_STEPS; iz += 1) {
    for (let ix = 0; ix < GRID_STEPS; ix += 1) {
      pushVertex(ix, iz); pushVertex(ix + 1, iz); pushVertex(ix, iz + 1);
      pushVertex(ix + 1, iz); pushVertex(ix + 1, iz + 1); pushVertex(ix, iz + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'archipelagoHeightfield';
  scene.add(mesh);
  return mesh;
}

function waterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b5a6e';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 170; i += 1) {
    const x = Math.random() * 256, y = Math.random() * 256;
    ctx.strokeStyle = `rgba(170, 232, 230, ${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8 + Math.random() * 28, y); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(34, 34);
  return texture;
}

function buildSea(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x9fd2d6, map: waterTexture(), roughness: 0.42, metalness: 0.18,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE * 1.5, WORLD_SIZE * 1.5), material);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -2;
  sea.name = 'tidalWaterPlane';
  scene.add(sea);
}

function buildSky(scene) {
  const geometry = new THREE.SphereGeometry(7000, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {},
    vertexShader: 'varying vec3 vDirection; void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDirection;
      void main() {
        float h = normalize(vDirection).y;
        vec3 high = vec3(0.055, 0.13, 0.25);
        vec3 middle = vec3(0.32, 0.53, 0.63);
        vec3 low = vec3(0.98, 0.64, 0.36);
        vec3 color = mix(low, middle, smoothstep(-0.06, 0.26, h));
        color = mix(color, high, smoothstep(0.2, 0.85, h));
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'dawnSkyDome';
  scene.add(sky);

  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = 128; sunCanvas.height = 128;
  const ctx = sunCanvas.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  glow.addColorStop(0, 'rgba(255,246,214,1)');
  glow.addColorStop(0.18, 'rgba(255,204,138,0.85)');
  glow.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 128, 128);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunCanvas), transparent: true, depthWrite: false }));
  sun.position.set(-1400, 260, -4200);
  sun.scale.set(1500, 1500, 1);
  sun.name = 'lowSunGlow';
  scene.add(sun);
}

function buildVegetation(scene, seed) {
  const treeGeometry = new THREE.ConeGeometry(9, 32, 5);
  treeGeometry.translate(0, 16, 0);
  const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x284f3c, flatShading: true });
  const trees = new THREE.InstancedMesh(treeGeometry, treeMaterial, 620);
  const dummy = new THREE.Object3D();
  let count = 0;
  for (let i = 0; i < 620; i += 1) {
    const x = (hash2(i, 31, seed) - 0.5) * 4200;
    const z = (hash2(i, 71, seed) - 0.5) * 4200;
    const h = landHeight(x, z, seed);
    if (h < 48 || h > 310) continue;
    dummy.position.set(x, h - 2, z);
    const scale = 0.7 + hash2(i, 91, seed) * 1.6;
    dummy.scale.set(scale, scale * (0.8 + hash2(i, 12, seed) * 0.7), scale);
    dummy.rotation.y = hash2(i, 15, seed) * Math.PI;
    dummy.updateMatrix();
    trees.setMatrixAt(count, dummy.matrix);
    count += 1;
  }
  trees.count = count;
  trees.name = 'cedarTreeStand';
  scene.add(trees);
}

function box(scene, width, height, depth, color, x, y, z, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  mesh.name = name;
  scene.add(mesh);
  return mesh;
}

function buildRunway(scene, seed) {
  const center = { x: -930, z: 500 };
  const heading = Math.PI / 2;
  const y = Math.max(20, landHeight(center.x, center.z, seed) + 3);
  const stripGroup = new THREE.Group();
  stripGroup.position.set(center.x, y, center.z);
  stripGroup.rotation.y = Math.PI / 2 - heading;
  stripGroup.name = 'marrowQuayRunway';
  scene.add(stripGroup);

  const strip = new THREE.Mesh(new THREE.PlaneGeometry(330, 22), new THREE.MeshLambertMaterial({ color: 0x39464a }));
  strip.rotation.x = -Math.PI / 2;
  stripGroup.add(strip);

  for (let i = -7; i <= 7; i += 1) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.3), new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(i * 20, 0.3, 0);
    stripGroup.add(dash);
  }
  for (const side of [-1, 1]) {
    for (let i = -7; i <= 7; i += 1) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffb35e : 0x8ff5e0 }));
      lamp.position.set(i * 22, 1.1, side * 12.5);
      stripGroup.add(lamp);
    }
  }
  const hangar = box(scene, 34, 15, 22, 0xc7b28b, center.x + 30, y + 7, center.z - 48, 'quayHangar');
  const storehouse = box(scene, 12, 24, 12, 0xd8c79e, center.x - 42, y + 12, center.z + 56, 'quayStorehouse');
  hangar.rotation.y = stripGroup.rotation.y;
  storehouse.rotation.y = stripGroup.rotation.y;
  return { center, heading, y, length: 330, width: 22 };
}

function buildLighthouse(scene, seed) {
  const x = 1220, z = 280;
  const base = landHeight(x, z, seed);
  const group = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(9, 14, 74, 10), new THREE.MeshLambertMaterial({ color: 0xe5ddc8, flatShading: true }));
  tower.position.y = 37;
  group.add(tower);
  for (let band = 0; band < 4; band += 1) {
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(10.2 - band * 0.6, 10.6 - band * 0.6, 8, 10), new THREE.MeshLambertMaterial({ color: 0xb55340 }));
    stripe.position.y = 16 + band * 16;
    group.add(stripe);
  }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd892 }));
  lantern.position.y = 79;
  group.add(lantern);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(14, 12, 10), new THREE.MeshLambertMaterial({ color: 0x394b50 }));
  roof.position.y = 92;
  group.add(roof);
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 79;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(26, 300, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe4a8, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 150;
  beamPivot.add(beam);
  group.add(beamPivot);
  group.position.set(x, base, z);
  group.name = 'lanternRockLighthouse';
  scene.add(group);
  return { position: new THREE.Vector3(x, base, z), beamPivot };
}

function buildRings(scene) {
  const definitions = [
    { x: -590, y: 235, z: 340, label: 'Quay Gate' },
    { x: -180, y: 300, z: 30, label: 'Ridge Gate' },
    { x: 310, y: 340, z: -420, label: 'Ash Gate' },
    { x: 820, y: 265, z: -110, label: 'Sound Gate' },
    { x: 1080, y: 215, z: 250, label: 'Beacon Gate' },
  ];
  const rings = definitions.map((definition, index) => {
    const group = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(30, 2.3, 8, 36), new THREE.MeshStandardMaterial({ color: index === 4 ? 0xffcf7d : 0x54e5d0, emissive: index === 4 ? 0xb06b20 : 0x11796f, emissiveIntensity: 1.4, roughness: 0.35 }));
    group.add(torus);
    for (let tick = 0; tick < 8; tick += 1) {
      const angle = (tick / 8) * Math.PI * 2;
      const marker = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), new THREE.MeshBasicMaterial({ color: 0xfff0c6 }));
      marker.position.set(Math.cos(angle) * 30, Math.sin(angle) * 30, 0);
      group.add(marker);
    }
    const next = definitions[Math.min(index + 1, definitions.length - 1)];
    const previous = definitions[Math.max(index - 1, 0)];
    group.position.set(definition.x, definition.y, definition.z);
    const approach = index === 0
      ? new THREE.Vector3(definition.x + (definition.x - next.x), definition.y, definition.z + (definition.z - next.z))
      : new THREE.Vector3(previous.x, previous.y, previous.z);
    group.lookAt(approach);
    group.name = `gate-${index + 1}-${definition.label.replace(/\s+/g, '')}`;
    scene.add(group);
    return { position: group.position.clone(), radius: 30, mesh: group, label: definition.label, passed: false };
  });
  return rings;
}

function buildClouds(scene, seed) {
  const material = new THREE.MeshLambertMaterial({ color: 0xfff0dd, transparent: true, opacity: 0.55 });
  for (let i = 0; i < 16; i += 1) {
    const cloud = new THREE.Group();
    for (let puff = 0; puff < 4; puff += 1) {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(45 + hash2(i, puff, seed) * 40, 8, 6), material);
      sphere.position.set(puff * 55 - 80, hash2(i, puff + 9, seed) * 18, hash2(i, puff + 3, seed) * 30);
      cloud.add(sphere);
    }
    cloud.position.set((hash2(i, 201, seed) - 0.5) * 5000, 780 + hash2(i, 202, seed) * 320, (hash2(i, 203, seed) - 0.5) * 5000);
    scene.add(cloud);
  }
}

function buildDropZone(scene, seed) {
  const x = 520, z = 1180;
  const y = landHeight(x, z, seed) + 2;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(42, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(x, y, z);
  disc.name = 'cedarKeysDropZone';
  scene.add(disc);
  return { position: new THREE.Vector3(x, y, z), radius: 42, mesh: disc };
}

export function buildWorld(scene, seed = 7411) {
  scene.fog = new THREE.FogExp2(0xc5ac91, 0.00029);
  scene.add(new THREE.HemisphereLight(0xd8ecf5, 0x6b5b43, 2.1));
  const sunLight = new THREE.DirectionalLight(0xffd3a0, 2.4);
  sunLight.position.set(-1200, 900, -1800);
  scene.add(sunLight);
  const fillLight = new THREE.DirectionalLight(0xffdfbf, 0.95);
  fillLight.position.set(1600, 700, 1400);
  scene.add(fillLight);
  buildSky(scene);
  buildSea(scene);
  buildTerrain(scene, seed);
  buildVegetation(scene, seed);
  const runway = buildRunway(scene, seed);
  const lighthouse = buildLighthouse(scene, seed);
  const rings = buildRings(scene);
  buildClouds(scene, seed);
  const dropZone = buildDropZone(scene, seed);
  let elapsed = 0;
  return {
    seed,
    runway,
    rings,
    dropZone,
    lighthouse,
    heightAt(x, z) { return landHeight(x, z, seed); },
    resetGates() { rings.forEach((ring) => { ring.passed = false; ring.mesh.children[0].material.emissiveIntensity = 1.4; }); },
    update(dt) {
      elapsed += dt;
      lighthouse.beamPivot.rotation.y = elapsed * 0.55;
      rings.forEach((ring, index) => {
        const pulse = 1.1 + Math.sin(elapsed * 2.4 + index) * 0.35;
        if (!ring.passed) ring.mesh.children[0].material.emissiveIntensity = pulse;
      });
      dropZone.mesh.material.opacity = 0.42 + Math.sin(elapsed * 3) * 0.2;
    },
  };
}

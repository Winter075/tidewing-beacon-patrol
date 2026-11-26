import * as THREE from '../vendor/three.module.min.js';

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.12, flatShading: true, ...options });
}

function addBox(group, width, height, depth, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function wingShape(points) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return shape;
}

export function createAircraft(scene) {
  const plane = new THREE.Group();
  plane.name = 'tidewingSTOLAircraft';

  const cream = 0xf0e4c8;
  const crimson = 0xc84c3a;
  const trim = 0x25353b;

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(1.45, 6.4, 6, 10), material(cream));
  fuselage.rotation.x = Math.PI / 2;
  fuselage.scale.set(1, 1, 0.85);
  plane.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.6, 10), material(trim));
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.4;
  plane.add(nose);

  const cowling = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.4, 1.1, 10), material(crimson));
  cowling.rotation.x = Math.PI / 2;
  cowling.position.z = -3.5;
  plane.add(cowling);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material(0x1c4d5a, { metalness: 0.55, roughness: 0.18 }));
  canopy.scale.set(1, 0.85, 1.9);
  canopy.position.set(0, 1.05, -1.2);
  plane.add(canopy);

  const wingGeometry = new THREE.ExtrudeGeometry(wingShape([
    [-0.6, 0.2], [7.6, 1.4], [8.1, 0.1], [6.4, -1.5], [0.6, -0.9],
  ]), { depth: 0.28, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.08, bevelSegments: 1 });
  const rightWing = new THREE.Mesh(wingGeometry, material(cream));
  rightWing.rotation.x = -Math.PI / 2;
  rightWing.position.set(0, 0.25, 0.2);
  plane.add(rightWing);
  const leftWing = rightWing.clone();
  leftWing.scale.x = -1;
  plane.add(leftWing);

  for (const side of [-1, 1]) {
    const stripe = addBox(plane, 3.4, 0.16, 0.9, crimson, side * 5.3, 0.42, 0.3);
    stripe.rotation.y = side * 0.06;
    constTip(plane, side, cream, trim);
  }

  const tailFin = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape([
    [0, 0], [2.6, 0.2], [2.4, 2.6], [0.8, 2.4],
  ]), { depth: 0.2, bevelEnabled: false }), material(crimson));
  tailFin.rotation.y = Math.PI / 2;
  tailFin.position.set(0, 0.3, 3.6);
  plane.add(tailFin);
  const horizontalTail = addBox(plane, 5.4, 0.18, 1.5, cream, 0, 1.1, 4.1);
  horizontalTail.rotation.z = 0.05;

  const struts = new THREE.Group();
  for (const side of [-1, 1]) {
    const strut = addBox(struts, 0.16, 0.16, 3.4, trim, side * 4.1, -0.7, 0.1);
    strut.rotation.x = -0.32;
  }
  plane.add(struts);

  const wheels = new THREE.Group();
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 10), material(0x182024));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 2.3, -1.35, -0.6);
    wheels.add(wheel);
    const leg = addBox(wheels, 0.12, 1.2, 0.12, trim, side * 2.3, -0.85, -0.6);
    leg.rotation.z = side * 0.12;
  }
  const tailWheel = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), material(0x182024));
  tailWheel.position.set(0, -1.0, 4.3);
  wheels.add(tailWheel);
  plane.add(wheels);

  const propeller = new THREE.Group();
  for (let blade = 0; blade < 3; blade += 1) {
    const shape = wingShape([[0, -0.24], [3.3, -0.55], [3.6, 0], [3.3, 0.5], [0, 0.24]]);
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), material(0x2c3033));
    mesh.rotation.z = (blade / 3) * Math.PI * 2;
    propeller.add(mesh);
  }
  propeller.position.z = -5.1;
  plane.add(propeller);

  const navRed = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff5b4a }));
  navRed.position.set(-8, 0.4, 0.2);
  plane.add(navRed);
  const navGreen = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), new THREE.MeshBasicMaterial({ color: 0x6cff9e }));
  navGreen.position.set(8, 0.4, 0.2);
  plane.add(navGreen);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffc766 }));
  beacon.position.set(0, 2.6, 1.3);
  plane.add(beacon);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0x12212a, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.9;
  plane.add(shadow);

  scene.add(plane);
  let spin = 0;
  return {
    group: plane,
    wheels,
    propeller,
    update(dt, speed, throttle, elapsed) {
      spin += dt * (14 + speed * 0.42 + throttle * 12);
      propeller.rotation.z = spin;
      beacon.visible = Math.sin(elapsed * 7) > 0.2;
      shadow.position.y = -1.9;
    },
    setGear(visible) { wheels.visible = visible; },
  };
}

function constTip(group, side, creamColor, trimColor) {
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.9), material(side === -1 ? 0xc84c3a : creamColor));
  tip.position.set(side * 7.7, 0.42, 0.3);
  group.add(tip);
  const lightHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.4, 8), material(trimColor));
  lightHousing.rotation.x = Math.PI / 2;
  lightHousing.position.set(side * 4.5, -0.5, -1.6);
  group.add(lightHousing);
}

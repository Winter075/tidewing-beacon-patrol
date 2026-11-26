const SHOTS = {
  cover: {
    pose: { x: -430, y: 268, z: 315, heading: 0.92, pitch: 0.02, bank: 0.24, speed: 66, throttle: 0.8 },
    view: 'chase',
    gates: 2,
  },
  cockpit: {
    pose: { x: -1150, y: 246, z: 500, heading: 1.57, pitch: -0.035, bank: 0.01, speed: 54, throttle: 0.62 },
    view: 'cockpit',
    gates: 0,
  },
  ring: {
    pose: { x: 205, y: 338, z: -265, heading: 0.63, pitch: 0.05, bank: -0.28, speed: 70, throttle: 0.86 },
    view: 'chase',
    gates: 2,
  },
  landing: {
    pose: { x: -1180, y: 268, z: 501, heading: 1.57, pitch: -0.07, bank: 0.01, speed: 52, throttle: 0.42 },
    view: 'chase',
    gates: 5,
  },
};

export function createShotCapture(plane, world, rig, instruments, missionDirector) {
  let active = null;

  function apply(name) {
    const shot = SHOTS[name];
    if (!shot) return false;
    active = name;
    plane.setPose(shot.pose);
    plane.elapsed = 12.5;
    rig.setMode(shot.view);
    instruments.setView(shot.view);
    if (shot.gates > 0) {
      world.rings.forEach((ring, index) => {
        ring.passed = index < shot.gates;
        ring.mesh.children[0].material.color.setHex(ring.passed ? 0x496a67 : (index === 4 ? 0xffcf7d : 0x54e5d0));
      });
    }
    return true;
  }

  function refresh() {
    if (!active) return;
    plane.setPose(SHOTS[active].pose);
    plane.elapsed = 12.5;
  }

  return { apply, refresh, get active() { return active; } };
}

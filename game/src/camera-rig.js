import * as THREE from '../vendor/three.module.min.js';

export function createCameraRig(THREERef, camera, aircraft) {
  const chasePosition = new THREERef.Vector3();
  const chaseTarget = new THREERef.Vector3();
  const worldUp = new THREERef.Vector3(0, 1, 0);
  const desiredUp = new THREERef.Vector3(0, 1, 0);
  const forward = new THREERef.Vector3();
  let mode = 'chase';
  let initialized = false;

  function setMode(next) {
    mode = next;
    initialized = false;
    camera.fov = mode === 'cockpit' ? 72 : 62;
    camera.updateProjectionMatrix();
  }

  function update(plane, dt) {
    forward.set(Math.sin(plane.heading), Math.sin(plane.pitch), -Math.cos(plane.heading)).normalize();
    if (mode === 'cockpit') {
      camera.position.copy(aircraft.localToWorld(new THREERef.Vector3(0, 1.72, -2.1)));
      camera.lookAt(camera.position.clone().add(forward));
      desiredUp.copy(worldUp).applyAxisAngle(forward, -plane.bank * 0.55);
      camera.up.lerp(desiredUp, initialized ? Math.min(1, dt * 5) : 1);
    } else {
      chasePosition.copy(aircraft.localToWorld(new THREERef.Vector3(0, 5.8, 21)));
      chaseTarget.copy(aircraft.localToWorld(new THREERef.Vector3(0, 1.6, -28)));
      if (!initialized) camera.position.copy(chasePosition);
      else camera.position.lerp(chasePosition, Math.min(1, dt * 4.5));
      camera.lookAt(chaseTarget);
      desiredUp.copy(worldUp).applyAxisAngle(forward, -plane.bank * 0.32);
      camera.up.lerp(desiredUp, initialized ? Math.min(1, dt * 4) : 1);
    }
    initialized = true;
  }

  return { update, setMode, get mode() { return mode; } };
}

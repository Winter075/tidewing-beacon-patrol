import * as THREE from '../vendor/three.module.min.js';
import { buildWorld } from './world-builder.js';
import { createAircraft } from './aircraft-model.js';
import { FlightModel } from './flight-model.js';
import { createCameraRig } from './camera-rig.js';
import { createControls } from './input-controls.js';
import { createInstruments } from './instruments.js';
import { createAudio } from './audio-engine.js';
import { createMissionDirector } from './missions.js';
import { createShotCapture } from './shot-capture.js';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);

const seed = 7411;
const world = buildWorld(scene, seed);
const aircraft = createAircraft(scene);
const plane = new FlightModel(world);
const rig = createCameraRig(THREE, camera, aircraft.group);
const controls = createControls(canvas);
const audio = createAudio();
const instruments = createInstruments();
const missionDirector = createMissionDirector(world, (text) => instruments.toast(text));
const shots = createShotCapture(plane, world, rig, instruments, missionDirector);

let screen = 'start';
let viewMode = 'chase';
let toastTimer = 0;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

function syncAircraft() {
  aircraft.group.position.copy(plane.position);
  aircraft.group.rotation.order = 'YXZ';
  aircraft.group.rotation.set(plane.pitch, -plane.heading, -plane.bank);
  aircraft.setGear(plane.gearDown);
}

function setView(next) {
  viewMode = next;
  aircraft.group.visible = next !== 'cockpit';
  rig.setMode(next);
  instruments.setView(next);
}

function startMission(index) {
  audio.start();
  missionDirector.start(index, plane);
  setView(viewMode);
  screen = 'playing';
  instruments.setScreen('playing');
}

function finish(title, detail) {
  screen = 'end';
  document.getElementById('end-title').textContent = title;
  document.getElementById('end-eyebrow').textContent = title === 'LANDED' ? 'SORTIE COMPLETE' : 'SORTIE ENDED';
  document.getElementById('end-detail').textContent = detail;
  instruments.setScreen('end');
}

for (const button of document.querySelectorAll('.mission-button')) {
  button.addEventListener('click', () => startMission(Number(button.dataset.mission)));
}
document.getElementById('again').addEventListener('click', () => startMission(missionDirector.index));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (shotName && shots.apply(shotName)) {
  startMission(0);
  instruments.clearToast();
  setView(shots.active === 'cockpit' ? 'cockpit' : 'chase');
  window.__tidewingShot = shotName;
} else {
  instruments.setScreen('start');
}

let previous = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  const events = [];

  if (screen === 'playing') {
    if (shots.active) {
      shots.refresh();
    } else {
      const missionChoice = controls.takeMission();
      if (missionChoice !== null) startMission(missionChoice);
      if (controls.takeView()) setView(viewMode === 'chase' ? 'cockpit' : 'chase');
      if (controls.takeRestart()) startMission(missionDirector.index);
      if (controls.takeDrop()) audio.drop();
      const input = controls.sample();
      plane.update(dt, input, events);
      if (events.some((event) => event.type === 'landed')) audio.success();
      if (events.some((event) => event.type === 'impact' && event.force > 30)) audio.crash();
      missionDirector.update(dt, plane, input, events);
      if (events.some((event) => event.type === 'landed' && missionDirector.status().gatesPassed >= 0)) audio.gate();
    }
  }

  syncAircraft();
  aircraft.update(dt, plane.speed, plane.throttle, plane.elapsed);
  world.update(dt);
  rig.update(plane, dt);
  audio.update(plane);
  instruments.update(plane, missionDirector.status(), plane.elapsed);
  renderer.render(scene, camera);

  if (screen === 'playing' && missionDirector.status().complete) {
    const alignment = plane.runwayAlignment(world.runway);
    finish('LANDED', `${missionDirector.status().name} complete in ${Math.round(missionDirector.status().time)} s, ${Math.round(plane.hull)}% hull, ${Math.round(Math.abs(alignment.across))} m off centreline.`);
  } else if (screen === 'playing' && missionDirector.status().failure) {
    finish('DOWN', missionDirector.status().failure);
  }

  if (!window.__tidewingReady) {
    window.__tidewingReady = true;
    window.__tidewing = {
      ready: true,
      shot: window.__tidewingShot ?? null,
      applyShot(name) { return shots.apply(name); },
      plane,
      world,
      renderer,
    };
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

const MISSIONS = [
  {
    name: 'Beacon circuit',
    objective: 'Thread five amber gates, then land at Marrow Quay',
  },
  {
    name: 'Supply drop',
    objective: 'Reach Cedar Keys, press Space over the pad, then land',
  },
  {
    name: 'Cliff rescue',
    objective: 'Pass close to Lantern Rock light, then land',
  },
];

export function createMissionDirector(world, onToast) {
  let index = 0;
  let gatesPassed = 0;
  let crateDropped = false;
  let rescueHeld = 0;
  let rescueDone = false;
  let stage = 'fly';
  let time = 0;
  let complete = false;
  let failure = '';

  function say(text) {
    if (onToast) onToast(text);
  }

  function status() {
    return {
      index,
      stage,
      crateDropped,
      rescueDone,
      name: MISSIONS[index].name,
      objective: stage === 'land' ? 'Return to Marrow Quay and land straight' : MISSIONS[index].objective,
      gatesPassed,
      gateTotal: world.rings.length,
      time,
      complete,
      failure,
    };
  }

  function start(chosen, plane) {
    index = Math.max(0, Math.min(MISSIONS.length - 1, chosen));
    gatesPassed = 0;
    crateDropped = false;
    rescueHeld = 0;
    rescueDone = false;
    stage = 'fly';
    time = 0;
    complete = false;
    failure = '';
    world.resetGates();
    plane.reset();
    say(MISSIONS[index].name.toUpperCase());
  }

  function markStageIfReady() {
    if (index === 0 && gatesPassed === world.rings.length) stage = 'land';
    if (index === 1 && crateDropped) stage = 'land';
    if (index === 2 && rescueDone) stage = 'land';
  }

  function update(dt, plane, controls, incomingEvents) {
    if (complete || failure) return;
    time += dt;

    if (index === 0 && stage === 'fly') {
      const ring = world.rings[gatesPassed];
      if (ring && plane.position.distanceTo(ring.position) < ring.radius + 8) {
        ring.passed = true;
        ring.mesh.children[0].material.color.setHex(0x4a6a68);
        gatesPassed += 1;
        say(gatesPassed === world.rings.length ? 'ALL GATES CLEARED' : `GATE ${gatesPassed} OF ${world.rings.length}`);
        markStageIfReady();
      }
    }

    if (index === 1 && controls.drop && !crateDropped) {
      const distance = Math.hypot(plane.position.x - world.dropZone.position.x, plane.position.z - world.dropZone.position.z);
      if (distance < world.dropZone.radius + 16 && plane.position.y < 230) {
        crateDropped = true;
        world.dropZone.mesh.material.color.setHex(0x7dffd0);
        say('SUPPLIES AWAY');
        markStageIfReady();
      } else {
        say('NOT OVER THE DROP PAD');
      }
    }

    if (index === 2 && stage === 'fly') {
      const light = world.lighthouse.position;
      const distance = Math.hypot(plane.position.x - light.x, plane.position.z - light.z);
      if (distance < 145 && plane.position.y < light.y + 150 && plane.speed < 78) {
        rescueHeld += dt;
        if (rescueHeld > 1.1 && !rescueDone) {
          rescueDone = true;
          say('SURVIVOR ABOARD');
          markStageIfReady();
        }
      } else {
        rescueHeld = Math.max(0, rescueHeld - dt * 0.6);
      }
    }

    for (const event of incomingEvents) {
      if (event.type === 'landed') {
        const alignment = plane.runwayAlignment(world.runway);
        if (stage === 'land' && alignment.onStrip) {
          complete = true;
          say(event.quality === 'clean' ? 'CLEAN LANDING' : 'SAFE LANDING');
        } else {
          failure = 'You set down off the strip.';
        }
      }
      if (event.type === 'impact' && event.force > 34) say('HULL STRAIN');
    }
    if (plane.crashed) failure = plane.lastImpact || 'The aircraft is lost.';
  }

  return { start, update, status, get index() { return index; } };
}

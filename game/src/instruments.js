const $ = (id) => document.getElementById(id);

function buildCompass(element) {
  const headings = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (let degree = 0; degree < 360; degree += 10) {
      const cardinal = degree === 0 ? 'N' : degree === 90 ? 'E' : degree === 180 ? 'S' : degree === 270 ? 'W' : '';
      const span = document.createElement('span');
      span.textContent = cardinal || String(degree).padStart(3, '0');
      if (cardinal) span.className = 'cardinal';
      headings.push(span);
      element.appendChild(span);
    }
  }
  return headings;
}

function buildTape(element, start, end, step, format) {
  const rows = [];
  for (let value = start; value <= end; value += step) {
    const row = document.createElement('div');
    row.textContent = format(value);
    if (value % (step * 2) === 0) row.className = 'major';
    rows.push(row);
    element.appendChild(row);
  }
  return rows;
}

export function createInstruments() {
  const compassStrip = $('compass-strip');
  const speedStrip = $('speed-strip');
  const altStrip = $('alt-strip');
  buildCompass(compassStrip);
  buildTape(speedStrip, 0, 130, 10, (v) => String(v).padStart(3, '0'));
  buildTape(altStrip, 0, 4400, 200, (v) => String(v).padStart(4, '0'));

  const ladder = $('attitude-ladder');
  for (const degrees of [-20, -10, 0, 10, 20]) {
    const line = document.createElement('span');
    line.textContent = degrees > 0 ? `+${degrees}` : String(degrees);
    line.style.top = `${50 - degrees * 1.7}%`;
    ladder.appendChild(line);
  }

  const nodes = {
    compassStrip, speedStrip, altStrip,
    hud: $('hud'), cockpit: $('cockpit'), start: $('start'), end: $('end'),
    missionName: $('mission-name'), objective: $('objective'), timer: $('timer'), ringCount: $('ring-count'),
    heading: $('heading-readout'), speed: $('speed-readout'), altitude: $('alt-readout'),
    throttleValue: $('throttle-value'), fuelValue: $('fuel-value'), hullValue: $('hull-value'),
    throttleBar: $('throttle-bar'), fuelBar: $('fuel-bar'), hullBar: $('hull-bar'), vsi: $('vsi-value'),
    attitudeBall: $('attitude-ball'), cockpitHorizon: $('cockpit-horizon'),
    needleSpeed: $('needle-speed'), needleAlt: $('needle-alt'), headingCard: $('heading-card'),
    beaconLamp: $('beacon-lamp'), gearLamp: $('gear-lamp'), fuelLamp: $('fuel-lamp'),
    toast: $('toast'), reticle: $('reticle'),
  };

  let toastUntil = 0;

  function toast(text) {
    nodes.toast.textContent = text;
    nodes.toast.classList.add('show');
    toastUntil = performance.now() + 1700;
  }

  function setScreen(screen) {
    nodes.start.classList.toggle('hidden', screen !== 'start');
    nodes.end.classList.toggle('hidden', screen !== 'end');
    nodes.hud.classList.toggle('hidden', screen === 'start' || screen === 'end');
  }

  function setView(mode) {
    nodes.cockpit.classList.toggle('hidden', mode !== 'cockpit');
    nodes.reticle.classList.toggle('hidden', mode === 'cockpit');
    nodes.hud.classList.toggle('chase', mode === 'chase');
    nodes.hud.classList.toggle('cockpit-view', mode === 'cockpit');
  }

  function clearToast() {
    nodes.toast.classList.remove('show');
    toastUntil = 0;
  }

  function update(plane, mission, elapsed) {
    const heading = plane.headingDegrees();
    const altitude = Math.max(0, Math.round(plane.position.y * 3));
    const speedKnots = Math.round(plane.speed * 1.94);
    const bankDegrees = (plane.bank * 180) / Math.PI;
    const pitchDegrees = (plane.pitch * 180) / Math.PI;

    nodes.heading.textContent = String(heading).padStart(3, '0');
    nodes.speed.textContent = String(speedKnots).padStart(3, '0');
    nodes.altitude.textContent = String(altitude).padStart(4, '0');
    nodes.compassStrip.style.transform = `translateX(${159 - (36 + heading / 10) * 42}px)`;
    nodes.speedStrip.style.transform = `translateY(${88 - (plane.speed / 10) * 22}px)`;
    nodes.altStrip.style.transform = `translateY(${88 - (altitude / 200) * 22}px)`;

    nodes.attitudeBall.style.transform = `rotate(${-bankDegrees}deg)`;
    ladder.style.transform = `translateY(${pitchDegrees * 1.7}px)`;
    nodes.cockpitHorizon.style.transform = `rotate(${-bankDegrees}deg) translateY(${pitchDegrees * 2.1}px)`;
    nodes.needleSpeed.style.transform = `rotate(${Math.max(-135, Math.min(135, speedKnots / 120 * 270 - 135))}deg)`;
    nodes.needleAlt.style.transform = `rotate(${Math.max(-135, Math.min(135, altitude / 4000 * 270 - 135))}deg)`;
    nodes.headingCard.textContent = String(heading).padStart(3, '0');

    const throttlePercent = Math.round(plane.throttle * 100);
    const fuelPercent = Math.round(plane.fuel);
    const hullPercent = Math.round(plane.hull);
    nodes.throttleValue.textContent = `${throttlePercent}%`;
    nodes.fuelValue.textContent = `${fuelPercent}%`;
    nodes.hullValue.textContent = `${hullPercent}%`;
    nodes.throttleBar.style.width = `${throttlePercent}%`;
    nodes.fuelBar.style.width = `${fuelPercent}%`;
    nodes.hullBar.style.width = `${hullPercent}%`;
    nodes.vsi.textContent = `${plane.verticalSpeed >= 0 ? '+' : '-'}${String(Math.round(Math.abs(plane.verticalSpeed) * 3)).padStart(4, '0')}`;
    nodes.beaconLamp.classList.toggle('on', Math.sin(elapsed * 7) > 0.2);
    nodes.gearLamp.classList.toggle('on', plane.gearDown);
    nodes.fuelLamp.classList.toggle('on', plane.fuel > 18);

    nodes.missionName.textContent = mission.name;
    nodes.objective.textContent = mission.objective;
    const minutes = Math.floor(mission.time / 60), seconds = Math.floor(mission.time % 60);
    nodes.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    nodes.ringCount.textContent = mission.index === 0
      ? `GATES ${mission.gatesPassed} / ${mission.gateTotal}`
      : mission.index === 1
        ? (mission.crateDropped ? 'CRATE DELIVERED' : 'CRATE ABOARD')
        : (mission.rescueDone ? 'SURVIVOR ABOARD' : 'RESCUE PENDING');

    if (toastUntil && performance.now() > toastUntil) {
      nodes.toast.classList.remove('show');
      toastUntil = 0;
    }
  }

  return { update, toast, clearToast, setScreen, setView };
}

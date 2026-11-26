export function createControls(canvas) {
  const pressed = new Set();
  const pending = { drop: false, view: false, restart: false, mission: null };
  const mouse = { x: 0, y: 0, active: false, lastMove: 0 };

  const codeMap = new Set([
    'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  ]);

  window.addEventListener('keydown', (event) => {
    if (codeMap.has(event.code)) event.preventDefault();
    if (!event.repeat) {
      if (event.code === 'Space') pending.drop = true;
      if (event.code === 'KeyC') pending.view = true;
      if (event.code === 'KeyR') pending.restart = true;
      if (event.code === 'Digit1') pending.mission = 0;
      if (event.code === 'Digit2') pending.mission = 1;
      if (event.code === 'Digit3') pending.mission = 2;
    }
    pressed.add(event.code);
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.code));
  window.addEventListener('blur', () => pressed.clear());

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    mouse.active = true;
    mouse.lastMove = performance.now();
  });
  canvas.addEventListener('click', () => { pending.drop = true; });

  function sample() {
    const up = pressed.has('KeyW') || pressed.has('ArrowUp');
    const down = pressed.has('KeyS') || pressed.has('ArrowDown');
    const left = pressed.has('KeyA') || pressed.has('ArrowLeft');
    const right = pressed.has('KeyD') || pressed.has('ArrowRight');
    const rudderLeft = pressed.has('KeyQ');
    const rudderRight = pressed.has('KeyE');
    const more = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
    const less = pressed.has('ControlLeft') || pressed.has('ControlRight');

    let pitch = (up ? 1 : 0) - (down ? 1 : 0);
    let bank = (right ? 1 : 0) - (left ? 1 : 0);
    if (pitch === 0 && bank === 0 && mouse.active && performance.now() - mouse.lastMove < 3200) {
      pitch = -mouse.y * 0.7;
      bank = mouse.x * 0.8;
    }
    return {
      pitch,
      bank,
      rudder: (rudderRight ? 1 : 0) - (rudderLeft ? 1 : 0),
      throttleDelta: (more ? 1 : 0) - (less ? 1 : 0),
    };
  }

  function take(name) {
    const value = pending[name];
    pending[name] = name === 'mission' ? null : false;
    return value;
  }

  return {
    sample,
    takeDrop: () => take('drop'),
    takeView: () => take('view'),
    takeRestart: () => take('restart'),
    takeMission: () => take('mission'),
  };
}

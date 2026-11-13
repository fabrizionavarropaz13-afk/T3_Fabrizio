// Control de movimiento independiente de los graficos y del bloqueo del mouse.
export const ACTION_KEYS = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint'
};

export function createControls(element = document) {
  const down = new Set();
  const virtual = new Set();
  let lastKey = '-';
  const keyToAction = (event) => ACTION_KEYS[event.code] || {
    w: 'forward', s: 'back', a: 'left', d: 'right',
    ArrowUp: 'forward', ArrowDown: 'back', ArrowLeft: 'left', ArrowRight: 'right', Shift: 'sprint'
  }[event.key?.length === 1 ? event.key.toLowerCase() : event.key];
  const onDown = event => {
    const action = keyToAction(event);
    if (!action) return;
    event.preventDefault();
    down.add(action);
    lastKey = event.code || event.key;
  };
  const onUp = event => {
    const action = keyToAction(event);
    if (!action) return;
    event.preventDefault();
    down.delete(action);
  };
  element.addEventListener('keydown', onDown, true);
  element.addEventListener('keyup', onUp, true);
  window.addEventListener('blur', () => down.clear());
  return {
    isHeld: action => down.has(action) || virtual.has(action),
    setVirtual: (action, enabled) => enabled ? virtual.add(action) : virtual.delete(action),
    get lastKey() { return lastKey; },
    get state() {
      return {forward:this.isHeld('forward'),back:this.isHeld('back'),left:this.isHeld('left'),right:this.isHeld('right'),sprint:this.isHeld('sprint')};
    }
  };
}

export function movePlayer(player, input, elapsed, obstacles = []) {
  const forward = Number(Boolean(input.forward)) - Number(Boolean(input.back));
  const sideways = Number(Boolean(input.right)) - Number(Boolean(input.left));
  if (!forward && !sideways) return false;
  const length = Math.hypot(forward, sideways) || 1;
  const speed = input.sprint ? 6.3 : 4.6;
  const dt = Math.max(0, Math.min(0.06, Number(elapsed) || 0));
  const angle = Number.isFinite(player.yaw) ? player.yaw : 0;
  const dx = (sideways * Math.cos(angle) - forward * Math.sin(angle)) / length * speed * dt;
  const dz = (-forward * Math.cos(angle) - sideways * Math.sin(angle)) / length * speed * dt;
  const inside = (x,z) => {
    if (x < -6.7 || x > 6.7 || z < -114 || z > 13) return false;
    return !obstacles.some(o => Math.abs(x - o.x) < o.w/2 + .34 && Math.abs(z - o.z) < o.d/2 + .34);
  };
  let moved = false;
  if (Number.isFinite(dx) && inside(player.x + dx, player.z)) { player.x += dx; moved ||= Math.abs(dx)>1e-9; }
  if (Number.isFinite(dz) && inside(player.x, player.z + dz)) { player.z += dz; moved ||= Math.abs(dz)>1e-9; }
  return moved;
}

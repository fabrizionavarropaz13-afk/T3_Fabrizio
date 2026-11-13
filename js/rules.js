// Reglas del videojuego que pueden probarse sin cargar Three.js.
export const DETECTION_DISTANCE = 17;
export const CONTACT_DISTANCE = 1.05;
export const REQUIRED_HITS = 2;
export const EXTRACTION_Z = -108;
export const EXTRACTION_RADIUS = 5.4;

export function zombieDetects(distance, radius = DETECTION_DISTANCE) {
  return Number.isFinite(distance) && distance <= radius;
}
export function zombieTouches(distance) {
  return Number.isFinite(distance) && distance < CONTACT_DISTANCE;
}
export function hitZombie(zombie) {
  if (!zombie.alive) return 'dead';
  zombie.hp -= 1;
  if (zombie.hp <= 0) {
    zombie.hp = 0;
    zombie.alive = false;
    zombie.active = false;
    return 'killed';
  }
  return 'hit';
}
export function spendAmmo(weapon) {
  if (weapon.ammo <= 0) return false;
  weapon.ammo -= 1;
  return true;
}
export function collectAmmo(weapons, values = [12, 6]) {
  weapons.forEach((weapon, index) => { weapon.ammo += values[index] || 0; });
}
export function isExtracted(x, z) {
  return Math.abs(x) < EXTRACTION_RADIUS && z <= EXTRACTION_Z + 3;
}
export function missionStage(z) {
  if (z > -34) return { number: '01', title: 'CALLES ABANDONADAS' };
  if (z > -77) return { number: '02', title: 'ZONA INFECTADA' };
  return { number: '03', title: 'EXTRACCIÓN' };
}

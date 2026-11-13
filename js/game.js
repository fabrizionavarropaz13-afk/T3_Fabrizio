import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createControls, movePlayer } from './movement.js';
import { DETECTION_DISTANCE, CONTACT_DISTANCE, hitZombie, spendAmmo, collectAmmo, isExtracted, missionStage, zombieDetects } from './rules.js';

const $ = id => document.getElementById(id);
const ui = {
  overlay: $('overlay'), title: $('title'), desc: $('description'), start: $('start'), status: $('status'),
  top: $('hudTop'), bottom: $('hudBottom'), aim: $('crosshair'), dpad: $('dpad'), position: $('debug'), stage: $('stage'), pickups: $('pickups'),
  distance: $('distance'), health: $('health'), kills: $('kills'), weapon: $('weapon'), ammo: $('ammo'), notice: $('notice')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x677879);
scene.fog = new THREE.Fog(0x677879, 42, 135);
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, .07, 165);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'default'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('scene').appendChild(renderer.domElement);
renderer.domElement.tabIndex = 0;
scene.add(new THREE.HemisphereLight(0xdce7d1, 0x343a3c, 2.35));
const sunlight = new THREE.DirectionalLight(0xffe3bb, 1.8);
sunlight.position.set(-14, 26, -45);
scene.add(sunlight);

const material = (color, opts={}) => new THREE.MeshStandardMaterial({color, roughness:.94,...opts});
const m = {
  road:material(0x364348), lines:material(0xd8bb76), pavement:material(0x566264),
  wall:material(0x526162), roof:material(0x263238), window:material(0x25363d, {emissive:0x14252c}),
  metal:material(0x435354), rust:material(0x9d6650), crate:material(0x9d7849),
  dark:material(0x152326), lamp:material(0xb4ee8f, {emissive:0x6ecb4e,emissiveIntensity:2.4}),
  zombieSkin:material(0x96a979), zombieClothes:material(0x5a6d5c)
};
function box(w,h,d,mat,x,y,z,parent=scene) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  o.position.set(x,y,z);parent.add(o);return o;
}
function ball(r,mat,x,y,z,parent=scene) {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r,8,6),mat);
  o.position.set(x,y,z);parent.add(o);return o;
}

const obstacles = [];
const shootWalls = [];
function addObstacle(x,z,w,d) {
  obstacles.push({x,z,w,d});
  const hit = box(w,2,d,new THREE.MeshBasicMaterial({visible:false}),x,1,z);
  shootWalls.push(hit);
}

// Calle amplia: el centro (X=0) comienza completamente libre.
box(15,.24,134,m.road,0,-.13,-51);
for(let z=8;z>-112;z-=8) box(.13,.015,3.2,m.lines,0,.008,z);
for(const side of [-1,1]) {
  box(2,.25,132,m.pavement,side*8.4,-.035,-51);
  for(let z=6;z>-110;z-=15) {
    const h=8+(Math.sin(z+side)*.5+.5)*7;
    box(8,h,13.5,m.wall,side*13.2,h/2-.22,z-3.6);
    box(8.4,.42,13.7,m.roof,side*13.2,h,z-3.6);
    for(let y=2.5;y<h-1;y+=3.5) {
      for(let zz=-1;zz<=1;zz++)box(.12,1.4,1.1,m.window,side*9.18,y,z-3.6+zz*3.4);
    }
  }
  box(.18,.9,124,m.rust,side*7.25,.43,-51);
}
for(const [x,z,w,d] of [[-4.4,-21,2.3,2.0],[4.3,-40,2.4,2.4],[-4.4,-60,2.8,2.0],[4,-82,2.8,2.1]]) {
  box(w,1.15,d,m.metal,x,.55,z);
  box(w,.16,d,m.rust,x,1.21,z);
  addObstacle(x,z,w,d);
}
for(const [x,z,w,d] of [[0,-43,2.6,1.4],[-1.5,-65,2.6,1.5],[1.1,-92,3.0,1.8]]) {
  box(w,1.2,d,m.crate,x,.58,z); box(w,.16,d,m.rust,x,1.2,z); addObstacle(x,z,w,d);
}
for(const [x,z] of [[4.7,-12],[-4.6,-33],[4.7,-52],[-4.6,-74]]) {
  box(2.2,.8,3.8,m.dark,x,.55,z);
  box(1.8,.6,2.0,m.metal,x,1.17,z);
  for(let dx of [-.9,.9])for(let dz of [-1.25,1.25])ball(.32,m.dark,x+dx,.34,z+dz);
  addObstacle(x,z,2.2,3.8);
}

// Zona de salida destacada al final del recorrido.
const finishZ = -108;
box(11,.12,6,m.lamp,0,.02,finishZ);
for(let x of [-5.4,5.4])box(.5,5,.5,m.lamp,x,2.5,finishZ-1.5);
box(11.4,.55,.5,m.lamp,0,5,finishZ-1.5);
const nameCanvas=document.createElement('canvas');nameCanvas.width=512;nameCanvas.height=128;
const ctx=nameCanvas.getContext('2d');ctx.fillStyle='#19322b';ctx.fillRect(0,0,512,128);
ctx.fillStyle='#ceffb6';ctx.font='bold 48px Arial';ctx.textAlign='center';ctx.fillText('EXTRACCIÓN',256,80);
const exitTexture=new THREE.CanvasTexture(nameCanvas);exitTexture.colorSpace=THREE.SRGBColorSpace;
const exitLabel=new THREE.Mesh(new THREE.PlaneGeometry(7,1.35),new THREE.MeshBasicMaterial({map:exitTexture,side:THREE.DoubleSide}));
exitLabel.position.set(0,4.15,finishZ-1.18);scene.add(exitLabel);
const exitLight=new THREE.PointLight(0xa4ff80,7,23);exitLight.position.set(0,3,finishZ);scene.add(exitLight);

// Objetos de munición.
const supplies=[];
for(const [x,z] of [[-1.5,-14],[2.5,-36],[-2.5,-57],[2,-77],[-1,-98]]) {
  const group=new THREE.Group();scene.add(group);group.position.set(x,0,z);
  box(.9,.55,.7,m.crate,0,.32,0,group);
  box(.14,.07,.72,m.dark,0,.63,0,group);
  box(.35,.09,.05,m.lamp,0,.35,.37,group);
  box(.09,.35,.05,m.lamp,0,.35,.38,group);
  const light=ball(.12,m.lamp,0,1.12,0,group);
  supplies.push({group,x,z,light,taken:false});
}

const player={x:0,z:9,yaw:0,pitch:0,hp:100,kills:0,pickups:0,walk:0};
const controls=createControls(document);
let playing=false,ended=false,locked=false,flash=0,recoil=0,alertAt=0;
const turnKeys=new Set();
const weapons=[{name:'RIFLE',ammo:8,refill:12,range:65,file:'assets/rifle.glb'}, {name:'ESCOPETA',ammo:4,refill:6,range:32,file:'assets/shotgun.glb'}];
let selected=0;
const gunGroup=new THREE.Group();camera.add(gunGroup);scene.add(camera);
const gunModels=[null,null];
const zombiePositions=[[-1.1,-20],[2.2,-30],[-1.9,-44],[2.0,-57],[-1.2,-70],[1.8,-83],[-2.2,-94],[0,-102]];
const zombies=[];
const raycaster=new THREE.Raycaster();
const shotMarks=[];
const loader=new GLTFLoader();

function fallbackGun(index) {
  const g=new THREE.Group();
  box(index===0?.18:.26,.23,.82,m.metal,0,0,-.5,g);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.5,8),m.dark);
  barrel.rotation.x=Math.PI/2;barrel.position.set(0,0,-1.12);g.add(barrel);
  box(.12,.4,.12,m.dark,0,-.27,-.3,g);return g;
}
function fallbackZombie(){
  const z=new THREE.Group();
  box(.58,.84,.28,m.zombieClothes,0,1.1,0,z);
  ball(.29,m.zombieSkin,0,1.78,0,z);
  for(let x of [-.21,.21]){
    box(.19,.78,.2,m.zombieClothes,x,.43,0,z);
    box(.2,.7,.2,m.zombieSkin,x*2,1.13,0,z);
  }
  return z;
}
function replaceGun(index, model){
  if(gunModels[index])gunGroup.remove(gunModels[index]);
  gunModels[index]=model;gunGroup.add(model);
  gunModels.forEach((g,i)=>{if(g)g.visible=i===selected;});
}
replaceGun(0,fallbackGun(0));replaceGun(1,fallbackGun(1));
for(const [i,pos] of zombiePositions.entries()) {
  const root=new THREE.Group();root.position.set(pos[0],0,pos[1]);scene.add(root);
  const body=fallbackZombie();root.add(body);
  zombies.push({root,body,hp:2,alive:true,active:false,speed:2.45+(i%3)*.24,bob:i});
}

// Carga REAL de GLB. Mientras llegan los archivos el juego ya funciona con modelos provisionales.
Promise.allSettled([
  loader.loadAsync(weapons[0].file), loader.loadAsync(weapons[1].file), loader.loadAsync('assets/zombie.glb')
]).then(results=>{
  for(let i=0;i<2;i++)if(results[i].status==='fulfilled'){
    const weapon=results[i].value.scene;
    weapon.scale.setScalar(i===0?.56:.48);
    replaceGun(i,weapon);
  }
  if(results[2].status==='fulfilled'){
    const template=results[2].value.scene;
    zombies.forEach(z=>{
      z.root.remove(z.body);
      const model=template.clone(true);model.scale.setScalar(.79);
      z.root.add(model);z.body=model;
    });
  }
  const failed=results.filter(r=>r.status==='rejected').length;
  ui.status.textContent=failed?`${3-failed}/3 modelos GLB cargados. Revisa la carpeta assets/`:'3/3 modelos GLB cargados. Listo para jugar.';
  if(failed)ui.status.style.color='#ffad9f';
}).catch(err=>{ui.status.textContent='Error de modelos: '+err.message;});

function notify(message){ui.notice.textContent=message;alertAt=performance.now()+1800;}
function selectWeapon(index){selected=index;gunModels.forEach((g,i)=>{if(g)g.visible=i===index;});ui.weapon.textContent=weapons[index].name;ui.ammo.textContent=weapons[index].ammo;notify(index===0?'RIFLE EQUIPADO':'ESCOPETA EQUIPADA');}
function begin(){
  if(ended){window.location.reload();return;}
  playing=true;ui.overlay.style.display='none';
  ui.top.classList.remove('hidden');ui.bottom.classList.remove('hidden');
  ui.aim.classList.add('on');ui.dpad.classList.remove('hidden');
  renderer.domElement.focus({preventScroll:true});
  // Se activa el mouse al hacer clic en el escenario. W/S/A/D funcionan desde ya.
  notify('WASD PARA MOVERTE · CLIC EN EL ESCENARIO PARA MIRAR');
}
function end(won){
  ended=true;playing=false;
  document.exitPointerLock?.();
  ui.overlay.style.display='grid';ui.title.textContent=won?'MISIÓN COMPLETADA':'GAME OVER';
  ui.desc.textContent=won?'MISIÓN COMPLETADA: Has llegado a la zona de extracción. Zombis eliminados: '+player.kills+'.':'Un zombi te atrapó. La partida terminó. Puedes intentar otra ruta.';
  ui.start.textContent='REINICIAR JUEGO';ui.status.textContent='Partida terminada. Pulsa para comenzar de nuevo.';
  ui.dpad.classList.add('hidden');ui.aim.classList.remove('on');
}
ui.start.addEventListener('click',begin);
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;});
document.addEventListener('mousemove',e=>{
  if(!playing||!locked)return;
  player.yaw-=e.movementX*.0023;
  player.pitch=THREE.MathUtils.clamp(player.pitch-e.movementY*.0023,-1.25,1.25);
});
document.addEventListener('keydown',e=>{
  if(!playing)return;
  if(e.code==='Digit1'||e.code==='Numpad1')selectWeapon(0);
  if(e.code==='Digit2'||e.code==='Numpad2')selectWeapon(1);
  if(e.code==='KeyQ'||e.code==='KeyE'){turnKeys.add(e.code);e.preventDefault();}
  if(e.code==='F3'){ui.position.classList.toggle('hidden');e.preventDefault();}
},true);
document.addEventListener('keyup',e=>{turnKeys.delete(e.code);},true);
window.addEventListener('blur',()=>turnKeys.clear());

// Botones visibles que mueven incluso si Chrome no reconoce el teclado.
for(const b of document.querySelectorAll('[data-move]')){
  const action=b.dataset.move;
  b.addEventListener('pointerdown',e=>{e.preventDefault();controls.setVirtual(action,true);b.setPointerCapture?.(e.pointerId);});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>controls.setVirtual(action,false));
  b.addEventListener('click',()=>{if(!playing)return;const state={forward:false,back:false,left:false,right:false,sprint:false};state[action]=true;movePlayer(player,state,.06,obstacles);});
}
const muzzle=new THREE.PointLight(0xffcc74,0,5);camera.add(muzzle);muzzle.position.set(.3,-.3,-1);
function shoot(){
  if(!playing||ended)return;
  const gun=weapons[selected];if(!spendAmmo(gun)){notify('SIN BALAS · BUSCA CAJAS DE MUNICIÓN');return;}
  ui.ammo.textContent=gun.ammo;flash=.09;recoil=.16;
  camera.updateMatrixWorld(true);
  const direction=new THREE.Vector3();camera.getWorldDirection(direction);
  raycaster.set(camera.position,direction);raycaster.far=gun.range;
  const enemyMeshes=[];
  for(const z of zombies)if(z.alive){z.body.traverse(obj=>{if(obj.isMesh){obj.userData.target=z;enemyMeshes.push(obj);}});}
  const targets=raycaster.intersectObjects(enemyMeshes,false);
  const walls=raycaster.intersectObjects(shootWalls,false);
  const valid=targets.length>0&&(!walls.length||targets[0].distance<walls[0].distance);
  if(valid){
    const zombie=targets[0].object.userData.target;
    const result=hitZombie(zombie);
    if(result==='killed'){zombie.root.visible=false;player.kills++;ui.kills.textContent=player.kills+'/'+zombies.length;notify('ZOMBI ELIMINADO · 2/2');}
    else if(result==='hit')notify('IMPACTO 1/2');
  }
  const point=valid?targets[0].point:(walls.length?walls[0].point:camera.position.clone().addScaledVector(direction,25));
  const mark=ball(.075,new THREE.MeshBasicMaterial({color:valid?0xff5540:0xf7de8a,transparent:true}),point.x,point.y,point.z);
  shotMarks.push({mark,life:.16});
}
renderer.domElement.addEventListener('mousedown',e=>{if(e.button!==0||!playing)return;shoot();if(!locked){try{renderer.domElement.requestPointerLock?.();}catch{}}});

const clock=new THREE.Clock();
let gameErrorShown=false;
function update(dt,time){
  if(!playing)return;
  if(turnKeys.has('KeyQ'))player.yaw+=dt*1.75;
  if(turnKeys.has('KeyE'))player.yaw-=dt*1.75;
  const moving=movePlayer(player,controls.state,dt,obstacles);
  // La camara SIEMPRE sigue la posicion, sin ninguna dependencia del cursor.
  if(moving)player.walk+=dt*11;
  camera.position.set(player.x,1.72+(moving?Math.sin(player.walk)*.035:0),player.z);
  if(controls.isHeld('sprint'))player.walk+=dt*2;
  camera.rotation.order='YXZ';camera.rotation.set(player.pitch,player.yaw,0);
  gunGroup.position.set(.43+Math.sin(player.walk)*.012,-.47+Math.abs(Math.cos(player.walk))*.012-recoil*.28,-.57+recoil);
  gunGroup.rotation.x=-recoil*.38;recoil=Math.max(0,recoil-dt*1.3);
  flash=Math.max(0,flash-dt);muzzle.intensity=flash>0?12:0;
  ui.position.textContent=`POS X ${player.x.toFixed(1)} / Z ${player.z.toFixed(1)} · ${moving?'MOVIENDO':'QUIETO'} · ${controls.lastKey}`;
  const stage=missionStage(player.z);ui.stage.textContent=stage.number+' · '+stage.title;
  ui.distance.textContent='EXTRACCIÓN: '+Math.max(0,Math.round(player.z-finishZ))+' m';

  for(const z of zombies){
    if(!z.alive)continue;
    const dx=player.x-z.root.position.x,dz=player.z-z.root.position.z;
    const distance=Math.hypot(dx,dz);
    z.active=zombieDetects(distance,DETECTION_DISTANCE);
    if(!z.active)continue;
    z.root.rotation.y=Math.atan2(dx,dz);
    if(distance>1.1){
      const step=z.speed*dt;
      const sx=dx/(distance||1)*step,sz=dz/(distance||1)*step;
      // Los zombis evitan atravesar los vehiculos grandes.
      const blocked=(x,zpos)=>obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.28&&Math.abs(zpos-o.z)<o.d/2+.28);
      if(!blocked(z.root.position.x+sx,z.root.position.z+sz)) {z.root.position.x+=sx;z.root.position.z+=sz;}
      else if(!blocked(z.root.position.x,z.root.position.z+sz))z.root.position.z+=sz;
      else if(!blocked(z.root.position.x+sx,z.root.position.z))z.root.position.x+=sx;
    }
    z.body.position.y=Math.abs(Math.sin(time*5+z.bob))*.035;
    if(distance<CONTACT_DISTANCE){player.hp=0;ui.health.textContent='ATRAPADO';end(false);return;}
  }
  for(const p of supplies){
    if(p.taken)continue;
    p.light.position.y=1.1+Math.sin(time*3+p.z)*.12;
    if(Math.hypot(player.x-p.x,player.z-p.z)<1.3){
      p.taken=true;scene.remove(p.group);
      collectAmmo(weapons,weapons.map(g=>g.refill));player.pickups++;ui.pickups.textContent=player.pickups+'/'+supplies.length;
      ui.ammo.textContent=weapons[selected].ammo;
      notify('CAJA RECOGIDA · +12 RIFLE / +6 ESCOPETA');
    }
  }
  for(let i=shotMarks.length-1;i>=0;i--){
    const impact=shotMarks[i];impact.life-=dt;
    impact.mark.scale.setScalar(Math.max(.01,impact.life*6));
    if(impact.life<=0){scene.remove(impact.mark);shotMarks.splice(i,1);}
  }
  if(isExtracted(player.x,player.z)){end(true);return;}
  if(performance.now()>alertAt)ui.notice.textContent='';
}
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,clock.getDelta());
  try{update(dt,clock.elapsedTime);renderer.render(scene,camera);}
  catch(error){if(!gameErrorShown){gameErrorShown=true;ui.notice.textContent='ERROR DE JUEGO: '+error.message;console.error(error);}}
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
camera.position.set(player.x,1.72,player.z);
ui.status.textContent='Escenario listo. Se están cargando los modelos GLB…';
ui.kills.textContent='0/'+zombies.length;ui.pickups.textContent='0/'+supplies.length;ui.ammo.textContent=weapons[0].ammo;
window.GAME_READY=true;
window.T3_DIAGNOSTICO={getPosition:()=>({x:player.x,z:player.z}),getKeys:()=>controls.state, getZombies:()=>zombies.map(z=>({hp:z.hp,alive:z.alive,active:z.active})), getAmmo:()=>weapons.map(w=>w.ammo)};
animate();

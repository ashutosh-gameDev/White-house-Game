import * as THREE from 'three';
import {countries,drawFlag,normalizeCountry} from '/countries.js';
import {BLOCK_WIDTH,BLOCK_DEPTH,STEP,MAX_TICKS,flightDay,flightSeed,gliderBlock,createFlight,stepFlight} from './flight.js';

const el=id=>document.getElementById(id);
const play=el('play'), panel=el('panel');
const soundButton=el('sound');
let soundEnabled=true,audio;
try{soundEnabled=localStorage.getItem('glider-sound')!=='off';}catch{}
function updateSoundButton(){
 soundButton.textContent=soundEnabled?'Sound on':'Sound off';
 soundButton.setAttribute('aria-pressed',String(soundEnabled));
}
updateSoundButton();
// Original synthesized ambient and effects dedicated to the public domain under CC0 1.0.
function startAudio(){
 if(!soundEnabled)return;
 try{
  if(!audio){
   const Audio=window.AudioContext??window.webkitAudioContext;
   if(!Audio)return;
   const context=new Audio(),master=context.createGain();
   master.gain.value=.22;
   master.connect(context.destination);
   const filter=context.createBiquadFilter();
   filter.type='lowpass';filter.frequency.value=150;
   const thrust=context.createGain();thrust.gain.value=0;
   filter.connect(thrust).connect(master);
   const engine=context.createOscillator();engine.type='triangle';engine.frequency.value=43;
   engine.connect(filter);engine.start();
   const pad=context.createGain();pad.gain.value=.085;pad.connect(master);
   for(const frequency of [65.41,98,146.83]){
    const oscillator=context.createOscillator();oscillator.type='sine';oscillator.frequency.value=frequency;
    oscillator.connect(pad);oscillator.start();
   }
   const buffer=context.createBuffer(1,Math.floor(context.sampleRate*.45),context.sampleRate);
   const samples=buffer.getChannelData(0);
   let low=0;
   for(let i=0;i<samples.length;i++){low=(low+Math.random()*.32-.16)/1.12;samples[i]=low*3;}
   audio={context,master,engine,filter,thrust,buffer};
  }
  audio.master.gain.setTargetAtTime(.22,audio.context.currentTime,.05);
  void audio.context.resume().catch(()=>{});
 }catch{}
}
soundButton.onclick=()=>{
 soundEnabled=!soundEnabled;
 try{localStorage.setItem('glider-sound',soundEnabled?'on':'off');}catch{}
 updateSoundButton();
 if(soundEnabled)startAudio();
 else if(audio)audio.master.gain.setTargetAtTime(0,audio.context.currentTime,.04);
};
function soundEffect(kind){
 if(!audio||!soundEnabled)return;
 const {context,master,buffer}=audio,now=context.currentTime,gain=context.createGain();
 gain.gain.setValueAtTime(kind==='crash'?.70:.22,now);
 gain.gain.exponentialRampToValueAtTime(.001,now+.46);
 gain.connect(master);
 if(kind==='crash'){
  const source=context.createBufferSource();source.buffer=buffer;
  source.connect(gain);source.start();
 }else{
  const tone=context.createOscillator();tone.type='sine';
  tone.frequency.setValueAtTime(260,now);tone.frequency.exponentialRampToValueAtTime(480,now+.22);
  tone.connect(gain);tone.start();tone.stop(now+.46);
 }
}
const canvas=el('city');
let renderer;
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true});
}catch{
 el('message').textContent='Space Glider needs a browser with WebGL 2.';
 throw new Error('WebGL 2 unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setClearColor(0x111827);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x111827,.009);
const camera=new THREE.PerspectiveCamera(59,1,.1,260);
function resize(){
 renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
 camera.aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
 camera.fov=camera.aspect<.85?68:59;
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
resize();
scene.add(new THREE.HemisphereLight(0xc9e6ff,0x363447,2.0));
const keyLight=new THREE.DirectionalLight(0xf1ecff,2.15);
keyLight.position.set(-9,20,10);
scene.add(keyLight);

const surface=(color)=>new THREE.MeshLambertMaterial({color,flatShading:true});
const glow=color=>new THREE.MeshBasicMaterial({color});
const gray=[0x8b93a5,0xb5bdcc,0x626c81,0xd3d6db].map(surface);
const ground=surface(0x30384a),black=surface(0x212c40);
const cyan=glow(0x76efff),pink=glow(0xff54b8),violet=glow(0xbdb0ff);
const shell=surface(0xe1e9f4);
const fragileEdge=new THREE.LineBasicMaterial({color:0xffa743,transparent:true,opacity:.85});
const boxGeometry=new THREE.BoxGeometry(1,1,1);
const sphereGeometry=new THREE.IcosahedronGeometry(1,0);
const obstacleGeometries=[
 new THREE.BoxGeometry(1,1,1),
 new THREE.CylinderGeometry(.29,.5,1,5),
 new THREE.CylinderGeometry(0,.5,1,4),
 new THREE.OctahedronGeometry(.5)
];
const obstacleEdges=obstacleGeometries.map(shape=>new THREE.EdgesGeometry(shape));
const edgeMaterials=[0x43b1c8,0xc452a2,0x817bd1].map(color=>
 new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));
const flameGeometry=new THREE.ConeGeometry(.27,1,6);
const shieldGeometry=new THREE.IcosahedronGeometry(1,1);
const ringGeometry=new THREE.TorusGeometry(.72,.055,5,16);

function mesh(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1){
 const part=new THREE.Mesh(geometry,material);
 part.position.set(x,y,z);
 part.scale.set(sx,sy,sz);
 parent.add(part);
 return part;
}
const box=(group,material,x,y,z,w,h,d)=>mesh(group,boxGeometry,material,x,y,z,w,h,d);
const craft=new THREE.Group();
scene.add(craft);
// A small nose opens into a center fold and two raised, faceted wings.
function hullFromSurfaces(surfaces){
 const positions=[];
 for(const {top,faces,thickness} of surfaces){
  const base=top.map(([x,y,z],i)=>[x,y-(i===0?.075:thickness),z]);
  for(const [a,b,c] of faces)positions.push(...top[a],...top[b],...top[c],...base[a],...base[c],...base[b]);
  for(let i=0;i<top.length;i++){
   const next=(i+1)%top.length;
   positions.push(...top[i],...base[i],...base[next],...top[i],...base[next],...top[next]);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.computeVertexNormals();
 return geometry;
}
const foldedFaces=[[0,1,2],[0,2,3],[0,3,4]];
const foldedHull=(top,thickness)=>hullFromSurfaces([{top,faces:foldedFaces,thickness}]);
const hullGeometry=foldedHull([
 [0,.02,-2.55],[-2.02,.63,1.76],[-.56,.18,1.48],[.56,.18,1.48],[2.02,.63,1.76]
],.24);
const mantisHull=foldedHull([
 [0,.07,-2.23],[-1.92,.30,1.81],[-.74,.28,.41],[.74,.28,.41],[1.92,.30,1.81]
],.20);
const wraithHull=foldedHull([
 [0,.04,-2.74],[-1.96,.85,1.62],[-.38,.23,1.04],[.38,.23,1.04],[1.96,.85,1.62]
],.26);
const splitHull=hullFromSurfaces([
 {top:[[-.08,.11,-2.42],[-1.93,.44,1.76],[-.86,.40,1.76]],faces:[[0,1,2]],thickness:.41},
 {top:[[.08,.11,-2.42],[.86,.40,1.76],[1.93,.44,1.76]],faces:[[0,1,2]],thickness:.41}
]);
const hull=mesh(craft,hullGeometry,shell,0,0,0);
const burners=[];
for(const side of [-1,1]){
 const podX=side*1.51;
 box(craft,black,podX,.17,1.47,.51,.36,.72);
 box(craft,cyan,podX,.17,1.84,.36,.27,.055);
 const flame=mesh(craft,flameGeometry,cyan,podX,.17,2.19);
 flame.rotation.x=Math.PI/2;
 burners.push(flame);
}
const shield=mesh(craft,shieldGeometry,new THREE.MeshBasicMaterial({
 color:0x73eeff,wireframe:true,transparent:true,opacity:.48
}),0,0,.2,2.1,.9,2.1);
shield.visible=false;
const profiles={
 arrow:{hull:hullGeometry,color:0xe1e9f4,exhaust:0x16faff,width:1,length:1,sticker:[0,.113,-.35,.04]},
 mantis:{hull:mantisHull,color:0x91ddaa,exhaust:0x54ff22,width:1.14,length:.86,sticker:[0,.223,-.35,.08]},
 wraith:{hull:wraithHull,color:0xb9a9eb,exhaust:0x508cff,width:.84,length:1.18,sticker:[0,.174,-.35,.05]},
 split:{hull:splitHull,color:0xe1e6ef,exhaust:0xffa12d,width:1,length:1,sticker:[-1.06,.347,.56,.0624,.66,-.0374]}
};
const flagMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,transparent:true,alphaTest:.25,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const flag=mesh(craft,new THREE.PlaneGeometry(.78,.52),flagMaterial,0,.113,-.35);
flag.rotation.x=-Math.PI/2-Math.atan2(.16,4.03);
const tailMaterial=new THREE.MeshBasicMaterial({vertexColors:true,blending:THREE.AdditiveBlending,transparent:true,opacity:.85,depthWrite:false});
const trailLength=18;
const trailLife=.36;
const trailPoints=[[],[]];
const tailGeometry=new THREE.BufferGeometry();
const tailVertices=new Float32Array(trailLength*2*18);
const tailColors=new Float32Array(tailVertices.length);
tailGeometry.setAttribute('position',new THREE.BufferAttribute(tailVertices,3).setUsage(THREE.DynamicDrawUsage));
tailGeometry.setAttribute('color',new THREE.BufferAttribute(tailColors,3).setUsage(THREE.DynamicDrawUsage));
tailGeometry.setDrawRange(0,0);
const exhaustTrail=new THREE.Mesh(tailGeometry,tailMaterial);
exhaustTrail.frustumCulled=false;
scene.add(exhaustTrail);
const burnerPosition=new THREE.Vector3();
const trailColor=new THREE.Color();
let lastTrail=-Infinity;
function clearTrails(){
 for(const points of trailPoints)points.length=0;
 lastTrail=-Infinity;
 tailGeometry.setDrawRange(0,0);
}
function drawTrails(){
 if(mode==='flying'&&distance-lastTrail>=.44){
  lastTrail=distance;
  for(const [i,burner] of burners.entries()){
   burner.getWorldPosition(burnerPosition);
   trailPoints[i].unshift({x:burnerPosition.x,y:burnerPosition.y,z:burnerPosition.z-distance,time:visualTime});
   if(trailPoints[i].length>trailLength)trailPoints[i].pop();
  }
 }
 let count=0;
 for(const points of trailPoints){
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   const age=visualTime-b.time;
   if(age>trailLife)break;
   const fade=1-age/trailLife,width=.055;
   const base=count*3,az=a.z+distance,bz=b.z+distance;
   tailVertices.set([
    a.x-width,a.y,az,b.x-width,b.y,bz,a.x+width,a.y,az,
    a.x+width,a.y,az,b.x-width,b.y,bz,b.x+width,b.y,bz
   ],base);
   for(let j=0;j<6;j++)tailColors.set([trailColor.r*fade,trailColor.g*fade,trailColor.b*fade],base+j*3);
   count+=6;
  }
 }
 tailGeometry.setDrawRange(0,count);
 tailGeometry.attributes.position.needsUpdate=true;
 tailGeometry.attributes.color.needsUpdate=true;
}
tailMaterial.side=THREE.DoubleSide;
const craftPicker=el('craft'),countryPicker=el('country'),paintPicker=el('paint');
countryPicker.add(new Option('No flag',''));
for(const [code,label] of Object.entries(countries))countryPicker.add(new Option(label,code));
try{
 const saved=localStorage.getItem('glider-craft');
 if(Object.hasOwn(profiles,saved))craftPicker.value=saved;
 countryPicker.value=normalizeCountry(localStorage.getItem('glider-country')??localStorage.getItem('rapier-country'))??'IN';
 if(localStorage.getItem('glider-country')==='')countryPicker.value='';
}catch{countryPicker.value='IN';}
const flameMaterial=cyan.clone();
for(const burner of burners)burner.material=flameMaterial;
function paintKey(){return 'glider-paint-'+craftPicker.value;}
function loadPaint(){
 const defaultColor='#'+(profiles[craftPicker.value]??profiles.arrow).color.toString(16).padStart(6,'0');
 let stored;
 try{stored=localStorage.getItem(paintKey());}catch{}
 paintPicker.value=/^#[0-9a-f]{6}$/i.test(stored??'')?stored:defaultColor;
}
function customize(){
 const profile=profiles[craftPicker.value]??profiles.arrow;
 craft.scale.set(profile.width,1,profile.length);
 hull.geometry=profile.hull;
 shell.color.set(paintPicker.value);
 const [flagX,flagY,flagZ,slope,scale=1,crossSlope=0]=profile.sticker;
 flag.position.set(flagX,flagY,flagZ);
 const right=new THREE.Vector3(1,crossSlope,0).normalize();
 const normal=new THREE.Vector3(-crossSlope,1,-slope).normalize();
 const forward=new THREE.Vector3().crossVectors(normal,right);
 flag.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,forward,normal));
 flag.scale.setScalar(scale);
 trailColor.setHex(profile.exhaust);
 flameMaterial.color.copy(trailColor);
 flagMaterial.map?.dispose();
 flagMaterial.map=null;
 const country=normalizeCountry(countryPicker.value);
 if(country){
  flagMaterial.map=new THREE.CanvasTexture(drawFlag(country));
  flagMaterial.map.colorSpace=THREE.SRGBColorSpace;
 }
 flagMaterial.needsUpdate=true;
 flag.visible=Boolean(country);
 try{
  localStorage.setItem('glider-craft',craftPicker.value);
  localStorage.setItem('glider-country',countryPicker.value);
 }catch{}
}
craftPicker.onchange=()=>{loadPaint();customize();};
countryPicker.onchange=customize;
paintPicker.oninput=()=>{
 shell.color.set(paintPicker.value);
 try{localStorage.setItem(paintKey(),paintPicker.value);}catch{}
};
loadPaint();
customize();

const blast=new THREE.Group();
blast.visible=false;
scene.add(blast);
const sparkColors=[glow(0xffe6a1),glow(0xffab42),glow(0xff577d),shell];
const sparks=Array.from({length:36},(_,i)=>({
 object:mesh(blast,sphereGeometry,sparkColors[i%sparkColors.length],0,0,0),
 velocity:new THREE.Vector3(),size:0
}));
const wave=mesh(blast,new THREE.RingGeometry(.84,1,24),new THREE.MeshBasicMaterial({
 color:0xffb565,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false
}),0,0,0);
let blastAge=0,blastDuration=0;
function burstAt(px,py,strength){
 blast.position.set(px,py,0);
 blast.visible=true;
 blastAge=0;
 blastDuration=strength>.8?1.12:.70;
 wave.material.color.setHex(strength>.8?0xffb565:0x79edff);
 wave.material.opacity=.90;
 wave.scale.setScalar(.45);
 wave.quaternion.copy(camera.quaternion);
 for(const [i,spark] of sparks.entries()){
  const angle=i*2.39996,speed=(4+Math.random()*9)*strength;
  spark.object.position.set(0,0,0);
  spark.object.rotation.set(0,0,0);
  spark.size=(.11+Math.random()*.22)*strength;
  spark.object.scale.setScalar(spark.size);
  spark.velocity.set(Math.cos(angle)*speed,2+Math.random()*6,Math.sin(angle)*speed);
 }
}
function updateBlast(dt){
 if(!blast.visible)return;
 blastAge+=dt;
 const decay=Math.max(0,1-blastAge/blastDuration);
 wave.scale.setScalar(.45+blastAge*8);
 wave.material.opacity=decay*.85;
 for(const {object,velocity,size} of sparks){
  object.position.addScaledVector(velocity,dt);
  velocity.y-=10*dt;
  object.rotation.x+=dt*7;
  object.rotation.z+=dt*9;
  object.scale.setScalar(size*decay);
 }
 if(!decay)blast.visible=false;
}

const blockWidth=BLOCK_WIDTH,blockDepth=BLOCK_DEPTH;
const neighborhoods=new Map();
let daily={day:flightDay(),seed:flightSeed(flightDay()),scores:[],ghost:null};
let citySeed=daily.seed,run=createFlight(citySeed),opponents=[],inputLog=[],accumulator=0;
const flightMode=el('flightMode');
let liveCache=null;
let lastDirection=0,rollDirection=0,rollAge=1,bank=0;
function makeOpponent(record,ghost,index){
 const model=new THREE.Group();
 const material=new THREE.MeshBasicMaterial({
  color:ghost?0xa7fff5:[0xffa74b,0x42e8f5,0xf17dff,0xa6f771,0xb3a7ff,0xff738b][index],
  transparent:ghost,opacity:ghost?.42:1,depthWrite:!ghost
 });
 mesh(model,hullGeometry,material,0,0,0);
 for(const side of [-1,1])box(model,material,side*1.51,.17,1.47,.51,.36,.72);
 model.visible=false;
 scene.add(model);
 const state=createFlight(citySeed);
 const delay=ghost?0:index*30+Math.floor(Math.random()*30);
 return {model,material,state,inputs:record.inputs,delay};
}
const world=new THREE.Group();
scene.add(world);
const pointerDirections=new Map();
const held=new Set();
const left=el('left'),right=el('right');
let x=0,velocity=0,distance=0,speed=0;
let lives=0,slow=0,mode='ready',previous=0,visualTime=0,best=0;
try{best=Math.max(0,Number(localStorage.getItem('space-glider-best'))||0);}catch{}
el('best').textContent=best?'Best '+best+' m':'';
function generateBlock(column,row){
 const center=column*blockWidth,ahead=row*blockDepth;
 const data=gliderBlock(citySeed,column,row);
 const model=new THREE.Group();
 model.position.set(center,0,-ahead);
 box(model,ground,0,-.52,0,blockWidth,1,blockDepth);
 box(model,black,0,.002,0,blockWidth-.12,.022,blockDepth-.12);
 for(const item of data.obstacles){
  const {x,forward,halfWidth,halfDepth,height,kind,material,edge}=item;
  const object=mesh(model,obstacleGeometries[kind],gray[material],x-center,height*.5,ahead-forward,halfWidth*2,height,halfDepth*2);
  object.add(new THREE.LineSegments(obstacleEdges[kind],item.fragile?fragileEdge:edgeMaterials[edge]));
 }
 const pickups=data.pickups.map(item=>{
  const object=new THREE.Group(),material=item.kind==='shield'?cyan:violet;
  mesh(object,sphereGeometry,material,0,0,0,.4,.57,.4);
  mesh(object,ringGeometry,material,0,0,0);
  object.position.set(item.x-center,1.95,ahead-item.forward);
  model.add(object);
  return {...item,model:object};
 });
 world.add(model);
 return {column,row,model,pickups};
}
function updateCity(){
 const column=Math.round(x/blockWidth),row=Math.round(distance/blockDepth);
 for(let c=column-3;c<=column+3;c++){
  for(let r=row-1;r<=row+6;r++){
   const key=c+':'+r;
   if(!neighborhoods.has(key))neighborhoods.set(key,generateBlock(c,r));
  }
 }
 for(const [key,block] of neighborhoods){
  if(Math.abs(block.column-column)>3||block.row<row-1||block.row>row+6){
   block.model.removeFromParent();
   neighborhoods.delete(key);
  }
 }
 world.position.z=distance;
}
function updateHud(){
 el('distance').textContent=Math.floor(distance)+' m';
 el('speed').textContent=Math.round(speed*3.6)+' km/h';
 el('power').textContent=lives?'Shield':slow>0?'Slow time '+Math.ceil(slow)+' s':'—';
}
function reset(){
 world.clear();
 neighborhoods.clear();
 blast.visible=false;
 clearTrails();
 craft.visible=true;
 citySeed=daily.seed;
 run=createFlight(citySeed);
 for(const opponent of opponents){
  opponent.model.removeFromParent();
  opponent.material.dispose();
 }
 opponents=[];
 inputLog=[];accumulator=0;lastDirection=rollDirection=bank=0;rollAge=1;
 x=velocity=distance=slow=lives=0;
 speed=15;
 craft.position.set(0,1.95,0);
 craft.rotation.set(0,0,0);
 updateCity();
 updateHud();
}
const validReplay=record=>typeof record?.inputs==='string'&&/^[012]+$/.test(record.inputs);
async function launch(){
 if(play.disabled)return;
 startAudio();
 const selected=flightMode.value;
 let rivals=[],notice='';
 if(selected==='live'){
  play.disabled=true;
  status.textContent='Loading saved flights…';
  try{
   if(!liveCache||liveCache.day!==daily.day||Date.now()>=liveCache.expires){
    const query=new URLSearchParams({mode:'live',driver:driverId??''});
    const response=await fetch('/api/glider?'+query,{signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Saved flights unavailable.');
    const result=await response.json();
    if(result.day!==daily.day)throw Error('Reload for the next daily flight.');
    liveCache={day:result.day,rivals:result.rivals.filter(validReplay),expires:Date.now()+45000};
   }
   rivals=liveCache.rivals;
   if(!rivals.length)notice='No other saved flights yet. Flying solo.';
  }catch(error){notice=error.message+' Flying solo.';}
  finally{play.disabled=false;}
 }else if(selected==='ghost'){
  if(validReplay(daily.ghost))rivals=[daily.ghost];
  else notice='No ghost available yet. Flying solo.';
 }
 release();
 reset();
 opponents=rivals.map((record,index)=>makeOpponent(record,selected==='ghost',index));
 el('modeStatus').textContent=notice;
 mode='flying';
 hideScores();
 el('scoreStatus').textContent='';
 panel.hidden=true;
 el('controls').hidden=false;
 play.blur();
}
function crash(){
 mode='over';
 release();
 burstAt(x,craft.position.y,1);
 soundEffect('crash');
 craft.visible=false;
 const result=Math.floor(distance);
 if(result>best){
  best=result;
  try{localStorage.setItem('space-glider-best',String(best));}catch{}
 }
 el('heading').textContent='Flight over';
 el('message').textContent='You flew '+result+' m through the city.';
 el('best').textContent='Best '+best+' m';
 play.textContent='Fly again';
 void submitFlight();
 el('controls').hidden=true;
 updateHud();
}
function release(){
 held.clear();
 pointerDirections.clear();
 left.classList.remove('active');
 right.classList.remove('active');
}
for(const [button,dir] of [[left,-1],[right,1]]){
 button.addEventListener('pointerdown',event=>{
  if(mode!=='flying')return;
  event.preventDefault();
  pointerDirections.set(event.pointerId,dir);
  button.setPointerCapture(event.pointerId);
  button.classList.add('active');
 });
 for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{
  pointerDirections.delete(event.pointerId);
  button.classList.toggle('active',[...pointerDirections.values()].includes(dir));
 });
}
const keyDir={ArrowLeft:-1,ArrowRight:1,a:-1,d:1};
addEventListener('keydown',event=>{
 if(mode!=='flying'||!Object.hasOwn(keyDir,event.key))return;
 event.preventDefault();
 held.add(event.key);
});
addEventListener('keyup',event=>held.delete(event.key));
addEventListener('blur',release);
play.onclick=launch;
function advance(){
 let direction=0;
 for(const key of held)direction+=keyDir[key];
 for(const pressed of pointerDirections.values())direction+=pressed;
 direction=Math.sign(direction);
 if(direction&&direction!==lastDirection&&rollAge>=.76){
  rollDirection=-direction;
  rollAge=0;
 }
 lastDirection=direction;
 inputLog.push(String(direction+1));
 stepFlight(run,direction);
 ({x,velocity,distance,speed,lives,slow}=run);
 for(const opponent of opponents){
  const code=opponent.inputs[run.ticks-1-opponent.delay];
  if(code!==undefined&&!opponent.state.done)stepFlight(opponent.state,Number(code)-1);
 }
 updateCity();
 if(run.picked)soundEffect('pickup');
 if(run.hit){
  burstAt(x,craft.position.y,.55);
  soundEffect('crash');
 }
 if(run.done)crash();
}
function frame(now){
 const dt=Math.min(.040,(now-(previous||now))/1000);
 previous=now;
 visualTime+=dt;
 if(mode==='flying'){
  accumulator+=dt;
  while(accumulator>=STEP&&mode==='flying'){
   accumulator-=STEP;
   advance();
  }
  updateHud();
 }
 updateBlast(dt);
 if(mode==='over'&&panel.hidden&&blastAge>=.74){panel.hidden=false;play.focus();}
 const bob=Math.sin(visualTime*4)*.085;
 craft.position.set(x,1.95+bob,0);
 rollAge=Math.min(.76,rollAge+dt);
 const roll=THREE.MathUtils.smoothstep(rollAge,0,.76);
 bank=THREE.MathUtils.lerp(bank,-velocity*.035,1-Math.exp(-dt*9));
 craft.rotation.z=bank+rollDirection*Math.PI*2*roll;
 craft.rotation.x=Math.sin(roll*Math.PI)*-.17+Math.sin(visualTime*4)*.022;
 for(const {model,state,delay,inputs} of opponents){
  const tick=run.ticks-delay;
  model.visible=mode==='flying'&&tick>0&&tick<=inputs.length&&!state.done;
  if(model.visible){
   model.position.set(state.x,2.22,run.distance-state.distance);
   model.rotation.z=-state.velocity*.035;
  }
 }
 craft.rotation.y=THREE.MathUtils.lerp(craft.rotation.y,-velocity*.018,1-Math.exp(-dt*9));
 for(const [i,burner] of burners.entries())burner.scale.y=1.35+Math.sin(visualTime*34+i)*.29+(mode==='flying'?speed*.014:0);
 shield.visible=Boolean(lives);
 drawTrails();
 if(audio){
  const now=audio.context.currentTime;
  audio.engine.frequency.setTargetAtTime(36+speed*.85,now,.13);
  audio.filter.frequency.setTargetAtTime(130+speed*3,now,.15);
  audio.thrust.gain.setTargetAtTime(mode==='flying'?.25:0,now,.14);
 }
 const pull=camera.aspect<.85?19:14;
 camera.position.set(x,9.2,pull);
 camera.lookAt(x,1.7,-15);
 for(const [key,block] of neighborhoods){
  const flightBlock=run.blocks.get(key);
  for(const [i,item] of block.pickups.entries()){
   item.model.visible=!flightBlock?.pickups[i]?.used;
   item.model.rotation.y+=dt*2.4;
   item.model.position.y=1.95+Math.sin(visualTime*4)*.16;
  }
 }
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}
const pilot=el('pilot'),scoresPanel=el('scoresPanel'),showScores=el('showScores'),status=el('scoreStatus');
let driverId;
try{
 driverId=localStorage.getItem('rapier-driver')??crypto.randomUUID();
 localStorage.setItem('rapier-driver',driverId);
 pilot.value=localStorage.getItem('glider-pilot')??localStorage.getItem('rapier-name')??'Pilot';
}catch{}
function hideScores(){
 scoresPanel.hidden=true;
 showScores.setAttribute('aria-expanded','false');
}
function renderScores(){
 const entries=daily.scores.map(({name,distance,country},i)=>{
  const row=document.createElement('li');
  if(i+1===daily.rank){row.className='yourScore';row.setAttribute('aria-current','true');}
  const pilot=document.createElement('span'),score=document.createElement('strong');
  const code=normalizeCountry(country);
  if(code){
   const flag=drawFlag(code);
   flag.setAttribute('role','img');flag.setAttribute('aria-label',countries[code]);
   pilot.append(flag);
  }
  pilot.append(name);
  score.textContent=distance+' m';
  row.append(pilot,score);
  return row;
 });
 if(!entries.length){const empty=document.createElement('li');empty.textContent='No flights yet today.';entries.push(empty);}
 el('scores').replaceChildren(...entries);
}
showScores.onclick=()=>{
 if(!scoresPanel.hidden){hideScores();return;}
 renderScores();
 scoresPanel.hidden=false;
 showScores.setAttribute('aria-expanded','true');
};
el('closeScores').onclick=hideScores;
let submitted=0;
async function submitFlight(){
 if(!driverId||!inputLog.length||inputLog.length>MAX_TICKS)return;
 const sequence=++submitted;
 const name=pilot.value.trim()||'Pilot';
 try{localStorage.setItem('glider-pilot',name);}catch{}
 status.textContent='Verifying flight…';
 try{
  const response=await fetch('/api/glider',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({day:daily.day,id:driverId,name,country:countryPicker.value,inputs:inputLog.join('')})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error);
  if(sequence!==submitted)return;
  daily=result;
   status.textContent=result.rank?'Daily rank #'+result.rank:'Verified · outside today’s top 20';
  renderScores();
 }catch(error){if(sequence===submitted)status.textContent=error.message||'Leaderboard unavailable.';}
}
async function bootFlight(){
 try{
  const query=new URLSearchParams(driverId?{driver:driverId}:{});
  const response=await fetch('/api/glider?'+query,{signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Leaderboard unavailable.');
  daily=await response.json();
 }catch{status.textContent='Leaderboard unavailable. You can still fly.';}
 reset();
 play.disabled=false;
}
void bootFlight();
requestAnimationFrame(frame);

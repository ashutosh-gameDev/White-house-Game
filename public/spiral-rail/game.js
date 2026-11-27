import * as THREE from 'three';

const el=id=>document.getElementById(id);
const canvas=el('city'),panel=el('panel'),play=el('play');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}
catch{
 el('message').textContent='Spiral Rail needs a browser with WebGL 2.';
 throw Error('WebGL 2 unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
renderer.setClearColor(0x000000);
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x000000,.019);
scene.add(new THREE.HemisphereLight(0xfff1ee,0x524376,2.6));
const keyLight=new THREE.DirectionalLight(0xffdbb4,2.2);
keyLight.position.set(-4,12,4);
scene.add(keyLight);
const camera=new THREE.PerspectiveCamera(56,1,.1,175);
function resize(){
 renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
 camera.aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
 camera.fov=camera.aspect<.8?74:59;
 camera.updateProjectionMatrix();
}
addEventListener('resize',resize);
resize();

const roadMaterials=[
 new THREE.MeshBasicMaterial({color:0x0d0805,side:THREE.DoubleSide}),
 new THREE.MeshBasicMaterial({color:0x110904,side:THREE.DoubleSide})
];
const edgeMaterial=new THREE.MeshBasicMaterial({color:0xffaf64,side:THREE.DoubleSide});
const centerMaterial=new THREE.MeshBasicMaterial({color:0xe8902e,side:THREE.DoubleSide});
const edgeGlow=new THREE.MeshBasicMaterial({color:0xff650d,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const gemMaterial=new THREE.MeshBasicMaterial({color:0x89faff});
const gemShape=new THREE.OctahedronGeometry(.28);
const obstacleMaterial=new THREE.MeshBasicMaterial({color:0xffaf64,side:THREE.DoubleSide});
const warningMaterial=new THREE.LineBasicMaterial({color:0xffd19e});
const neonColors=[0xffaf64,0x57f2ff,0xff71ce,0xa0ff72].map(hex=>new THREE.Color(hex));
const neonColor=new THREE.Color();
const edgeHighlight=new THREE.Color(0xffffff);
let neonTime=0;
function updateNeon(dt){
 neonTime=(neonTime+dt)%(neonColors.length*7);
 const phase=neonTime/7;
 const index=Math.floor(phase);
 const blend=THREE.MathUtils.smoothstep(phase-index,0,1);
 neonColor.copy(neonColors[index]).lerp(neonColors[(index+1)%neonColors.length],blend);
 edgeMaterial.color.copy(neonColor);
 centerMaterial.color.copy(neonColor);
 edgeGlow.color.copy(neonColor);
 obstacleMaterial.color.copy(neonColor);
 warningMaterial.color.copy(neonColor).lerp(edgeHighlight,.35);
}
const ballMaterial=new THREE.MeshBasicMaterial({color:0xd74308});
const ball=new THREE.Group();
const ballShape=new THREE.IcosahedronGeometry(.46,1);
const globe=new THREE.Mesh(ballShape,ballMaterial);
const ballEdges=new THREE.LineSegments(new THREE.WireframeGeometry(ballShape),new THREE.LineBasicMaterial({
 color:0xffce55
}));
ballEdges.scale.setScalar(1.012);
ball.add(globe,ballEdges);
scene.add(ball);

const point=new THREE.Vector3(),look=new THREE.Vector3(),desired=new THREE.Vector3();
const chunkLength=24,laneWidth=.95;
const chunks=new Map(),obstacles=[],gems=[];
const triangle=new THREE.Shape();
triangle.moveTo(-.60,0);triangle.lineTo(.60,0);triangle.lineTo(0,1.3);triangle.closePath();
const wedgeShape=new THREE.ShapeGeometry(triangle);
const hazardEdges=new THREE.EdgesGeometry(wedgeShape);
let distance=0,speed=0,lane=-1,target=-1,nextHazard=23,lastHazard=1;
let mode='ready',last=0,best=0,collected=0,passed=0,elapsed=0;
function twist(z){return .035*Math.sin(z*.042);}
function route(z,side=0,lift=0,out=new THREE.Vector3()){
 const angle=twist(z),c=Math.cos(angle),s=Math.sin(angle);
 return out.set(1.2*Math.sin(z*.045)+.9*Math.sin(z*.021)+side*c-lift*s,
  3.4+.24*Math.sin(z*.058)+side*s+lift*c,-z);
}
function roadStrip(group,start,left,right,material,lift=0,dashed=false){
 const positions=[];
 for(let i=0;i<chunkLength;i++){
  const z=start+i;
  if(dashed&&((z%4)+4)%4>=2)continue;
  const a=route(z,left,lift),b=route(z,right,lift);
  const c=route(z+1,left,lift),d=route(z+1,right,lift);
  positions.push(...a,...b,...c,...b,...d,...c);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.computeVertexNormals();
 group.add(new THREE.Mesh(geometry,material));
}
function buildRail(index){
 const segment=new THREE.Group(),start=index*chunkLength;
 roadStrip(segment,start,-1.96,0,roadMaterials[0]);
 roadStrip(segment,start,0,1.96,roadMaterials[1]);
 for(const edge of [-1.94,1.94]){
  roadStrip(segment,start,edge-.11,edge+.11,edgeGlow,.017);
  roadStrip(segment,start,edge-.027,edge+.027,edgeMaterial,.022);
 }
 roadStrip(segment,start,-.016,.016,centerMaterial,.014,true);
 scene.add(segment);
 return segment;
}
function keepRail(){
 const index=Math.floor(distance/chunkLength);
 for(let i=index-1;i<=index+5;i++)if(!chunks.has(i))chunks.set(i,buildRail(i));
 for(const [i,segment] of chunks){
  if(i>=index-1)continue;
  segment.removeFromParent();
  for(const mesh of segment.children)mesh.geometry.dispose();
  chunks.delete(i);
 }
}
function queueHazards(){
 while(nextHazard<distance+110){
  const side=Math.random()<.72?-lastHazard:lastHazard;
  const model=new THREE.Mesh(wedgeShape,obstacleMaterial);
  model.add(new THREE.LineSegments(hazardEdges,warningMaterial));
  model.position.copy(route(nextHazard,side*laneWidth,.04));
  model.rotation.z=twist(nextHazard);
  scene.add(model);
  obstacles.push({at:nextHazard,side,model});
  if(obstacles.length%3===1||Math.random()<.36){
   const gem=new THREE.Mesh(gemShape,gemMaterial);
   gem.position.copy(route(nextHazard,-side*laneWidth,.52));
   scene.add(gem);
   gems.push({at:nextHazard,side:-side,model:gem});
  }
  lastHazard=side;
  nextHazard+=9.5+Math.random()*7;
 }
}
const switchButton=el('switchSide');
function switchLane(){
 if(mode==='rolling')target=-target;
}
switchButton.onclick=switchLane;
canvas.addEventListener('pointerdown',event=>{
 if(mode!=='rolling'||event.button!==0)return;
 event.preventDefault();
 switchLane();
});
addEventListener('keydown',event=>{
 if(mode!=='rolling'||event.code!=='Space'||event.repeat)return;
 event.preventDefault();
 switchLane();
});
try{best=Math.max(0,Number(localStorage.getItem('spiral-rail-best'))||0);}catch{}
function showBest(){el('best').textContent='High score: '+best+' m';}
function hud(){
 el('distance').textContent=Math.floor(distance)+' m';
 el('speed').textContent=String(passed);
 el('gems').textContent=String(collected);
}
function reset(){
 for(const {model} of [...obstacles,...gems])model.removeFromParent();
 obstacles.length=0;gems.length=0;
 for(const [i,segment] of chunks){
  if(i<=5)continue;
  segment.removeFromParent();
  for(const mesh of segment.children)mesh.geometry.dispose();
  chunks.delete(i);
 }
 distance=collected=passed=elapsed=0;speed=12;lane=target=-1;nextHazard=18;lastHazard=1;
 keepRail();queueHazards();hud();
}
function end(){
 mode='over';
 const score=Math.floor(distance);
 if(score>best){
  best=score;
  try{localStorage.setItem('spiral-rail-best',String(best));}catch{}
 }
 el('heading').textContent='Run over';
 el('message').textContent='You dodged '+passed+' obstacles and collected '+collected+' gems.';
 showBest();
 play.textContent='Roll again';
 panel.hidden=false;
 switchButton.hidden=true;
 play.focus();
}
play.onclick=()=>{
 reset();
 mode='rolling';
 panel.hidden=true;
 switchButton.hidden=false;
 play.blur();
};
function advance(dt){
 const before=distance;
 elapsed+=dt;
 updateNeon(dt);
 speed=12+15*THREE.MathUtils.smoothstep(elapsed,4,70);
 distance+=speed*dt;
 lane+=(target-lane)*(1-Math.exp(-dt*27));
 keepRail();
 queueHazards();
 for(const obstacle of obstacles){
  if(before>obstacle.at+.44||distance<obstacle.at-.44)continue;
  if(Math.abs(lane-obstacle.side)<.74){end();break;}
 }
 for(const obstacle of obstacles){
  if(!obstacle.counted&&distance>obstacle.at+.65){obstacle.counted=true;passed++;}
 }
 for(let i=gems.length-1;i>=0;i--){
  const gem=gems[i];
  gem.model.rotation.y+=dt*2.8;
  const hit=before<=gem.at+.8&&distance>=gem.at-.8&&Math.abs(lane-gem.side)<.70;
  if(hit)collected++;
  if(hit||distance>gem.at+9){gem.model.removeFromParent();gems.splice(i,1);}
 }
 while(obstacles.length&&obstacles[0].at<distance-13)obstacles.shift().model.removeFromParent();
 hud();
}
function frame(now){
 const dt=Math.min(.04,(now-(last||now))/1000);last=now;
 if(mode==='rolling')advance(dt);
 ball.position.copy(route(distance,lane*laneWidth,.48,point));
 ball.rotation.set(distance/.46,0,twist(distance));
 const pull=camera.aspect<.55?10:7.2;
 route(distance,0,0,desired);
 camera.position.set(desired.x,desired.y+4.1,desired.z+pull);
 look.set(desired.x,desired.y-.35,desired.z-11);
 camera.lookAt(look);
 renderer.render(scene,camera);
 requestAnimationFrame(frame);
}
showBest();
reset();
play.disabled=false;
requestAnimationFrame(frame);

import * as THREE from 'three';
import {DAY,DT,inputCodes,FINISH_GATE,makeCourse,mulberry32,palettes,regions} from './course.js';
import {ready,clock,makeCar,step} from './race.js';
import {wheels} from './vehicle.js';
import {makeAudio} from './audio.js';
import {countries,normalizeCountry,drawFlag} from './countries.js';

const el=id=>document.getElementById(id);
if(matchMedia('(max-height:560px), (max-width:480px)').matches)el('raceSetup').open=false;
const pretty=ms=>Math.floor(ms/60000)+':'+(ms%60000/1000).toFixed(3).padStart(6,'0');
const carStyles={
 expedition:{name:'Expedition 4×4',paint:0x9e2824,shape:[1,1,1],accent:0xd8854b},
 hatch:{name:'Rally Hatch',paint:0xe55935,shape:[.96,.91,.94],accent:0xffe3b2},
 coupe:{name:'Sport Coupe',paint:0xe5aa34,shape:[1.02,.76,1.04],accent:0x273844},
 buggy:{name:'Desert Buggy',paint:0x267d75,shape:[.93,.82,.93],accent:0xf2bd68},
 truck:{name:'Baja Truck',paint:0x4d5895,shape:[1.04,.94,1.1],accent:0xbcdbeb}
};
const board=el('board'), boardToggle=el('boardToggle');
function toggleBoard(open){board.hidden=!open;boardToggle.setAttribute('aria-expanded',String(open));}
boardToggle.onclick=()=>toggleBoard(board.hidden);
el('closeBoard').onclick=()=>toggleBoard(false);
el('resultBoard').onclick=()=>toggleBoard(true);
function countryBadge(country){
 const badge=document.createElement('span');
 badge.className='scoreBadge';
 const label=country?countries[country]:'Country not set';
 badge.title=label;badge.setAttribute('role','img');badge.setAttribute('aria-label',label);
 if(country){
  const flag=drawFlag(country);
  flag.className='scoreFlag';flag.setAttribute('aria-hidden','true');badge.append(flag);
 }else{
  badge.textContent='—';badge.classList.add('unset');
 }
 return badge;
}
let driverKey;
function displayScores(scores){
 el('scores').replaceChildren();
 for(const score of scores){
  const row=document.createElement('li'),entry=document.createElement('div');
  const driver=document.createElement('span'),value=document.createElement('span');
  if(driverKey&&score.driverKey===driverKey){row.classList.add('yourScore');row.setAttribute('aria-current','true');}
  entry.className='scoreEntry';driver.className='scoreDriver';value.className='scoreTime';
  const country=normalizeCountry(score.country);
  const badge=countryBadge(country);
  driver.textContent=score.name;value.textContent=pretty(score.ms);
  entry.append(badge,driver,value);row.append(entry);el('scores').append(row);
 }
 if(!scores.length){const row=document.createElement('li');row.textContent='No finished runs yet.';el('scores').append(row);}
}
const regionQuery=new URLSearchParams(location.search);
const eventSuffix=regionQuery.has('region')?'?'+new URLSearchParams({region:regionQuery.get('region')}):'';
const practiceDate=regionQuery.get('practice');
const eventQuery=new URLSearchParams(eventSuffix);
if(practiceDate!==null){
 for(const key of ['practice','terrain','curves','light','season','weather','obstacles','draft','rank']){
  if(regionQuery.has(key))eventQuery.set(key,regionQuery.get(key));
 }
}
const fetchEvent=async()=>{
 const response=await fetch('/api/event?'+eventQuery);
 if(!response.ok)throw Error('Could not load the daily event.');
 return response.json();
};
boot().catch(error=>{
 el('title').textContent='Stage unavailable';
 el('description').textContent=error.message;console.error(error);
});
async function boot(){
 const [data]=await Promise.all([fetchEvent(),ready]);
 const recording=data.practice?data.replay:null;
 const recordingField=recording?data.field??[]:[];
 const podium=recording?data.podium:null;
 const replayFrame=recording?new Event('rally:replay-frame'):null;
 const replayDrivers=recording?[recording,...recordingField].sort((a,b)=>a.ms-b.ms):[];
 let replayCamera=podium?'wide':'0',replayZoom=1,replaySpeed=1;
 let driverId=localStorage.getItem('rapier-driver');
 if(!driverId){driverId=crypto.randomUUID();localStorage.setItem('rapier-driver',driverId);}
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(driverId));
 driverKey=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
 displayScores(data.scores);
 if(data.practice){
  for(const id of ['boardToggle','resultBoard','pauseBoard','ghostSelect'])el(id).hidden=true;
  document.querySelector('label[for="ghostSelect"]').hidden=true;
 }
 const countryPicker=el('country');
 const selectedCountry=normalizeCountry(localStorage.getItem('rapier-country'))??'IN';
 countryPicker.replaceChildren(...Object.entries(countries).map(([code,name])=>new Option(name,code)));
 countryPicker.value=selectedCountry;
 const canvas=el('world'), gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
 if(!gl)throw Error('This rally requires a browser with WebGL 2.');
 const renderer=new THREE.WebGLRenderer({canvas,context:gl,antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 const course=makeCourse(data.event),region=course.region;
 const palette={...(region?{...region,trees:region.treesColor}:palettes[data.event.biome])};
 if(data.options?.season){
  const seasonColors={
   spring:{meadow:0x89a760,trees:[0x639443,0x85a758,0xccaa55]},
   summer:{meadow:0xa6a356,trees:[0x527441,0x759749,0xc39d48]},
   autumn:{meadow:0xb49760,trees:[0xbe6a38,0xd8a44c,0x98623c]},
   winter:{meadow:0xc8ced0,trees:[0x516b63,0x657b75,0x81938d]}
  };
  if(Object.hasOwn(seasonColors,data.options?.season))Object.assign(palette,seasonColors[data.options.season]);
 }
 if(data.preview){
  const picker=el('regionSelect');
  picker.replaceChildren(...Object.entries(regions).map(([id,entry])=>new Option(entry.label,id)));
  picker.value=data.event.region;
  picker.onchange=()=>{location.search=new URLSearchParams({region:picker.value});};
  el('regionControl').hidden=false;
 }
 const scene=new THREE.Scene();
 const weatherKinds={
  clear:{near:115,far:345,sun:3.35,sky:null},
  sunset:{near:83,far:260,sun:1.94,sky:0xc18176},
  night:{near:75,far:224,sun:.66,sky:0x15243e},
  rain:{near:58,far:193,sun:1.36,sky:0x728c96},
  mist:{near:25,far:116,sun:1.84,sky:0xc4d5d1},
  snow:{near:56,far:195,sun:2.08,sky:0xc8d9e6}
 };
 const mountainRegion=['himachal','ladakh'].includes(data.event.region);
 const weatherRoll=(data.event.seed>>>12)%12;
 const dailyWeather=mountainRegion&&weatherRoll<5?'snow':
  ['northeast','plains'].includes(data.event.region)&&weatherRoll<6?'rain':
  weatherRoll===8||weatherRoll===9?'mist':weatherRoll===10?'sunset':weatherRoll===11?'night':'clear';
 const weatherPicker=el('weatherSelect');
 const stageOptions=data.options??{};
 let activeWeather=stageOptions.weather??(region?dailyWeather:'clear');
 scene.background=new THREE.Color(palette.sky);
 scene.fog=new THREE.Fog(palette.sky,115,345);
 const camera=new THREE.PerspectiveCamera(55,1,.25,900);
 const resize=()=>{
  const width=canvas.clientWidth,height=canvas.clientHeight;
  renderer.setSize(width,height,false);camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();
 };
 resize();window.addEventListener('resize',resize);
 const skyLight=new THREE.HemisphereLight(0xd8edff,0x937345,1.88);
 scene.add(skyLight);
 const sun=new THREE.DirectionalLight(0xffd498,3.35);
 sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);
 Object.assign(sun.shadow.camera,{left:-51,right:51,top:51,bottom:-51,near:1,far:176});
 sun.shadow.normalBias=.075;
 sun.shadow.bias=-.00024;
 scene.add(sun,sun.target);
 const standard=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...options});
 const boxGeo=new THREE.BoxGeometry(1,1,1);
 const makeBox=(parent,mat,x,y,z,wx,hy,dz)=>{
  const mesh=new THREE.Mesh(boxGeo,mat);mesh.position.set(x,y,z);mesh.scale.set(wx,hy,dz);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 const landscape=mulberry32(data.event.seed^0x596fcad0);
 const cloudShape=new THREE.IcosahedronGeometry(1,1);
 const cloudTop=standard(0xfff0d5,{flatShading:true,roughness:1});
 const cloudBase=standard(0xd3dce0,{flatShading:true,roughness:1});
 const clouds=new THREE.Group();
 for(let i=0;i<12;i++){
  const z=15+i*52+landscape()*23, side=i%2?1:-1;
  const x=course.at(z).x+side*(56+landscape()*98),y=33+landscape()*22;
  for(let j=0;j<5;j++){
   const puff=new THREE.Mesh(cloudShape,j===0?cloudBase:cloudTop);
   puff.position.set(x+(j-2)*8,y+(j===2?4:0),z+landscape()*9);
   puff.scale.set(10+landscape()*7,3.8+landscape()*4,8+landscape()*5);
   clouds.add(puff);
  }
 }
 scene.add(clouds);
 const sunCard=document.createElement('canvas');sunCard.width=sunCard.height=128;
 const sunDraw=sunCard.getContext('2d');
 const glow=sunDraw.createRadialGradient(64,64,10,64,64,64);
 glow.addColorStop(0,'#fff9d1');glow.addColorStop(.23,'#ffe2a2dd');glow.addColorStop(1,'#ffd79a00');
 sunDraw.fillStyle=glow;sunDraw.fillRect(0,0,128,128);
 const sunTexture=new THREE.CanvasTexture(sunCard);sunTexture.colorSpace=THREE.SRGBColorSpace;
 const sunlight=new THREE.Sprite(new THREE.SpriteMaterial({map:sunTexture,transparent:true,depthWrite:false,fog:false}));
 sunlight.position.set(-165,105,265);sunlight.scale.set(68,68,1);scene.add(sunlight);
 const moon=new THREE.Mesh(new THREE.SphereGeometry(8,14,9),new THREE.MeshBasicMaterial({color:0xe5efff,fog:false,toneMapped:false}));
 moon.position.set(-96,66,320);moon.visible=false;scene.add(moon);
 const starsRandom=mulberry32(data.event.seed^0x9e2da27b),starPoints=[];
 for(let i=0;i<155;i++)starPoints.push((starsRandom()-.5)*800,88+starsRandom()*140,(starsRandom()-.25)*740);
 const starGeometry=new THREE.BufferGeometry();
 starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPoints,3));
 const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xd7e9ff,size:1.1,fog:false,toneMapped:false}));
 stars.visible=false;scene.add(stars);
 const leafGeometry=new THREE.BufferGeometry();
 leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,-.20,0,-.09,0,0,0,.22,0,0,-.20,0,0,.22,0,.10,.05,0],3));
 leafGeometry.computeVertexNormals();
 const leaves=new THREE.InstancedMesh(leafGeometry,standard(0xffffff,{side:THREE.DoubleSide}),84);
 leaves.frustumCulled=false;scene.add(leaves);
 const leafObject=new THREE.Object3D(),leafColors=[0xc58134,0xe2ae44,0x94732f,0xad502c];
 const leafData=Array.from({length:leaves.count},(_,i)=>{
  leaves.setColorAt(i,new THREE.Color(leafColors[i%leafColors.length]));
  return {x:(landscape()-.5)*52,z:(landscape()-.5)*66,phase:landscape()*11,factor:.7+landscape()*.9};
 });
 if(region&&['himachal','ladakh','northeast'].includes(data.event.region)){
  const mountainRock=standard(palette.rock,{flatShading:true});
  const mountainSnow=standard(0xe5ebea,{flatShading:true});
  for(let i=0;i<18;i++){
   const z=-54+i*44,side=i%2?1:-1,x=side*(119+landscape()*52);
   const height=(data.event.region==='northeast'?31:58)+landscape()*40;
   const sideCount=5+Math.floor(landscape()*3),radius=25+landscape()*24;
   const mountain=new THREE.Mesh(new THREE.ConeGeometry(radius,height,sideCount),mountainRock);
   mountain.position.set(x,height*.42,z);mountain.rotation.y=landscape()*6.28;scene.add(mountain);
   if(data.event.region==='himachal'||data.event.region==='ladakh'&&i%3===0){
    const cap=new THREE.Mesh(new THREE.ConeGeometry(radius*.33,height*.33,sideCount),mountainSnow);
    cap.rotation.y=mountain.rotation.y;cap.position.set(x,height*.755,z);scene.add(cap);
   }
  }
 }
  const precipitation=mulberry32(data.event.seed^0x1851bc73);
 const rainPositions=new Float32Array(230*6),rainGeo=new THREE.BufferGeometry();
 const rainAttr=new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage);
 rainGeo.setAttribute('position',rainAttr);
 const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xc2e5ff,transparent:true,opacity:.52,depthWrite:false}));
 rain.frustumCulled=false;rain.visible=false;scene.add(rain);
 const flakeGeo=new THREE.IcosahedronGeometry(1,0);
 const snow=new THREE.InstancedMesh(flakeGeo,new THREE.MeshBasicMaterial({color:0xf4faff,transparent:true,opacity:.84,depthWrite:false}),130);
 snow.frustumCulled=false;snow.visible=false;scene.add(snow);
 const precipitationAnchor=new THREE.Vector3(),weatherParticle=new THREE.Object3D();
 const weatherSeeds=Array.from({length:230},()=>({x:precipitation()*56-28,z:precipitation()*62-24,h:precipitation()*28,
  phase:precipitation()*8,speed:.60+precipitation()*.8}));
 const black=standard(0x263332),gold=standard(0xffce69),cream=standard(0xf8e8c6),timber=standard(0x68452e);
 const depths=new Uint8Array(course.grid.nx*course.grid.nz);
 for(let i=0;i<depths.length;i++)depths[i]=Math.round(255*THREE.MathUtils.clamp(-course.vertices[i*3+1]/4,0,1));
 const depthMap=new THREE.DataTexture(depths,course.grid.nx,course.grid.nz,THREE.RedFormat);
 depthMap.minFilter=depthMap.magFilter=THREE.LinearFilter;depthMap.needsUpdate=true;
 const waterMaterial=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},fogRange:{value:new THREE.Vector2(115,345)},depthMap:{value:depthMap},deep:{value:new THREE.Color(palette.water).multiplyScalar(.57)},
   shallow:{value:new THREE.Color(0x70ccb1)},sky:{value:scene.background},
   bounds:{value:new THREE.Vector4(course.grid.x,course.grid.z,(course.grid.nx-1)*2,(course.grid.nz-1)*2)}},
  vertexShader:`
   varying vec3 surfacePoint;
   void main(){
    surfacePoint=(modelMatrix*vec4(position,1.)).xyz;
    gl_Position=projectionMatrix*viewMatrix*vec4(surfacePoint,1.);
   }
  `,
  fragmentShader:`
   uniform float time;
   uniform sampler2D depthMap;
   uniform vec4 bounds;
   uniform vec2 fogRange;
   uniform vec3 deep,shallow,sky;
   varying vec3 surfacePoint;
   void main(){
    vec2 p=surfacePoint.xz;
    vec2 uv=(p-bounds.xy)/bounds.zw;
    float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);
    float depth=mix(1.,texture2D(depthMap,clamp(uv,0.,1.)).r,inside);
    vec2 a=vec2(.24,.41),b=vec2(-.37,.15),c=vec2(.62,.21);
    float t1=dot(p,a)+time*1.1,t2=dot(p,b)-time*.82,t3=dot(p,c)+time*1.78;
    vec2 slope=.30*a*cos(t1)+.18*b*cos(t2)+.09*c*cos(t3);
    vec3 normal=normalize(vec3(-slope.x,1.,-slope.y));
    vec3 view=normalize(cameraPosition-surfacePoint),sun=normalize(vec3(-.37,.76,-.48));
    float fresnel=pow(1.-max(0.,dot(view,normal)),3.1);
    float glint=pow(max(0.,dot(normal,normalize(sun+view))),33.);
    float foam=(1.-smoothstep(.015,.185,depth))*(.30+.39*smoothstep(.0,.7,sin(t1+t2)));
    vec3 water=mix(shallow,deep,smoothstep(.02,.77,depth));
    water=mix(water,sky,fresnel*.43)+glint*.46;
    water=mix(water,vec3(.76,.93,.86),foam);
    float fog=smoothstep(fogRange.x,fogRange.y,distance(cameraPosition,surfacePoint));
    gl_FragColor=vec4(mix(water,sky,fog),1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }
  `
 });
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1400,1600),waterMaterial);
 water.rotation.x=-Math.PI/2;water.position.set(0,0,course.event.length/2);scene.add(water);
 const tint={
  meadow:new THREE.Color(palette.meadow),rock:new THREE.Color(palette.rock),
  road:new THREE.Color(palette.road),shore:new THREE.Color(palette.shore)
 };
 const terrainP=[],terrainC=[],vertices=course.vertices,indices=course.indices;
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const y0=vertices[a+1],y1=vertices[b+1],y2=vertices[c+1];
  const high=Math.max(y0,y1,y2),low=Math.min(y0,y1,y2);
  if(high<-.12)continue;
  const x=(vertices[a]+vertices[b]+vertices[c])/3,z=(vertices[a+2]+vertices[b+2]+vertices[c+2])/3;
  const distance=Math.abs(x-course.at(z).x);
  const shortcut=course.shortcutAt(z);
  const sideRoad=shortcut&&shortcut.strength>.2&&Math.abs(x-shortcut.x)<3.15;
  const deck=course.bridge&&z>course.gap[0]&&z<course.gap[1]&&distance<5.8&&low>0;
  const kind=(distance<(data.event.region==='kutch'?6.8:5.5)||sideRoad)&&low>.65?'road':low<1.15&&high-low<2.1?'shore':high-low>1.11?'rock':'meadow';
  const grain=course.facets[indices[i]], shade=(deck?new THREE.Color(0x9a9381):sideRoad&&kind==='road'?new THREE.Color(0xc99252):tint[kind]).clone().multiplyScalar((kind==='road'?.93:.83)+grain*(kind==='road'?.14:.35));
  for(const k of [a,b,c]){terrainP.push(vertices[k],vertices[k+1],vertices[k+2]);terrainC.push(shade.r,shade.g,shade.b);}
 }
 const terrainGeo=new THREE.BufferGeometry();
 terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(terrainP,3));
 terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(terrainC,3));terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,standard(0xffffff,{vertexColors:true,flatShading:true}));
 terrain.receiveShadow=true;terrain.castShadow=true;scene.add(terrain);
 const terrainColors=terrainGeo.getAttribute('color');
 const originalTerrainColors=terrainColors.array.slice();
 const frost=new THREE.Color(0xe9f3f4);
 const frostMix=new THREE.Color();
 function setWeather(key){
  activeWeather=Object.hasOwn(weatherKinds,key)?key:dailyWeather;
  const profile=weatherKinds[activeWeather];
  scene.background.setHex(profile.sky??palette.sky);
  scene.fog.color.copy(scene.background);scene.fog.near=profile.near;scene.fog.far=profile.far;
  waterMaterial.uniforms.fogRange.value.set(profile.near,profile.far);
  sun.intensity=profile.sun;
  const light=stageOptions.light??activeWeather;
  const night=light==='night', dusk=light==='sunset';
  sunlight.visible=activeWeather==='clear'||activeWeather==='mist'||dusk;
  sunlight.position.y=dusk?44:105;
  sunlight.material.color.setHex(dusk?0xffab61:0xffffff);
  moon.visible=night;stars.visible=night;
  skyLight.color.setHex(night?0x8ab8fa:dusk?0xfac4a5:0xd8edff);
  skyLight.groundColor.setHex(night?0x4a5271:dusk?0xa9644e:0x937345);
  skyLight.intensity=night?.83:dusk?1.23:1.88;
  sun.color.setHex(night?0xadc7ff:dusk?0xff9f55:0xffd498);
  rain.visible=activeWeather==='rain';snow.visible=activeWeather==='snow';
  leaves.visible=stageOptions.season==='autumn'||(!stageOptions.season&&(activeWeather==='clear'||activeWeather==='mist'));
  const colorData=terrainColors.array;
  for(let i=0;i<colorData.length;i+=3){
   frostMix.setRGB(originalTerrainColors[i],originalTerrainColors[i+1],originalTerrainColors[i+2]);
   if(activeWeather==='snow'){
    const z=terrainP[i+2],x=terrainP[i],y=terrainP[i+1];
    const road=Math.abs(x-course.at(z).x)<5.25;
    frostMix.lerp(frost,y<1?.19:road?.36:.81);
   }else if(activeWeather==='rain'){
    frostMix.multiplyScalar(.72);
   }
   colorData[i]=frostMix.r;colorData[i+1]=frostMix.g;colorData[i+2]=frostMix.b;
  }
  terrainColors.needsUpdate=true;
 }
 weatherPicker.onchange=()=>setWeather(weatherPicker.value==='auto'?dailyWeather:weatherPicker.value);
 setWeather(activeWeather);
 function drawWeather(anchor,time){
  if(activeWeather!=='rain'&&activeWeather!=='snow')return;
  precipitationAnchor.set(Math.round(anchor.x/6)*6,Math.round(anchor.y/6)*6,Math.round(anchor.z/6)*6);
  const {x:cx,y:cy,z:cz}=precipitationAnchor;
  if(rain.visible){
   for(const [i,p] of weatherSeeds.entries()){
    const phase=time*p.speed*16+p.h,k=i*6,y=cy+21-phase%28;
    const x=cx+p.x+(phase*.16)%4,z=cz+p.z,trail=.67+p.speed*.54;
    rainPositions.set([x,y,z,x+.21,y-trail,z+.075],k);
   }
   rainAttr.needsUpdate=true;
  }
  if(snow.visible){
   for(let i=0;i<snow.count;i++){
    const p=weatherSeeds[i],phase=time*.95*p.speed+p.phase;
    weatherParticle.position.set(cx+p.x+Math.sin(phase)*1.6,cy+19-(time*p.speed*2.2+p.h)%28,cz+p.z+Math.cos(phase*.72)*1.1);
    weatherParticle.scale.setScalar(.035+p.speed*.045);
    weatherParticle.updateMatrix();snow.setMatrixAt(i,weatherParticle.matrix);
   }
   snow.instanceMatrix.needsUpdate=true;
  }
 }
 const trunk=new THREE.CylinderGeometry(.19,.24,1.2,5);
 const canopy=new THREE.IcosahedronGeometry(1,0), pine=new THREE.ConeGeometry(1,2.65,6), stone=new THREE.IcosahedronGeometry(1,0);
 const propsColors=palette.trees.map(hex=>standard(hex,{flatShading:true}));
 const rockMat=standard(palette.rock,{flatShading:true});
 for(const prop of course.props){
  const {x,y,z,scale,tone,tree}=prop;
  if(tree){
   const stem=new THREE.Mesh(trunk,timber);stem.position.set(x,y+scale*.57,z);stem.scale.setScalar(scale);stem.castShadow=true;scene.add(stem);
   const crown=new THREE.Mesh(data.event.region==='himachal'||tone===2?pine:canopy,propsColors[tone]);
   crown.position.set(x,y+scale*1.62,z);crown.scale.set(scale,scale*1.04,scale);crown.rotation.y=prop.x;
   crown.castShadow=true;scene.add(crown);
  }else{
   const mesh=new THREE.Mesh(stone,rockMat);mesh.position.set(x,y+scale*.43,z);mesh.scale.set(scale*.8,scale*.63,scale*.68);
   mesh.rotation.y=prop.z;mesh.castShadow=true;scene.add(mesh);
  }
 }
 const coloredPlaster=[0xe6b28a,0x91b8a2,0xd6c1de,0xe5ce88,0x91b7d1].map(hex=>standard(hex));
 const trimConcrete=standard(0xcfb193);
 if(region){
  const sceneryRng=mulberry32(data.event.seed^0x2026d381);
  const grassMat=standard(data.event.region==='thar'?0xa28e45:0x748650,{roughness:1});
  const grass=new THREE.InstancedMesh(new THREE.ConeGeometry(.15,.75,3),grassMat,420);
  const tuft=new THREE.Object3D();
  let count=0;
  for(let i=0;i<620&&count<grass.count;i++){
   const z=sceneryRng()*course.event.length;
   const side=sceneryRng()>.5?1:-1,dist=6.5+sceneryRng()*35,x=course.at(z).x+side*dist;
   const shortcut=course.shortcutAt(z),y=course.heightAt(x,z);
   if(y<.55||shortcut&&Math.abs(x-shortcut.x)<4)continue;
   const scale=.36+sceneryRng()*.79;
   tuft.position.set(x,y+scale*.31,z);
   tuft.scale.set(scale,scale,scale);tuft.rotation.set(.13,sceneryRng()*6.3,.14);
   tuft.updateMatrix();grass.setMatrixAt(count++,tuft.matrix);
  }
  grass.count=count;grass.instanceMatrix.needsUpdate=true;scene.add(grass);
  const stoneMat=standard(0x9a8a74);
  for(const b of course.buildings){
   const fenceX=b.x+b.side*(b.w*.5+1.2);
   for(let i=0;i<5;i++){
    const z=b.z-3.5+i*1.6,y=course.heightAt(fenceX,z);
    if(y<.6)continue;
    makeBox(scene,stoneMat,fenceX,y+.34,z,.33,.72,.36);
    const rail=makeBox(scene,timber,fenceX,y+.45,z+.48,.095,.095,.99);
    rail.receiveShadow=true;
   }
  }
 }
 const plaster=[0xe1bd88,0xe8d7b1,0xcba272].map(hex=>standard(hex));
 const roofMats=[0x8b4939,0x5d6664,0x754c45].map(hex=>standard(hex));
 const windowTrim=standard(0x263d43,{roughness:.35});
 const milestoneCanvas=document.createElement('canvas');milestoneCanvas.width=256;milestoneCanvas.height=160;
 const sign=milestoneCanvas.getContext('2d');sign.fillStyle='#f7d066';sign.fillRect(0,0,256,160);
 sign.fillStyle='#47351e';sign.textAlign='center';sign.font='bold 49px system-ui';sign.fillText('गाँव',128,67,224);
 sign.font='bold 31px system-ui';sign.fillText('VILLAGE',128,122,224);
 const milestoneTexture=new THREE.CanvasTexture(milestoneCanvas);milestoneTexture.colorSpace=THREE.SRGBColorSpace;
 const milestoneMaterial=standard(0xffffff,{map:milestoneTexture});
 const fieldColors=[0x667d36,0x889448,0xa0a25c].map(hex=>standard(hex,{side:THREE.DoubleSide}));
 for(const b of course.buildings){
  const z=b.z-6,x=course.at(z).x+b.side*7.8,y=course.heightAt(x,z);
  if(y>.8){
   makeBox(scene,cream,x,y+.4,z,.57,.85,.37);
   const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.57,.37),milestoneMaterial);
   plaque.rotation.y=Math.PI;plaque.position.set(x,y+.61,z-.191);scene.add(plaque);
  }
  for(let row=0;row<(region&&!['plains','northeast'].includes(data.event.region)?0:5);row++){
   const fieldX=b.x+b.side*(4.5+row*1.25), points=[];
   for(let dz=-6;dz<6;dz+=1){
    const ax=fieldX-.44,bx=fieldX+.44,az=b.z+dz,bz=az+1;
    const corners=[[ax,az],[ax,bz],[bx,az],[bx,az],[ax,bz],[bx,bz]];
    for(const [px,pz] of corners)points.push(px,course.heightAt(px,pz)+.042,pz);
   }
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.computeVertexNormals();
   const field=new THREE.Mesh(geometry,fieldColors[row%fieldColors.length]);field.receiveShadow=true;scene.add(field);
  }
 }
 for(const b of course.buildings){
  const {x,y,z,w,d,h,side,tone}=b;
  makeBox(scene,timber,x,y-.37,z,w+.24,.53,d+.24);
  if(region){
   const facade=coloredPlaster[(tone+Math.round(z/9))%coloredPlaster.length];
   makeBox(scene,facade,x,y+h*.5,z,w,h+.36,d);
   makeBox(scene,trimConcrete,x,y+h*.50,z,w+.13,.16,d+.13);
   makeBox(scene,trimConcrete,x,y+h+.14,z,w+.37,.22,d+.37);
   for(const face of [-1,1]){
    makeBox(scene,facade,x+face*w*.46,y+h+.42,z,.13,.53,d+.20);
    makeBox(scene,facade,x,y+h+.42,z+face*d*.46,w+.20,.53,.13);
    for(const level of [.28,.73])for(const pos of [-.30,.30]){
     const wx=x+face*(w*.5+.03),wz=z+d*pos,wy=y+h*level;
     makeBox(scene,trimConcrete,wx,wy,wz,.09,.98,.88);
     makeBox(scene,windowTrim,wx+face*.052,wy,wz,.04,.78,.66);
     makeBox(scene,trimConcrete,wx+face*.07,wy-.43,wz,.21,.09,.99);
    }
   }
   makeBox(scene,roofMats[tone],x+w*.22,y+h+.42,z-d*.22,1.12,.59,1.23);
   makeBox(scene,timber,x-side*(w*.5+.052),y+1,z,.11,1.88,1.02);
   continue;
  }
  makeBox(scene,plaster[tone],x,y+h*.46,z,w,h*1.24,d);
  const roofWidth=w*.65;
  for(const slant of [-1,1]){
   const roof=makeBox(scene,roofMats[tone],x+slant*w*.25,y+h*1.15,z,roofWidth,.17,d+.58);
   roof.rotation.z=-slant*.43;
  }
  const wallX=x-side*(w*.5+.038);
  makeBox(scene,timber,wallX,y+.78,z,.11,1.72,.85);
  for(const end of [-1,1]){
   makeBox(scene,cream,wallX,y+h*.59,z+end*d*.31,.12,.78,.85);
   makeBox(scene,windowTrim,wallX-side*.067,y+h*.59,z+end*d*.31,.08,.61,.68);
  }
  makeBox(scene,timber,x+side*w*.23,y+h*1.43,z+d*.17,.46,.90,.46);
 }
 const bridgeVisuals=[];
 if(region){
  const arrowCanvas=document.createElement('canvas');arrowCanvas.width=64;arrowCanvas.height=64;
  const arrow=arrowCanvas.getContext('2d');arrow.fillStyle='#efe1b6';arrow.fillRect(0,0,64,64);
  arrow.strokeStyle='#a95533';arrow.lineWidth=10;arrow.lineCap='square';arrow.beginPath();
  arrow.moveTo(20,13);arrow.lineTo(43,32);arrow.lineTo(20,51);arrow.stroke();
  const arrowTexture=new THREE.CanvasTexture(arrowCanvas);arrowTexture.colorSpace=THREE.SRGBColorSpace;
  const arrowSign=new THREE.MeshBasicMaterial({map:arrowTexture,side:THREE.DoubleSide,toneMapped:false});
  const arrowPlane=new THREE.PlaneGeometry(1.30,1.04);
  for(let z=24;z<course.event.length-16;z+=28){
   if(z>course.gap[0]-4&&z<course.gap[1]+4)continue;
   const center=course.at(z).x,turn=course.at(z+14).x-center;
   if(Math.abs(turn)<2.8)continue;
   const side=Math.sign(turn);
   const x=center+side*6.9,y=course.heightAt(x,z);
   if(y<.75)continue;
   makeBox(scene,timber,x,y+.88,z,.13,1.76,.13);
   const panel=new THREE.Mesh(arrowPlane,arrowSign);
   panel.position.set(x,y+1.52,z-.09);panel.rotation.y=Math.PI;
   panel.rotation.z=Math.abs(turn)<1.1?Math.PI/2:0;
   if(turn>1.1)panel.scale.x=-1;
   scene.add(panel);
  }
  const shortcutPole=standard(0x42b692);
  for(const link of course.shortcuts)for(const z of [link.a+5,link.b-4]){
   const S=course.shortcutAt(z),x=S.x-3.3,y=course.heightAt(x,z);
   if(y>.75){
    makeBox(scene,shortcutPole,x,y+.63,z,.15,1.25,.15);
    makeBox(scene,cream,x,y+1.08,z,.22,.28,.22);
   }
  }
  for(const link of course.shortcuts){
   const z=link.rampZ,ramp=course.shortcutAt(z);
   if(Math.abs(ramp.x-course.at(z).x)<5)continue;
   for(const side of [-1,1]){
    const x=ramp.x+side*1.55,y=course.heightAt(x,z);
    makeBox(scene,shortcutPole,x,y+.046,z,.67,.04,.33);
   }
  }
  if(course.bridge){
   const concrete=standard(0x626778),rails=standard(0x827158),beam=standard(0x705039);
   const timberDeck=[0xac774a,0x9b6945,0xbb8653,0xa47755].map(hex=>standard(hex));
   const fastener=standard(0x4a4541);
   for(const [index,deck] of course.bridgePlanks.entries()){
    const group=new THREE.Group();
    group.position.set(deck.x,deck.y-.135,deck.z);group.quaternion.set(0,deck.qy,0,deck.qw);
    for(let slat=0;slat<4;slat++){
     const along=(slat-1.5)*deck.length/4;
     makeBox(group,timberDeck[(index+slat)%timberDeck.length],0,0,along,10.1,.27,deck.length/4-.024);
    }
    for(const side of [-1,1])makeBox(group,fastener,side*4.72,.149,0,.07,.035,deck.length-.06);
    bridgeVisuals.push(group);scene.add(group);
   }
   const [A,B]=course.gap;
   for(let z=A-2;z<=B+2;z+=2){
    const x=course.at(z).x,y=course.roadHeight(z);
    for(const side of [-1,1]){
     makeBox(scene,concrete,x+side*5.05,y-.11,z,.34,.46,2.15);
     makeBox(scene,rails,x+side*5.03,y+.65,z,.17,1.24,.18);
     const nextX=course.at(z+2).x-x;
     const bar=makeBox(scene,beam,x+side*5.03+nextX*.5,y+1,z+1,.105,.10,Math.hypot(nextX,2)+.1);
     bar.rotation.y=Math.atan2(nextX,2);
    }
    if((z-A+2)%6===0){
     makeBox(scene,concrete,x+3,y*.5,z,.91,y+.45,.72);
     makeBox(scene,concrete,x-3,y*.5,z,.91,y+.45,.72);
    }
   }
  }
 }
 for(const z of [0,course.event.length]){
  const center=course.at(z).x,y=course.roadHeight(z);
  for(const side of [-1,1])makeBox(scene,timber,center+side*FINISH_GATE.postOffset,y+2,z,FINISH_GATE.postWidth,4,FINISH_GATE.postWidth);
  makeBox(scene,z?cream:gold,center,y+4,z,11.2,.48,.45);
  for(let i=0;i<20;i++){
   const x=center+(i%10-4.5)*.95,dz=z+Math.floor(i/10)*.65-.25;
   makeBox(scene,(i+Math.floor(i/10))%2?black:cream,x,course.heightAt(x,dz)+.07,dz,.94,.04,.63);
  }
 }
 const launchDeck=standard(0x175149,{emissive:0x10372c,side:THREE.DoubleSide});
 const launchMark=standard(0x74f4ca,{emissive:0x34b48d,emissiveIntensity:.52});
 for(const {start,end,foot,lip} of course.launchProfiles){
  const deckPositions=[];
  for(let z=start;z<end;z+=2){
   const a=course.at(z).x,b=course.at(z+2).x;
   const y=course.roadHeight(z)+.072,nextY=course.roadHeight(z+2)+.072;
   deckPositions.push(a-3.57,y,z,a-3.57+2*3.57,y,z,b-3.57,nextY,z+2,
    a+3.57,y,z,b+3.57,nextY,z+2,b-3.57,nextY,z+2);
  }
  const surface=new THREE.BufferGeometry();
  surface.setAttribute('position',new THREE.Float32BufferAttribute(deckPositions,3));surface.computeVertexNormals();
  const deck=new THREE.Mesh(surface,launchDeck);
  deck.receiveShadow=true;scene.add(deck);
  const grade=(lip-foot)/(end-start);
  for(let z=start+2;z<end;z+=2){
   const x=course.at(z).x,y=course.roadHeight(z)+.13;
   for(const side of [-1,1]){
    const stripe=makeBox(scene,launchMark,x+side*1.25,y,z,.24,.030,1.3);
    stripe.rotation.x=-Math.atan(grade);stripe.rotation.y=-side*.65;
   }
  }
  for(const side of [-1,1]){
   const x=course.at(start+1).x+side*3.97,y=course.heightAt(x,start+1);
   makeBox(scene,launchDeck,x,y+.50,start+1,.26,1.02,.27);
   makeBox(scene,launchMark,x,y+.98,start+1,.34,.15,.34);
  }
 }
 for(const z of [...course.rampCenters,course.gap[0]-3,course.gap[1]+3].filter(z=>z<course.event.length&&!course.boostRamps.includes(z))){
  const mid=course.at(z).x;
  for(let i=0;i<5;i++){
   const x=mid+(i-2)*1.45;
   makeBox(scene,gold,x,course.heightAt(x,z)+.08,z,.9,.035,.29);
  }
 }
 const overviewGeo=new THREE.BufferGeometry().setFromPoints(course.route.map(p=>new THREE.Vector3(p.x,p.y+1.8,p.z)));
 const overview=new THREE.Line(overviewGeo,new THREE.LineBasicMaterial({color:0xffdc86}));scene.add(overview);
 const wheelGeo=new THREE.CylinderGeometry(.49,.49,.39,13);wheelGeo.rotateZ(Math.PI/2);
 const archGeo=new THREE.TorusGeometry(.57,.075,5,12,Math.PI);
 archGeo.rotateY(Math.PI/2);
 const rim=standard(0xadbcbf,{metalness:.5});
 const tail=standard(0xe84734,{emissive:0x581109}),lamp=standard(0xfff0c5,{emissive:0x534321});
 const graphite=standard(0x202b2c,{roughness:.64});
 const antennaGeo=new THREE.CylinderGeometry(.014,.023,.49,5);
 const cargoBlue=standard(0x245e91),cargoCanvas=standard(0x8c793c),rackMat=standard(0x22262c);
 const expeditionGlass=standard(0x68849b,{metalness:.12,roughness:.28});
 const tireLugMaterial=standard(0x171b20);
 const exhaustGeo=new THREE.CylinderGeometry(.077,.077,.27,8);exhaustGeo.rotateX(Math.PI/2);
 const beadGeo=new THREE.CylinderGeometry(.305,.305,.43,12);beadGeo.rotateZ(Math.PI/2);
 function addTreads(parent,mat){
  const blocks=new THREE.InstancedMesh(boxGeo,mat,36);
  const lug=new THREE.Object3D();
  for(let i=0;i<36;i++){
   const angle=((i%18)+(i>=18?.5:0))*2*Math.PI/18;
   lug.position.set(i>=18?.106:-.106,Math.cos(angle)*.48,Math.sin(angle)*.48);
   lug.rotation.set(angle,0,0);lug.scale.set(.22,.081,.125);
   lug.updateMatrix();blocks.setMatrixAt(i,lug.matrix);
  }
  blocks.castShadow=true;parent.add(blocks);
 }
 function expeditionBody(root,paint,ghost,styleId,accent){
  const trim=ghost??rackMat,window=ghost??expeditionGlass;
  makeBox(root,paint,0,.34,-.02,2.12,.57,3.81);
  makeBox(root,paint,0,.68,.99,2.01,.21,1.67);
  makeBox(root,paint,0,1.01,-.50,1.95,.83,2.38);
  makeBox(root,paint,0,1.47,-.49,2.05,.14,2.49);
  makeBox(root,window,0,1.13,.704,1.72,.51,.04);
  makeBox(root,window,0,1.12,-1.703,1.72,.47,.035);
  makeBox(root,trim,0,.31,1.98,2.24,.24,.27);
  makeBox(root,trim,0,.33,-2.00,2.24,.22,.28);
  makeBox(root,trim,0,.59,1.846,1.06,.20,.055);
  for(let i=0;i<5;i++)makeBox(root,ghost??rim,(i-2)*.178,.59,1.881,.026,.143,.018);
  for(const side of [-1,1]){
   for(const z of [.16,-.99])makeBox(root,window,side*.986,1.13,z,.028,.48,.93);
   makeBox(root,trim,side*1.012,.755,-.32,.04,.055,.21);
   makeBox(root,trim,side*1.059,.29,-.07,.16,.115,1.42);
   makeBox(root,trim,side*1.071,.87,.63,.22,.145,.23);
   makeBox(root,ghost??lamp,side*.77,.61,1.859,.38,.22,.042);
   makeBox(root,ghost??tail,side*.79,.64,-1.94,.27,.195,.052);
   makeBox(root,trim,side*.88,1.57,-.55,.067,.085,2.04);
   makeBox(root,trim,side*.77,1.60,-1.53,.065,.18,.075);
   makeBox(root,trim,side*.77,1.60,.43,.065,.18,.075);
  }
  for(const z of [-1.51,-.87,-.22,.43])makeBox(root,trim,0,1.61,z,1.76,.075,.067);
  for(const side of [-1,1]){
   makeBox(root,accent,side*1.064,.54,-.25,.025,.064,2.27);
   if(styleId==='buggy')makeBox(root,trim,side*1.07,1.05,-.55,.07,.085,1.94);
   if(styleId==='truck')makeBox(root,trim,side*1.08,.48,-1.24,.12,.31,1.20);
  }
  if(styleId==='hatch'||styleId==='coupe'){
   makeBox(root,accent,0,.794,.95,.22,.024,1.51);
   makeBox(root,trim,0,1.37,-1.78,1.91,.11,.34);
  }
  if(styleId==='buggy'||styleId==='truck'){
   for(let i=0;i<3;i++)makeBox(root,ghost??lamp,(i-1)*.39,1.652,.515,.23,.157,.132);
  }
  makeBox(root,ghost??cargoBlue,-.28,1.77,-.62,.95,.27,.54);
  makeBox(root,ghost??cargoCanvas,.59,1.77,-1.16,.42,.27,.51);
  makeBox(root,ghost??rim,-.54,1.91,-.62,.07,.04,.55);
  makeBox(root,ghost??rim,-.04,1.91,-.62,.07,.04,.55);
  const spare=new THREE.Group();
  spare.position.set(.03,.99,-2.09);spare.rotation.y=Math.PI/2;spare.scale.setScalar(.84);
  root.add(spare);
  spare.add(new THREE.Mesh(wheelGeo,ghost??tireLugMaterial),new THREE.Mesh(beadGeo,ghost??rim));
  if(!ghost)addTreads(spare,tireLugMaterial);
  makeBox(root,trim,.72,.42,-1.94,.39,.12,.047);
  const pipe=new THREE.Mesh(exhaustGeo,ghost??rim);pipe.position.set(.65,.19,-2.12);root.add(pipe);
 }
 function buildCar(styleId,isGhost=false,country=countryPicker.value){
  const style=carStyles[styleId]??carStyles.hatch,root=new THREE.Group();
  const ghost=isGhost?standard(0x7affed,{transparent:true,opacity:.45,depthWrite:false,emissive:0x229980}):null;
  const paint=ghost??standard(style.paint,{roughness:.49}),dark=ghost??black;
  const accent=ghost??standard(style.accent,{roughness:.65});
  const beams=[];
  if(!isGhost){
   for(const side of [-1,1]){
    const beam=new THREE.SpotLight(0xffeee2,0,57,.34,.67,1.36);
    beam.position.set(side*.77*style.shape[0],.62*style.shape[1],1.94*style.shape[2]);
    beam.target.position.set(side*2.4,-1.65,24);
    root.add(beam,beam.target);beams.push(beam);
   }
  }
  const shell=new THREE.Group();
  shell.scale.set(...style.shape);
  root.add(shell);
  expeditionBody(shell,paint,ghost,styleId,accent);
  const wheelModels=wheels.map(([x,z])=>{
   const axle=new THREE.Group(),spinner=new THREE.Group();
   axle.position.set(x,.14-.52,z);root.add(axle);axle.add(spinner);
   for(const [shape,mat] of [[wheelGeo,dark],[beadGeo,ghost??rim]]){
    const mesh=new THREE.Mesh(shape,mat);mesh.castShadow=!isGhost;spinner.add(mesh);
   }
   if(!isGhost){
    addTreads(spinner,tireLugMaterial);
    for(const face of [-1,1])for(let i=0;i<6;i++){
     const angle=i*Math.PI/3;
     makeBox(spinner,rackMat,face*.218,Math.sin(angle)*.19,Math.cos(angle)*.19,.017,.068,.068);
    }
   }
   const side=Math.sign(x);
   const hub=makeBox(root,dark,side*.59,axle.position.y,z,.75,.13,.16);
   const strut=makeBox(root,ghost??rim,side*.78,0,z,.11,.50,.13);
   const arch=new THREE.Mesh(archGeo,ghost??rackMat);
   arch.position.set(side*1.13,-.055,z);
   arch.castShadow=!isGhost;root.add(arch);
   return {axle,spinner,hub,strut};
  });
  let pennant,flagTexture,flagMaterial,flagGeometry;
  if(normalizeCountry(country)){
   const mountX=-.64*style.shape[0],mountY=1.54*style.shape[1],mountZ=-1.1*style.shape[2];
   makeBox(root,graphite,mountX,mountY+.024,mountZ,.13,.073,.13);
   const mast=new THREE.Mesh(antennaGeo,graphite);
   mast.scale.y=1.65;
   mast.position.set(mountX,mountY+.39,mountZ);root.add(mast);
   flagTexture=new THREE.CanvasTexture(drawFlag(country));
   flagTexture.colorSpace=THREE.SRGBColorSpace;
   flagMaterial=new THREE.MeshBasicMaterial({map:flagTexture,side:THREE.DoubleSide,transparent:true,alphaTest:.22,toneMapped:false});
   flagGeometry=new THREE.PlaneGeometry(.73,.48,10,2);
   flagGeometry.translate(.365,0,0);
   pennant=new THREE.Mesh(flagGeometry,flagMaterial);
   pennant.position.set(mountX,mountY+.558,mountZ);
   pennant.rotation.y=-.17;
   root.add(pennant);
  }
  root.traverse(mesh=>{if(isGhost&&mesh.isMesh)mesh.castShadow=false;});
  scene.add(root);
  return {root,wheelModels,pennant,beams,dispose(){
   root.removeFromParent();paint.dispose();if(!ghost)accent.dispose();
   for(const beam of beams)beam.dispose();
   flagTexture?.dispose();flagMaterial?.dispose();flagGeometry?.dispose();
   root.traverse(node=>{if(node.isInstancedMesh)node.dispose();});
  }};
 }
 const particleCount=220,particleGeo=new THREE.BufferGeometry(),particleP=new Float32Array(particleCount*3),particleC=new Float32Array(particleP.length);
 particleGeo.setAttribute('position',new THREE.BufferAttribute(particleP,3));
 particleGeo.setAttribute('color',new THREE.BufferAttribute(particleC,3));
 const particles=new THREE.Points(particleGeo,new THREE.PointsMaterial({size:.45,vertexColors:true,transparent:true,depthWrite:false}));
 particles.frustumCulled=false;particles.visible=false;scene.add(particles);
 const sparks=[], effectRand=mulberry32(data.event.seed^0x5962fac2);
 const colors=[0xffd470,0xff7239,0x4cffe1,0xfff3c7].map(hex=>new THREE.Color(hex));
 function burst(){
  const z=course.event.length,y=course.roadHeight(z),x=course.at(z).x;
  sparks.length=0;
  for(let i=0;i<particleCount;i++){
   sparks.push({x:x+(i%2?5.15:-5.15),y:y+1.4,z,vx:(effectRand()-.5)*20,vy:6+effectRand()*16,vz:(effectRand()-.5)*15,life:1.5+effectRand()*1.2});
  }
  particles.visible=true;particles.material.opacity=1;
 }
 function updateBurst(dt){
  if(!particles.visible)return;
  let active=0;
  for(let i=0;i<sparks.length;i++){
   const s=sparks[i],k=i*3, c=colors[i%colors.length];
   s.life-=dt;s.vy-=10.5*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;
   particleP[k]=s.x;particleP[k+1]=s.life>0?s.y:-30;particleP[k+2]=s.z;
   const fade=Math.min(1,Math.max(0,s.life*2));
   particleC[k]=c.r*fade;particleC[k+1]=c.g*fade;particleC[k+2]=c.b*fade;
   if(s.life>0)active++;
  }
  particles.geometry.attributes.position.needsUpdate=true;particles.geometry.attributes.color.needsUpdate=true;
  particles.visible=active>0;
 }
 const markGeometry=new THREE.PlaneGeometry(1,1);
 const trackMat=new THREE.MeshBasicMaterial({color:0x594231,transparent:true,opacity:.36,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const skidMat=new THREE.MeshBasicMaterial({color:0x3c312a,transparent:true,opacity:.66,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3});
 const marks=Array.from({length:560},()=>{
  const mark=new THREE.Mesh(markGeometry,trackMat);mark.visible=false;scene.add(mark);return mark;
 });
 const dustGeometry=new THREE.IcosahedronGeometry(1,0);
 const dustMaterial=standard(0xffffff,{transparent:true,opacity:.56,depthWrite:false,flatShading:true});
 const dust=new THREE.InstancedMesh(dustGeometry,dustMaterial,152);
 dust.frustumCulled=false;scene.add(dust);
 const dustObject=new THREE.Object3D(),dustColor=new THREE.Color();
 const dustSlots=Array.from({length:dust.count},()=>({life:0}));
 let dustIndex=0,markIndex=0,lastTrack=[null,null];
 const roadDust=new THREE.Color(palette.road).lerp(new THREE.Color(0xe6bb85),.60);
 const tireSmoke=new THREE.Color(0xd2c9b8),exhaustSmoke=new THREE.Color(0x70716e);
 const tailpipePoint=new THREE.Vector3(),tailpipeRotation=new THREE.Quaternion();
 function updateDust(dt){
  for(const [i,puff] of dustSlots.entries()){
   if(puff.life>0){
    puff.life-=dt;puff.x+=puff.vx*dt;puff.y+=puff.vy*dt;puff.z+=puff.vz*dt;
    const age=1-Math.max(0,puff.life/puff.maxLife);
    dustObject.position.set(puff.x,puff.y,puff.z);
    dustObject.rotation.set(i*.65,age*2+i*.2,age*.7);
    dustObject.scale.setScalar(puff.size*(.45+age*.95)*(1-age*.65));
    dustColor.copy(puff.exhaust?exhaustSmoke:puff.smoke?tireSmoke:roadDust).multiplyScalar(.83+age*.27);
    dust.setColorAt(i,dustColor);
   }else{
    dustObject.position.set(0,-20,0);dustObject.scale.setScalar(0);
   }
   dustObject.updateMatrix();dust.setMatrixAt(i,dustObject.matrix);
  }
  dust.instanceMatrix.needsUpdate=true;
  if(dust.instanceColor)dust.instanceColor.needsUpdate=true;
 }
 const player=el('carSelect');
 const saved=localStorage.getItem('rapier-car-v2');
 if(Object.hasOwn(carStyles,saved))player.value=saved;
 if(recording&&Object.hasOwn(carStyles,recording.car))player.value=recording.car;
 if(recording&&normalizeCountry(recording.country))countryPicker.value=recording.country;
 let model=buildCar(player.value);
 let previewClose=performance.now()+6500;
 el('previewCar').onclick=()=>{previewClose=performance.now()+6500;};
 countryPicker.onchange=()=>{localStorage.setItem('rapier-country',countryPicker.value);player.onchange();};
 player.onchange=()=>{
  model.dispose();model=buildCar(player.value);
  localStorage.setItem('rapier-car-v2',player.value);previewClose=performance.now()+4500;
 };
 const audio=makeAudio(el('audio'));
 const ghostMenu=el('ghostSelect'),ghostKey='rapier-best-v9-'+data.event.day+(region?'-v11-'+data.event.region:'');
 const validGhost=g=>g&&typeof g.name==='string'&&Number.isFinite(g.ms)&&/^[0-9a-zA-Z_-]{60,14400}$/.test(g.inputs);
 let leader=validGhost(data.ghost)?data.ghost:null,personal=null;
 try{const saved=JSON.parse(localStorage.getItem(ghostKey));if(validGhost(saved))personal=saved;}catch{}
 function ghostChoices(){
  const current=ghostMenu.value;
  const options=[new Option('Live Players','rivals'),new Option('Solo','solo')];
  if(personal)options.push(new Option('Personal best · '+pretty(personal.ms),'personal'));
  if(leader)options.push(new Option('Daily leader · '+leader.name,'leader'));
  ghostMenu.replaceChildren(...options);
  ghostMenu.value=options.some(option=>option.value===current)?current:leader?'leader':'solo';
 }
 ghostChoices();ghostMenu.value=data.practice?'solo':'rivals';
 const rivalStatus=el('rivalStatus');
 let rivalRequest=null,rivalExpires=0;
 function loadRivals(){
  if(!rivalRequest||Date.now()>=rivalExpires){
   rivalExpires=Date.now()+45_000;
   const query=new URLSearchParams(eventSuffix);
   query.set('driver',driverId);
   rivalRequest=fetch('/api/rivals?'+query,{signal:AbortSignal.timeout(5000)}).then(async response=>{
    if(!response.ok)throw Error('Rivals unavailable');
    const result=await response.json();
    if(result.day!==data.event.day)throw Error('Reload for the next stage');
    return result.rivals.filter(validGhost);
   });
  }
  return rivalRequest;
 }
 function showRivalStatus(message){
  rivalStatus.textContent=message;
  rivalStatus.hidden=!message;
 }
 ghostMenu.onchange=()=>showRivalStatus('');
 function nameTag(name){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#173732ed';ctx.beginPath();ctx.roundRect(8,15,496,70,20);ctx.fill();
  ctx.fillStyle='#a8fff3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 35px system-ui';
  ctx.fillText(name,256,49,458);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sprite.scale.set(5.2,1.02,1);sprite.position.y=2.8;return sprite;
 }
 let car=null,prior=null;
 const replays=[];
 const pressed=new Set(),touches=new Map();
 const joystick=el('joystick');
 const stickControl=joystick.parentElement;
 let stickOriginX=0,stickOriginY=0,stickRadius=0;
 let stickPointer=null,stickMask=0;
 const actionButtons=[...el('touch').querySelectorAll('button')];
 function releaseStick(){
  const pointer=stickPointer;
  stickPointer=null;stickMask=0;
  joystick.classList.remove('held');
  joystick.style.removeProperty('--stick-base-x');
  joystick.style.removeProperty('--stick-base-y');
  joystick.style.setProperty('--stick-x','0px');
  joystick.style.setProperty('--stick-y','0px');
  if(pointer!==null&&joystick.hasPointerCapture(pointer))joystick.releasePointerCapture(pointer);
 }
 function clearControls(){
  pressed.clear();touches.clear();releaseStick();
  for(const button of actionButtons)button.classList.remove('active');
 }
 function moveStick(event){
  if(event.pointerId!==stickPointer)return;
  const radius=stickRadius;
  const x=(event.clientX-stickOriginX)/radius;
  const y=(event.clientY-stickOriginY)/radius;
  const magnitude=Math.max(1,Math.hypot(x,y)),nx=x/magnitude,ny=y/magnitude;
  const left=nx<-(stickMask&1?.19:.31),right=nx>(stickMask&2?.19:.31);
  const gas=ny<-(stickMask&4?.18:.29),brake=ny>(stickMask&8?.18:.29);
  stickMask=(left?1:0)|(right?2:0)|(gas?4:0)|(brake?8:0);
  joystick.style.setProperty('--stick-x',nx*radius*.71+'px');
  joystick.style.setProperty('--stick-y',ny*radius*.71+'px');
 }
 stickControl.addEventListener('pointerdown',event=>{
  if(stickPointer!==null||event.button!==0)return;
  event.preventDefault();
  const bounds=joystick.getBoundingClientRect();
  stickOriginX=event.clientX;
  stickOriginY=event.clientY;
  stickRadius=bounds.width*.42;
  joystick.style.setProperty('--stick-base-x',stickOriginX-bounds.left-bounds.width*.5+'px');
  joystick.style.setProperty('--stick-base-y',stickOriginY-bounds.top-bounds.height*.5+'px');
  stickPointer=event.pointerId;
  joystick.setPointerCapture(stickPointer);
  joystick.classList.add('held');
 });
 joystick.addEventListener('pointermove',moveStick);
 for(const type of ['pointerup','pointercancel','lostpointercapture']){
  joystick.addEventListener(type,event=>{if(event.pointerId===stickPointer)releaseStick();});
 }
 const keys={a:1,ArrowLeft:1,d:2,ArrowRight:2,w:4,ArrowUp:4,s:8,ArrowDown:8,Shift:16,' ':32};
 let runCountry=selectedCountry,runCar=player.value;
 let pausedFrom='racing';
 let rampNoticeUntil=0;
 let mode='preview',last=performance.now(),orbit=0,countdown=0,accumulator=0,serial=0,inputs=[];
 el('name').value=localStorage.getItem('rapier-name')||'Rookie';
 el('date').textContent=(data.practice?'PRACTICE · ':data.preview?'TEST STAGE · ':'')+new Date(data.event.day*DAY).toISOString().slice(0,10)+' UTC';
 el('title').textContent=data.event.name;
 el('description').textContent=(course.event.length/1000).toFixed(2)+' km · '+(region?.features??'Point-to-point rally');
 el('start').disabled=false;
 const camVelocity=new THREE.Vector3(), camTarget=new THREE.Vector3(),lookVelocity=new THREE.Vector3();
 const desired=new THREE.Vector3(),look=new THREE.Vector3(),delta=new THREE.Vector3();
 function spring(position,velocity,target,frequency,dt){
  const fall=Math.exp(-frequency*dt);
  delta.copy(position).sub(target);
  position.copy(target);
  for(const axis of ['x','y','z']){
   const v=velocity[axis]+frequency*delta[axis];
   position[axis]+=(delta[axis]+v*dt)*fall;
   velocity[axis]=(velocity[axis]-frequency*v*dt)*fall;
  }
 }
 const qA=new THREE.Quaternion(),qB=new THREE.Quaternion(),forwardVec=new THREE.Vector3();
 const spawn=course.spawn;
 const initial={p:{x:spawn.x,y:spawn.y,z:spawn.z},q:{x:0,y:spawn.qy,z:0,w:spawn.qw},wheels:wheels.map(()=>({spin:0,length:.52}))};
 function drawCar(visual,previous,current,alpha,steer){
  const p=previous.p,n=current.p;
  visual.root.position.set(THREE.MathUtils.lerp(p.x,n.x,alpha),THREE.MathUtils.lerp(p.y,n.y,alpha),THREE.MathUtils.lerp(p.z,n.z,alpha));
  qA.set(previous.q.x,previous.q.y,previous.q.z,previous.q.w);qB.set(current.q.x,current.q.y,current.q.z,current.q.w);
  visual.root.quaternion.copy(qA.slerp(qB,alpha));
  visual.wheelModels.forEach(({axle,spinner,hub,strut},i)=>{
   const a=previous.wheels[i],b=current.wheels[i];
   axle.position.y=.14-THREE.MathUtils.lerp(a.length,b.length,alpha);
   const mount=.28;
   hub.position.y=axle.position.y;
   strut.position.y=(mount+axle.position.y)*.5;
   strut.scale.y=Math.max(.10,mount-axle.position.y);
   axle.rotation.y=i<2?steer:0;spinner.rotation.x=THREE.MathUtils.lerp(a.spin,b.spin,alpha);
  });
 }
 function resetGhost(){
  for(const {state,visual,tag} of replays){
   state?.sim.dispose();
   tag.material.map.dispose();
   tag.material.dispose();
   visual.dispose();
  }
  replays.length=0;
 }
 function addReplay(run,fullColor,delay=0,repeat=false){
  const state=makeCar(course);
  const style=Object.hasOwn(carStyles,run.car)?run.car:fullColor?'expedition':runCar;
  const visual=buildCar(style,!fullColor,run.country??null);
  const tag=nameTag(run.name);
  visual.root.add(tag);
  let tick=0;
  while(tick< -delay&&!state.done){
   step(state,inputCodes.indexOf(run.inputs[tick]),course);
   tick++;
  }
  replays.push({run,state,visual,tag,previous:state.pose,inputs:run.inputs,delay:-tick+Math.max(delay,0),repeat,
   gridSlot:fullColor&&!podium?replays.length+1:0});
 }
 let pendingStart=false, raceRivals=[],rivalTick=0,rivalAccumulator=0;
 async function start(){
  const name=el('name').value.trim();
  if(!name){el('raceSetup').open=true;el('name').focus();return;}
  if(pendingStart)return;
  if(!recording)audio.start();
  const current=++serial,opponent=ghostMenu.value;
  const fromMenu=mode==='preview';
  if(opponent==='rivals'&&mode==='preview'){
   let rivals=[];
   pendingStart=true;
   el('start').disabled=true;
   showRivalStatus('Loading recorded runs…');
   let unavailable=false;
   try{rivals=await loadRivals();}
   catch{rivalRequest=null;unavailable=true;}
   finally{pendingStart=false;el('start').disabled=false;}
   if(current!==serial)return;
   raceRivals=rivals;
   showRivalStatus(unavailable?'Rivals unavailable. Starting solo.':rivals.length?'':'No other runs yet. Starting solo.');
  }
  inputs=[];accumulator=0;rampNoticeUntil=0;
  if(!recording)localStorage.setItem('rapier-name',name);
  runCountry=countryPicker.value;runCar=player.value;
  car?.sim.dispose();car=makeCar(course);prior=car.pose;
  resetGhost();rivalTick=0;rivalAccumulator=0;
  if(opponent==='rivals'){
   const slots=Array.from({length:raceRivals.length},(_,i)=>i);
   for(let i=slots.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [slots[i],slots[j]]=[slots[j],slots[i]];
   }
   raceRivals.forEach((run,i)=>{
    const phase=.12+.66*(slots[i]+Math.random())/slots.length;
    const introTick=Math.floor(run.inputs.length*phase);
    const delay=fromMenu?-introTick:slots[i]*14+Math.floor(Math.random()*14);
    addReplay(run,true,delay,true);
   });
  }
  for(const run of recordingField)addReplay(run,true);
  const ghostRun=opponent==='leader'?leader:opponent==='personal'?personal:null;
  if(ghostRun)addReplay(ghostRun,false);
  for(const mark of marks)mark.visible=false;
  for(const puff of dustSlots)puff.life=0;
  lastTrack=[null,null];
  particles.visible=false;
  clearControls();
  mode='countdown';countdown=3;
  el('pausePanel').hidden=true;el('pauseRace').hidden=false;
  el('menu').hidden=true;el('results').hidden=true;el('hud').hidden=false;el('touch').hidden=Boolean(recording);el('back').hidden=false;el('restart').hidden=false;
  el('timer').textContent='0:00.000';el('progress').textContent='0% complete';el('raceProgress').value=0;el('speed').textContent='0';el('drift').textContent='GRIP';el('drift').classList.remove('sliding');
  toggleBoard(false);el('announce').textContent='3';el('start').blur();el('restart').blur();el('retry').blur();
  const facing=new THREE.Vector3(0,0,1).applyQuaternion(new THREE.Quaternion(0,spawn.qy,0,spawn.qw));
  camera.position.set(spawn.x-facing.x*13,spawn.y+7,spawn.z-facing.z*13);
  camTarget.set(spawn.x+facing.x*7,spawn.y+1,spawn.z+facing.z*7);
  camVelocity.set(0,0,0);lookVelocity.set(0,0,0);
 }
 function back(){
  toggleBoard(false);
  serial++;mode='preview';el('pausePanel').hidden=true;el('pauseRace').hidden=true;el('menu').hidden=false;el('results').hidden=true;el('hud').hidden=true;el('touch').hidden=true;el('back').hidden=true;el('restart').hidden=true;
  el('announce').textContent='';el('start').textContent='Play';el('description').textContent=(course.event.length/1000).toFixed(2)+' km · '+(region?.features??'Point-to-point rally');
  car?.sim.dispose();car=null;resetGhost();clearControls();
 }
 function pause(){
  if(mode==='paused'){
   mode=pausedFrom;toggleBoard(false);
   el('pausePanel').hidden=true;el('pauseRace').hidden=false;el('hud').hidden=false;el('touch').hidden=Boolean(recording);
   el('pauseRace').blur();
   return;
  }
  if(mode!=='racing'&&mode!=='countdown')return;
  pausedFrom=mode;mode='paused';clearControls();
  el('announce').textContent='';el('touch').hidden=true;el('hud').hidden=true;
  el('pauseRace').hidden=true;el('pausePanel').hidden=false;el('pauseSound').textContent=el('audio').textContent;el('resumeRace').focus();
 }
 el('pauseRace').onclick=pause;el('resumeRace').onclick=pause;el('pauseRestart').onclick=start;
 el('pauseExit').onclick=back;el('pauseBoard').onclick=()=>toggleBoard(true);
 el('pauseSound').onclick=async()=>{await el('audio').onclick();el('pauseSound').textContent=el('audio').textContent;};
 el('options').onsubmit=event=>{event.preventDefault();if(mode==='paused')pause();else start();};
 el('back').onclick=back;el('restart').onclick=start;el('retry').onclick=start;
 window.addEventListener('keydown',event=>{
  if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(keys[key]){event.preventDefault();pressed.add(key);}
  if(key==='Escape'&&!event.repeat)pause();
  if(key==='r'&&!event.repeat&&mode!=='preview')start();
 });
 window.addEventListener('keyup',event=>pressed.delete(event.key.length===1?event.key.toLowerCase():event.key));
 window.addEventListener('blur',()=>{clearControls();if(mode==='racing'&&!recording)pause();});
 for(const button of actionButtons){
  button.addEventListener('pointerdown',event=>{
   event.preventDefault();button.setPointerCapture(event.pointerId);
   touches.set(event.pointerId,Number(button.dataset.mask));button.classList.add('active');
  });
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(kind,event=>{
   touches.delete(event.pointerId);button.classList.remove('active');
  });
 }
 async function finish(maxTime=false){
  const current=serial,ms=clock(inputs.length),encoded=inputs.join('');
  mode='finished';el('pauseRace').hidden=true;clearControls();el('touch').hidden=true;el('announce').textContent=maxTime?'TIME':'FINISH';
  el('resultHeading').textContent=maxTime?'Time limit reached':'Stage complete';
  el('resultCourse').textContent=course.event.name;el('resultTime').textContent=pretty(ms);
  el('resultDriver').textContent=recording?.name??(localStorage.getItem('rapier-name')||'Rookie');
  el('resultDriver').hidden=false;
  if(!replays.some(replay=>replay.repeat))resetGhost();
  if(!maxTime){burst();audio.finish();}
  el('resultStatus').dataset.state='pending';
  el('resultStatus').textContent=maxTime?'Start another run to set a time.':data.practice?'Practice complete.':'Verifying replay…';
  setTimeout(()=>{
   if(serial!==current)return;
   el('announce').textContent='';el('results').hidden=false;
   if(el('resultStatus').dataset.state==='verified')toggleBoard(true);
   el('retry').focus();
  },maxTime?450:1450);
  if(recording)window.dispatchEvent(new CustomEvent('rally:replay-finished',{detail:{ms,finished:!maxTime}}));
  if(maxTime||data.practice)return;
  const name=localStorage.getItem('rapier-name')||'Rookie';
  try{
   const response=await fetch('/api/result'+eventSuffix,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({day:data.event.day,id:driverId,name,country:runCountry,car:runCar,inputs:encoded})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error);
   const best=!personal||result.ms<personal.ms;
   if(best){
    personal={name,country:runCountry,car:runCar,ms:result.ms,inputs:encoded};
    try{localStorage.setItem(ghostKey,JSON.stringify(personal));}catch{}
   }
   if(validGhost(result.ghost))leader=result.ghost;
   displayScores(result.scores);ghostChoices();
   if(current!==serial)return;
   el('resultTime').textContent=pretty(result.ms);
   el('resultStatus').dataset.state='verified';
   if(!el('results').hidden)toggleBoard(true);
   el('resultStatus').textContent=(best?'Personal best · ':'')+(result.rank?'Daily best rank #'+result.rank:'Outside today’s top 50');
  }catch(error){
   if(current===serial){el('resultStatus').dataset.state='error';el('resultStatus').textContent=error.message;}
  }
 }
 function tireEffects(){
  if(car.reset||car.speed<2.25||!car.grounded){lastTrack=[null,null];return;}
  const wheel=car.sim.vehicle;
  for(let i=0;i<2;i++){
   const index=i+2,hit=wheel.wheelIsInContact(index)&&wheel.wheelContactPoint(index);
   if(!hit||hit.y<.12){lastTrack[i]=null;continue;}
   const last=lastTrack[i];
   if(!last){lastTrack[i]={x:hit.x,y:hit.y,z:hit.z};continue;}
   const dx=hit.x-last.x,dz=hit.z-last.z,length=Math.hypot(dx,dz);
   if(length<.43)continue;
   lastTrack[i]={x:hit.x,y:hit.y,z:hit.z};
   if(length>3)continue;
   const dark=car.drift&&car.slip>.8;
   const mark=marks[markIndex++%marks.length];
   mark.material=dark?skidMat:trackMat;
   mark.scale.set(dark?.23:.17,length+.10,1);
   mark.position.set((hit.x+last.x)*.5,(hit.y+last.y)*.5+.045,(hit.z+last.z)*.5);
   mark.rotation.set(-Math.PI/2,0,Math.atan2(dx,dz));mark.visible=true;
   if(car.speed>5){
    const life=.42+effectRand()*.48;
    Object.assign(dustSlots[dustIndex++%dustSlots.length],{
     x:hit.x,y:hit.y+.12,z:hit.z,vx:(effectRand()-.5)*1.7-dx*.65,
     vy:.6+effectRand()*.90,vz:(effectRand()-.5)*1.5-dz*.66,
     life,maxLife:life,size:.29+effectRand()*(dark?.49:.42),smoke:dark,exhaust:false
    });
   }
  }
 }
 function exhaustEffects(mask){
  const loaded=Boolean(mask&4),interval=loaded?4:13;
  if(car.reset||car.ticks%interval!==0)return;
  const {p,q,v}=car.pose,style=carStyles[player.value]??carStyles.expedition;
  tailpipeRotation.set(q.x,q.y,q.z,q.w);
  tailpipePoint.set(.65*style.shape[0],.19*style.shape[1],-2.27*style.shape[2]).applyQuaternion(tailpipeRotation);
  const life=.55+effectRand()*.30;
  Object.assign(dustSlots[dustIndex++%dustSlots.length],{
   x:p.x+tailpipePoint.x,y:p.y+tailpipePoint.y,z:p.z+tailpipePoint.z,
   vx:v.x*.17+tailpipePoint.x*.72+(effectRand()-.5)*.54,
   vy:.56+effectRand()*.28,vz:v.z*.17+tailpipePoint.z*.72,
   life,maxLife:life,size:loaded?.26+effectRand()*.18:.17,smoke:false,exhaust:true
  });
 }
 function advanceReplay(replay,tick){
  const replayTick=tick-replay.delay;
  if(replayTick<0)return;
  const {visual}=replay;
  if(replay.repeat&&!visual.root.visible){
   replay.state=makeCar(course);
   replay.previous=replay.state.pose;
   visual.root.visible=true;
  }
  if(!visual.root.visible)return;
  const state=replay.state;
  const code=replay.inputs[replayTick];
  if(code===undefined||state.done){
   if(!podium)visual.root.visible=false;
   if(replay.repeat){
    state.sim.dispose();
    replay.state=null;
    replay.delay=tick+180+Math.floor(Math.random()*420);
   }
   return;
  }
  replay.previous=state.pose;
  step(state,inputCodes.indexOf(code),course);
  if(state.reset)replay.previous=state.pose;
 }
 function frame(now){
  const dt=Math.min(.095,(now-last)/1000);last=now;orbit+=dt;
  waterMaterial.uniforms.time.value=orbit;
  updateBurst(dt);
  updateDust(dt);
  if(mode==='countdown'){
   countdown-=dt;el('announce').textContent=countdown>0?String(Math.ceil(countdown)):'';
   if(countdown<=0)mode='racing';
  }
  if(mode==='countdown'||mode==='racing'||mode==='finished'){
   rivalAccumulator+=dt;
   while(rivalAccumulator>=DT){
    rivalAccumulator-=DT;
    for(const replay of replays)if(replay.repeat)advanceReplay(replay,rivalTick);
    rivalTick++;
   }
  }
  let mask=stickMask;for(const key of pressed)mask|=keys[key];for(const bit of touches.values())mask|=bit;
  if(mode==='racing'){
   accumulator+=dt*(recording?replaySpeed:1);
   while(accumulator>=DT&&mode==='racing'){
    accumulator-=DT;
    for(const replay of replays)if(!replay.repeat)advanceReplay(replay,inputs.length);
    if(recording){
     const code=recording.inputs[inputs.length];
     if(code===undefined){void finish(true);break;}
     mask=inputCodes.indexOf(code);
    }
    inputs.push(inputCodes[mask]);prior=car.pose;
    const grounded=car.grounded;
    step(car,mask,course);
    if(car.reset)prior=car.pose;
    if(!grounded&&car.grounded&&prior.v.y<-2.3)audio.thud();
    if(car.rampBoost){audio.launch();rampNoticeUntil=now+850;}
    tireEffects();
    exhaustEffects(mask);
    if(podium&&inputs.length===recording.inputs.length)void finish(!car.done);
    else if(!podium&&car.done)void finish();
    else if(inputs.length>=14400)void finish(true);
   }
  }
  const alpha=mode==='racing'?Math.min(1,accumulator/DT):1;
  drawCar(model,prior??initial,car?.pose??initial,alpha,car?.angle??0);
  for(const [i,visual] of bridgeVisuals.entries()){
   const deck=course.bridgePlanks[i];
   visual.position.y=car?.sim.bridge[i]?.plank.translation().y??deck.y-.135;
  }
  for(const {visual,state,previous,gridSlot,delay,repeat} of replays){
   if(!visual.root.visible)continue;
   drawCar(visual,previous,state.pose,repeat&&mode!=='paused'?rivalAccumulator/DT:alpha,state.angle);
   // Keep the starting grid readable, then blend into the exact recorded pose.
   const gridBlend=1-THREE.MathUtils.smoothstep((repeat?rivalTick:inputs.length)-delay,0,85);
   if(gridSlot&&gridBlend>0){
    const side=gridSlot%2===0?-2.6:2.6;
    const rear=-1.7-Math.floor((gridSlot-1)/2)*3.3;
    const sin=2*spawn.qw*spawn.qy,cos=1-2*spawn.qy*spawn.qy;
    visual.root.position.x+=(side*cos+rear*sin)*gridBlend;
    visual.root.position.z+=(rear*cos-side*sin)*gridBlend;
   }
  }
  for(const [visual,state] of [[model,car],...replays.map(({visual,state})=>[visual,state])]){
   if(!visual?.pennant)continue;
   const flag=visual.pennant,velocity=state?.pose.v;
   const q=visual.root.quaternion;
   const forwardX=2*(q.w*q.y+q.x*q.z),forwardZ=1-2*(q.x*q.x+q.y*q.y);
   const forwardSpeed=velocity?velocity.x*forwardX+velocity.z*forwardZ:0;
   const sideSpeed=velocity?velocity.x*forwardZ-velocity.z*forwardX:0;
   const windX=2.0-sideSpeed,windZ=.32-forwardSpeed;
   const target=Math.atan2(-windZ,windX);
   const turn=target-flag.rotation.y;
   flag.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-dt*9));
   const strength=Math.min(1,Math.hypot(windX,windZ)/16);
   const points=flag.geometry.attributes.position;
   for(let i=0;i<points.count;i++){
    const x=points.getX(i),wave=Math.sin(orbit*(5+strength*9)-x*13);
    points.setZ(i,wave*x*(.12+strength*.10));
   }
   points.needsUpdate=true;
  }
  overview.visible=mode==='preview';
  const p=model.root.position;
  if(mode==='preview'){
   if(now<previewClose){
    camera.position.set(p.x+8,p.y+5.1,p.z+9);camera.lookAt(p.x,p.y+.35,p.z);
   }else{
    const z=course.event.length*(.10+.80*((orbit*.057)%1)),center=course.at(z);
    camera.position.set(center.x+52+Math.cos(orbit*.15)*16,center.y+82,z-64);
    camera.lookAt(center.x,center.y,z+32);
   }
   camera.fov=53;
  }else{
   forwardVec.set(0,0,1).applyQuaternion(model.root.quaternion);forwardVec.y=0;
   if(forwardVec.lengthSq()>.01)forwardVec.normalize();else forwardVec.set(0,0,1);
   const velocity=car.pose.v;
   if(car.speed>4&&car.forward>0){
    const follow=new THREE.Vector3(velocity.x,0,velocity.z).normalize();
    forwardVec.lerp(follow,.28).normalize();
   }
   const length=13+Math.min(5,car.speed*.13);
   desired.copy(p).addScaledVector(forwardVec,-length);desired.y+=8;
   look.copy(p).addScaledVector(forwardVec,8+car.speed*.13);look.y+=.7;
   if(recording&&mode!=='finished'){
    if(replayCamera==='wide'){
     const active=[];
     if(!car.done)active.push(p);
     for(const replay of replays){
      if(!replay.state.done&&inputs.length<=replay.inputs.length)active.push(replay.visual.root.position);
     }
     if(!active.length)active.push(p);
     let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxY=-Infinity;
     for(const point of active){
      minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);
      minZ=Math.min(minZ,point.z);maxZ=Math.max(maxZ,point.z);
      maxY=Math.max(maxY,point.y);
     }
     const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
     const span=Math.max((maxX-minX+20)/Math.max(.44,camera.aspect),maxZ-minZ+26);
     const height=Math.max(38,span*1.2)*replayZoom;
     desired.set(x+height*.07,maxY+height,z-height*.32);
     look.set(x,maxY-1,z);
    }else{
     const selected=replayDrivers[Number(replayCamera)];
     const selectedReplay=replays.find(replay=>replay.run===selected);
     const target=selectedReplay?.visual.root??model.root;
     forwardVec.set(0,0,1).applyQuaternion(target.quaternion);
     forwardVec.y=0;
     if(forwardVec.lengthSq()>.01)forwardVec.normalize();else forwardVec.set(0,0,1);
     desired.copy(target.position).addScaledVector(forwardVec,-19*replayZoom);
     desired.y+=12*replayZoom;
     look.copy(target.position).addScaledVector(forwardVec,4);
     look.y+=1;
    }
   }
   if(podium&&mode==='finished'){
    const z=course.event.length,finishPoint=course.at(z);
    desired.set(finishPoint.x+22,course.roadHeight(z)+49,z-35);
    look.set(finishPoint.x,course.roadHeight(z),z-12);
   }
   spring(camera.position,camVelocity,desired,podium&&mode==='finished'?2.4:6.6,dt);spring(camTarget,lookVelocity,look,7.2,dt);camera.lookAt(camTarget);
   const fov=52+Math.min(14,car.speed*.39);
   camera.fov+=(fov-camera.fov)*(1-Math.exp(-dt*4.8));
   el('timer').textContent=pretty(clock(inputs.length));
   const progress=car.done?100:Math.min(99,Math.round((car.checkpoint+1)/course.checkpoints.length*100));
   el('raceProgress').value=progress;
   el('progress').textContent=car.missedCheckpoint?'Missed checkpoint · turn back':progress+'% complete';
   el('speed').textContent=Math.round(car.speed*3.6);el('surface').textContent=now<rampNoticeUntil?'RAMP BOOST':car.grounded?'km/h':'AIRBORNE';
   el('drift').textContent=car.drift?'DRIFTING':'GRIP';el('drift').classList.toggle('sliding',car.drift);
  }
  if(recording){
   const profile=weatherKinds[activeWeather];
   const range=replayCamera==='wide'&&mode!=='finished'?Math.max(0,camera.position.distanceTo(camTarget)-45):0;
   scene.fog.near=profile.near+range;
   scene.fog.far=profile.far+range;
  }
  camera.updateProjectionMatrix();
  const lightZ=mode==='preview'?camera.position.z+65:p.z;
  const leafCenter=mode==='preview'?course.at(lightZ).x:p.x;
  const groundY=course.roadHeight(lightZ);
  for(const [i,leaf] of leafData.entries()){
   const phase=leaf.phase+orbit*leaf.factor;
   leafObject.position.set(leafCenter+leaf.x+Math.sin(phase*.74)*2.5,groundY+1+(20-phase%20),lightZ+leaf.z+Math.cos(phase)*1.8);
   leafObject.rotation.set(phase*.9,phase*.63,phase*.36);
   leafObject.updateMatrix();leaves.setMatrixAt(i,leafObject.matrix);
  }
  leaves.instanceMatrix.needsUpdate=true;
  clouds.position.x=Math.sin(orbit*.028)*13;
  const light=stageOptions.light??activeWeather;
  const night=light==='night',dusk=light==='sunset';
  const lights=night?135:dusk?46:activeWeather==='rain'||activeWeather==='mist'?37:0;
  for(const beam of model.beams)beam.intensity=lights;
  lamp.emissiveIntensity=night?2.7:dusk?1.8:.62;
  tail.emissiveIntensity=(mask&8)?2.25:night||dusk?1.12:.55;
  sun.position.set((mode==='preview'?camera.position.x:p.x)-(dusk?91:31),dusk?36:74,lightZ-(dusk?63:35));
  sun.target.position.set(mode==='preview'?course.at(lightZ).x:p.x,4,lightZ);
  audio.update(car,mode,mask);
  drawWeather(mode==='preview'?camera.position:p,orbit);
  renderer.render(scene,camera);
  if(replayFrame)window.dispatchEvent(replayFrame);
  requestAnimationFrame(frame);
 }
 if(recording)window.dispatchEvent(new CustomEvent('rally:replay-ready',{detail:{
  start,resize,run:recording,stage:course.event.name,podium,
  drivers:replayDrivers.map(({name,ms})=>({name,ms})),
  setCamera:value=>{replayCamera=value;},
  setZoom:value=>{replayZoom=value;},
  setSpeed:value=>{replaySpeed=value;}
 }}));
 requestAnimationFrame(frame);
}

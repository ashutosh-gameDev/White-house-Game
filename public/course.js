export const DAY=86400000;
export const DT=1/60;
export const FINISH_GATE={postOffset:5.45,postWidth:.32,crossingOffset:.15};
export const inputCodes='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_';
export function mulberry32(seed){
 return ()=>{
  let t=seed=(seed+0x6D2B79F5)|0;
  t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
export function eventFor(now=Date.now()){
 const day=Math.floor(now/DAY), seed=(Math.imul(day,2654435761)^0x7413ef18)>>>0;
 const rand=mulberry32(seed);
 const prefix=['Khimsar','Hampi','Majuli','Chitkul','Malana','Mandawa','Kumbalangi','Ziro'];
 const suffix=['Village Trail','River Road','Hill Track','Field Loop','Ghat Run','Dirt Stage'];
 const name=prefix[Math.floor(rand()*prefix.length)]+' '+suffix[Math.floor(rand()*suffix.length)];
 return {day,seed,name,biome:Math.floor(rand()*3),length:448+Math.floor(rand()*5)*32};
}
export const palettes=[
 {sky:0xb7d6c5,water:0x3eaea6,road:0xc37945,shore:0xefcc8a,meadow:0xdab35f,rock:0xa97675,trees:[0xd47937,0xecab52,0x427652]},
 {sky:0xbad1ce,water:0x397f8b,road:0xb68b61,shore:0xd4c6a2,meadow:0x819859,rock:0x697682,trees:[0x255942,0x528154,0x71834c]},
 {sky:0xe3c7aa,water:0x5eaba4,road:0xc38552,shore:0xecc48e,meadow:0xe0aa6d,rock:0xa56751,trees:[0x8f7542,0x587452,0xa99658]}
];
export const regions={
 plains:{label:'Northern Plains',name:'Doaba Canal Road',length:576,river:true,base:3.5,grade:.9,bend:13,rough:.6,edge:.2,trees:.55,features:'Open farm roads and a canal bridge',sky:0xc9ddda,water:0x428f89,road:0xaa7748,shore:0xd1bf91,meadow:0x98a95e,rock:0x9d8a71,treesColor:[0x637d36,0x7e923e,0x456343]},
 kutch:{label:'Rann of Kutch',name:'Dhordo Salt Flats',length:608,river:false,base:2.5,grade:.33,bend:7,rough:.18,edge:0,trees:0,features:'Wide salt flats, fast sweepers and salt mounds',sky:0xe4dce0,water:0x629eaa,road:0xb4a293,shore:0xe9e3d5,meadow:0xe8e1d3,rock:0xbab2aa,treesColor:[0x7b845e,0x919369,0x5f6956]},
 northeast:{label:'Northeast India',name:'Ziro Terrace Trail',length:512,river:true,base:6,grade:6,bend:32,rough:4.6,edge:.17,trees:.90,features:'Tight green ridges, forest and terraced fields',sky:0xaecbcc,water:0x347a7d,road:0xb28c59,shore:0xb1ae78,meadow:0x72964f,rock:0x537763,treesColor:[0x315e3c,0x6e9846,0x224f42]},
 thar:{label:'Thar Desert',name:'Khimsar Dune Run',length:544,river:false,base:5,grade:3.1,bend:23,rough:4.5,edge:0,trees:.10,features:'Soft sand ridges and broad dune crossings',sky:0xeed1a7,water:0x378b98,road:0xcd8d51,shore:0xebc78c,meadow:0xe0ad62,rock:0xa96b49,treesColor:[0x8b7d43,0x776f39,0x68683e]},
 himachal:{label:'Himachal Pradesh',name:'Chitkul Pine Pass',length:512,river:true,base:9,grade:8,bend:36,rough:7,edge:.10,trees:.80,features:'Steep switchbacks, pine slopes and snowy peaks',sky:0xb9cde1,water:0x488b99,road:0xaf855f,shore:0xc4bc9e,meadow:0x7b8d54,rock:0x818990,treesColor:[0x3b674b,0x456c45,0x294c42]},
 ladakh:{label:'Ladakh',name:'Hemis High Road',length:544,river:false,base:10,grade:7,bend:24,rough:10,edge:.04,trees:.015,features:'Dry high-altitude grades, scree and stark mountains',sky:0xbbd2e3,water:0x4b90a4,road:0xac8869,shore:0xd5ba90,meadow:0xc4a37c,rock:0x926d62,treesColor:[0x786a43,0x766b49,0x666147]}
};
export function regionalEvent(base,region){
 const settings=regions[region];
 return {...base,region,seed:(base.seed^Math.imul(Object.keys(regions).indexOf(region)+1,0x9e3779b1))>>>0,length:settings.length,name:settings.name};
}
export function stageSettings(values={}){
 const settings={};
 for(const [key,max] of [['curves',10],['obstacles',50]]){
  const value=values[key];
  if((typeof value==='number'||typeof value==='string')&&/^\d+$/.test(String(value))&&Number(value)<=max)settings[key]=Number(value);
 }
 for(const [key,choices] of [
  ['terrain',Object.keys(regions)],['season',['spring','summer','autumn','winter']],
  ['light',['clear','sunset','night']],['weather',['clear','rain','snow','mist']]
 ]){
  if(choices.includes(values[key]))settings[key]=values[key];
 }
 return settings;
}
export function configuredStage(base,values){
 const {terrain,curves,obstacles,season,light,weather}=stageSettings(values);
 const event=terrain?regionalEvent(base,terrain):{...base};
 if(curves!==undefined)event.curves=curves;
 if(obstacles!==undefined)event.obstacles=obstacles;
 return {event,options:{season,light,weather:weather??(season==='winter'?'snow':season?'clear':undefined)}};
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const cubic=(a,b,c,d,t)=>b+.5*t*((c-a)+t*((2*a-5*b+4*c-d)+t*(3*(b-c)+d-a)));
export function makeCourse(event){
 const region=Object.hasOwn(regions,event.region)?regions[event.region]:null;
 const random=mulberry32(event.seed^0x2ba57489);
 const span=region?16:32, count=event.length/span;
 const crossing=(Math.floor(count*.53))*span;
 const valleyHalf=event.region==='himachal'?16:event.region==='northeast'?12:6;
 const gap=region&&!region.river?[event.length+500,event.length+512]:[crossing-valleyHalf,crossing+valleyHalf];
 const range=25+random()*20;
 const controls=Array.from({length:count+1},(_,i)=>({
  x:i===0?0:(random()-.5)*2*range,
  y:5+random()*15
 }));
 controls[0]={x:0,y:5};
 controls[1]={x:(random()-.5)*8,y:6};
 for(let i=2;i<=count;i++){
  controls[i].x=clamp(controls[i].x,controls[i-1].x-33,controls[i-1].x+33);
  controls[i].y=clamp(controls[i].y,controls[i-1].y-6,controls[i-1].y+6);
 }
 const bank=Math.floor(crossing/span);
 const bridge=Boolean(region?.river);
 const islandX=controls[bank].x;
 for(let i=bank-1;i<=bank+1;i++)controls[i]={x:islandX+(i-bank)*3,y:8+(i-bank)*.35};
 for(const i of [bank-2,bank+2]){
  const neighbor=controls[i+(i<bank?1:-1)];
  controls[i].x=clamp(controls[i].x,neighbor.x-30,neighbor.x+30);
  controls[i].y=clamp(controls[i].y,neighbor.y-6,neighbor.y+6);
 }
 controls[count].y=8;
 controls[count-1].y=9;
 controls[count].x=controls[count-1].x+(random()-.5)*12;
 if(region){
  const mountain=event.region==='himachal'||event.region==='ladakh';
  for(let i=0;i<=count;i++){
   const phase=i/count;
   const wave=[0,.7071,1,.7071,0,-.7071,-1,-.7071];
   const phaseOffset=Math.floor((event.seed>>>2)%4);
   const lane=wave[(i+phaseOffset)%wave.length];
   const peaks=mountain?(event.region==='himachal'?[0,.20,.78,1,.70,.43,.88,1,.71]:[0,.23,.49,.79,1,.94,1.28,1.43,1.62]):[];
   const t=phase*Math.max(0,peaks.length-1);
   const climb=mountain?lerp(peaks[Math.floor(t)],peaks[Math.min(peaks.length-1,Math.floor(t)+1)],t%1):0;
   const rise=region.base+region.grade*(.20+climb*(mountain?4.5:1)+(random()-.5)*(mountain?.45:.90));
   const amplitude=Math.max(20,region.bend)*(mountain?1.08:1);
   const lateral=amplitude*(lane*.94+(random()-.5)*.19);
   controls[i]={x:i===0?0:lateral,y:rise};
   if(i>0){
    controls[i].x=clamp(controls[i].x,controls[i-1].x-(mountain?25:20),controls[i-1].x+(mountain?25:20));
    controls[i].y=clamp(controls[i].y,controls[i-1].y-(mountain?5.9:2.6),controls[i-1].y+(mountain?5.9:2.6));
   }
  }
  if(region.river){
   const crossingHeight=controls[bank].y;
   const crossingX=lerp(controls[bank-1].x,controls[bank+1].x,.45);
   for(let i=bank-1;i<=bank+1;i++){
    controls[i]={x:crossingX+(i-bank)*(mountain?3.2:1.6),y:crossingHeight+(i-bank)*(mountain?2.4:.23)};
   }
   controls[bank-1].x=clamp(controls[bank-1].x,controls[bank-2].x-29,controls[bank-2].x+29);
   controls[bank-1].y=clamp(controls[bank-1].y,controls[bank-2].y-9,controls[bank-2].y+9);
   controls[bank+2].y=clamp(controls[bank+2].y,controls[bank+1].y-9,controls[bank+1].y+9);
   controls[bank+2].x=clamp(controls[bank+2].x,controls[bank+1].x-25,controls[bank+1].x+25);
  }
 }
 const rampsByRegion={plains:[110],kutch:[406],northeast:[114,400],thar:[106,226,418],himachal:[92,366],ladakh:[174,396]};
 const extras=region?[54,Math.round(event.length*.66/2)*2,event.length-54]:[];
 const rampCenters=[...(rampsByRegion[event.region]??[96,event.length-98]),...extras].filter(z=>Math.abs(z-gap[0])>24);
 if(Number.isInteger(event.curves)&&event.curves>=0&&event.curves<=10){
  const amplitude=Math.min(region?.bend??28,event.length/(Math.max(1,event.curves)*3));
  for(const [i,point] of controls.entries()){
   point.x=amplitude*Math.sin(Math.PI*event.curves*i/count);
  }
 }

 const at=z=>{
  const k=clamp(z/span,0,count),i=Math.min(count-1,Math.floor(k)),t=k-i;
  const a=controls[Math.max(0,i-1)],b=controls[i],c=controls[i+1],d=controls[Math.min(count,i+2)];
  return {x:cubic(a.x,b.x,c.x,d.x,t), y:cubic(a.y,b.y,c.y,d.y,t),z};
 };
 const boostRamps=region?rampCenters.filter(z=>Math.abs((at(z+6).x-at(z).x)-(at(z).x-at(z-6).x))<3.6).slice(0,2):[];
 if(region&&!boostRamps.length&&rampCenters.length)boostRamps.push(rampCenters[0]);
 function unpoweredHeight(z){
  const base=at(z).y;
  const bankDistance=Math.min(Math.abs(z-gap[0]),Math.abs(z-gap[1]));
  const bankRamp=1.15*ease(clamp(1-bankDistance/10,0,1));
  let ramp=0;
  for(const center of rampCenters){
   if(!boostRamps.includes(center))ramp=Math.max(ramp,1.45*ease(clamp(1-Math.abs(z-center)/10,0,1)));
  }
  return base+bankRamp+ramp;
 }
 const launchProfiles=boostRamps.map(end=>{
  const start=end-12,foot=unpoweredHeight(start);
  return {start,end,foot,lip:Math.max(foot+2.65,unpoweredHeight(end)+1.6)};
 });
 function roadHeight(z){
  const ramp=launchProfiles.find(profile=>z>=profile.start&&z<=profile.end);
  return ramp?lerp(ramp.foot,ramp.lip,(z-ramp.start)/(ramp.end-ramp.start)):unpoweredHeight(z);
 }
 const bridgePlanks=[];
 if(bridge){
  for(let z=gap[0]+1;z<gap[1];z+=2){
   const x=at(z).x,dx=at(z+1).x-at(z-1).x;
   const length=Math.sqrt(dx*dx+4);
   const qw=Math.sqrt((1+2/length)*.5),qy=dx/(2*length*qw);
   bridgePlanks.push({x,y:roadHeight(z),z,length,qy,qw});
  }
 }
 const shortcuts=[];
 if(region){
  for(const [a,b] of [[36,104],[132,192],[event.length-166,event.length-96]]){
   if(a<gap[1]+5&&b>gap[0]-5)continue;
   const first=at(a),last=at(b);
   if(Math.max(...Array.from({length:9},(_,i)=>{
    const t=i/8;
    return Math.abs(at(lerp(a,b,t)).x-lerp(first.x,last.x,t));
   }))<3)continue;
   shortcuts.push({a,b,rampZ:Math.round((a+(b-a)*.57)/2)*2,x0:first.x,x1:last.x,y0:roadHeight(a),y1:roadHeight(b)});
  }
 }
 function shortcutAt(z){
  const link=shortcuts.find(path=>z>=path.a&&z<=path.b);
  if(!link)return null;
  const t=(z-link.a)/(link.b-link.a);
  return {x:lerp(link.x0,link.x1,t),y:lerp(link.y0,link.y1,t),strength:ease(clamp(Math.min(t,1-t)*7,0,1))};
 }
 const grid=region?{x:-148,z:-36,step:2,nx:149,nz:(event.length+72)/2+1}:{x:-108,z:-28,step:2,nx:109,nz:(event.length+56)/2+1};
 const levels=new Float32Array(grid.nx*grid.nz);
 const vertices=new Float32Array(levels.length*3);
 const indices=[];
 const facets=new Float32Array(levels.length);
 const rough=mulberry32(event.seed^0x84753f12);
 for(let j=0;j<grid.nz;j++){
  const z=grid.z+j*grid.step,c=at(z),road=roadHeight(z);
  const half=36+8*(random()-.5)+7*(z/event.length);
  for(let i=0;i<grid.nx;i++){
   const x=grid.x+i*grid.step,index=j*grid.nx+i,d=Math.abs(x-c.x);
   const ledge=baseLedge(x,z,event.seed);
   const verge=ease(clamp((d-5.8)/5.8,0,1));
   const edge=Math.max(0,d-half)+Math.max(0,-z-15,z-event.length-15);
   let height=lerp(road,c.y-.35+ledge*3.3,verge)-1.38*edge;
   if(region){
    const far=ease(clamp((d-22)/40,0,1));
    const dune=event.region==='thar'?Math.abs(baseLedge(x+16,z*.65,event.seed))*7:0;
    const ridge=event.region==='himachal'||event.region==='ladakh'?far*(9+Math.abs(ledge)*region.rough*1.7):0;
    const terrace=event.region==='northeast'?Math.floor((c.y+far*5+ledge*2)/2.4)*2.4:region.base+ledge*region.rough+dune+ridge;
    const roam=event.region==='himachal'||event.region==='ladakh'?lerp(c.y,Math.max(.5,terrace),far):Math.max(.5,terrace);
    const shoulder=ease(clamp((d-5.8)/16,0,1));
    height=lerp(road,roam,shoulder);
    const headland=Math.min(1,Math.max(0,Math.min(z+25,event.length+25-z)/62));
    const coastCenter=c.x*.32;
    const tidalCurve=baseLedge(19,z*.56,event.seed^0x35fe79);
    const halfWidth=Math.max(Math.abs(c.x-coastCenter)+15,42+30*headland+tidalCurve*10);
    const coast=Math.max(0,Math.abs(x-coastCenter)-halfWidth);
    const endCoast=Math.max(0,-z-16,z-event.length-16);
    height-=coast*1.65+endCoast*2.6;
    if(coast>25||endCoast>16)height=Math.min(height,-3);

   }
   const shortcut=shortcutAt(z);
   if(shortcut){
    const distance=Math.abs(x-shortcut.x);
    const blend=shortcut.strength*ease(clamp((6.1-distance)/3.35,0,1))*ease(clamp((d-4.3)/3.5,0,1));
    height=lerp(height,shortcut.y,blend);
   }
   const deepValley=region?.river&&(event.region==='himachal'||event.region==='northeast');
   if(deepValley&&d>6){
    const bankDistance=Math.min(Math.abs(z-gap[0]),Math.abs(z-gap[1]));
    const cut=ease(clamp(1-bankDistance/21,0,1))*ease(clamp((d-6)/12,0,1));
    height=lerp(height,-4,cut*.82);
   }
   if(z>gap[0]&&z<gap[1])height=deepValley?-13:-3;
   levels[index]=Math.max(deepValley?-14:-4,height);
   vertices.set([x,levels[index],z],index*3);
   facets[index]=rough();
   if(i<grid.nx-1&&j<grid.nz-1){
    const a=index,b=index+1,c=index+grid.nx,d=c+1;
    indices.push(a,c,b,b,c,d);
   }
  }
 }
 function heightAt(x,z){
  if(region&&(x<grid.x||x>grid.x+(grid.nx-1)*2||z<grid.z||z>grid.z+(grid.nz-1)*2))return -4;
  const gx=clamp((x-grid.x)/2,0,grid.nx-1.00001),gz=clamp((z-grid.z)/2,0,grid.nz-1.00001);
  const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz,a=iz*grid.nx+ix,b=a+1,c=a+grid.nx,d=c+1;
  return u+v<=1?levels[a]*(1-u-v)+levels[b]*u+levels[c]*v:levels[d]*(u+v-1)+levels[b]*(1-v)+levels[c]*(1-u);
 }
 const route=[];
 for(let z=0;z<=event.length;z+=2){
  const p=at(z);
  route.push({x:p.x,y:roadHeight(z),z});
 }
 const buildings=[];
 for(const [i,fraction] of [.085,.30,.74,.925].entries()){
  const z=Math.round(event.length*fraction/2)*2,side=i%2?1:-1;
  if(z>gap[0]-17&&z<gap[1]+17)continue;
  const x=at(z).x+side*(13+random()*2),y=heightAt(x,z);
  const alternate=shortcutAt(z);
  if(y<1.5||alternate&&Math.abs(x-alternate.x)<7)continue;
  buildings.push({x,y,z,w:4.1+random()*2,d:4.3+random()*2,h:(region?4.8:2.6)+random()*(region?2.4:1.1),side,tone:i%3});
 }
 const props=[];
 const obstacleTarget=event.obstacles??Infinity;
 for(let i=0;i<(event.obstacles===undefined?430:20000)&&props.length<obstacleTarget;i++){
  const z=-16+random()*(event.length+32),x=at(z).x+(random()-.5)*114;
  const shortcut=shortcutAt(z);
  if(shortcut&&Math.abs(x-shortcut.x)<5.8)continue;
  if(Math.abs(x-at(z).x)<10.8||Math.min(Math.abs(z),Math.abs(z-event.length))<5)continue;
  const y=heightAt(x,z);
  if(y<1.1||buildings.some(b=>Math.abs(b.x-x)<b.w*.5+3&&Math.abs(b.z-z)<b.d*.5+3)||props.some(p=>(p.x-x)**2+(p.z-z)**2<10))continue;
  const scale=.75+random()*1.45;
  const vegetation=random();
  if(region&&event.region==='kutch'&&vegetation>.15)continue;
  if(region&&Math.abs(x-at(z).x)<30&&vegetation>.39)continue;
  props.push({x,y,z,scale,tree:region?vegetation<region.trees:vegetation>.28,tone:Math.floor(random()*3)});
 }
 const checkpoints=route.filter((p,i)=>i%12===0&&(p.z<gap[0]-5||p.z>gap[1]+6));
 const a=route[0],b=route[2], dx=b.x-a.x,dz=b.z-a.z;
 const len=Math.sqrt(dx*dx+dz*dz),w=Math.sqrt((1+dz/len)/2);
 return {event,region,route,props,buildings,gap,bridge,bridgePlanks,shortcuts,shortcutAt,rampCenters,boostRamps,launchProfiles,grid,vertices,indices:Uint32Array.from(indices),facets,at,roadHeight,heightAt,checkpoints,spawn:{x:a.x,y:a.y+1.05,z:a.z,qy:dx/(2*len*w),qw:w}};
}
function baseLedge(x,z,seed){
 const point=(i,j)=>{
  let n=Math.imul(i,374761393)^Math.imul(j,668265263)^seed;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/2147483648-1;
 };
 const px=x/11,pz=z/13,ix=Math.floor(px),iz=Math.floor(pz);
 const u=ease(px-ix),v=ease(pz-iz);
 return lerp(lerp(point(ix,iz),point(ix+1,iz),u),lerp(point(ix,iz+1),point(ix+1,iz+1),u),v);
}

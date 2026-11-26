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
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const cubic=(a,b,c,d,t)=>b+.5*t*((c-a)+t*((2*a-5*b+4*c-d)+t*(3*(b-c)+d-a)));
export function makeCourse(event){
 const random=mulberry32(event.seed^0x2ba57489);
 const span=32, count=event.length/span;
 const crossing=(Math.floor(count*.53))*span;
 const gap=[crossing-6,crossing+6];
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
 const rampCenters=[96,event.length-98].filter(z=>Math.abs(z-crossing)>32);
 const at=z=>{
  const k=clamp(z/span,0,count),i=Math.min(count-1,Math.floor(k)),t=k-i;
  const a=controls[Math.max(0,i-1)],b=controls[i],c=controls[i+1],d=controls[Math.min(count,i+2)];
  return {x:cubic(a.x,b.x,c.x,d.x,t), y:cubic(a.y,b.y,c.y,d.y,t),z};
 };
 function roadHeight(z){
  const base=at(z).y;
  const bankDistance=Math.min(Math.abs(z-gap[0]),Math.abs(z-gap[1]));
  const bankRamp=1.15*ease(clamp(1-bankDistance/10,0,1));
  let ramp=0;
  for(const center of rampCenters)ramp=Math.max(ramp,1.45*ease(clamp(1-Math.abs(z-center)/10,0,1)));
  return base+bankRamp+ramp;
 }
 const grid={x:-108,z:-28,step:2,nx:109,nz:(event.length+56)/2+1};
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
   if(z>gap[0]&&z<gap[1])height=-3;
   levels[index]=Math.max(-4,height);
   vertices.set([x,levels[index],z],index*3);
   facets[index]=rough();
   if(i<grid.nx-1&&j<grid.nz-1){
    const a=index,b=index+1,c=index+grid.nx,d=c+1;
    indices.push(a,c,b,b,c,d);
   }
  }
 }
 function heightAt(x,z){
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
  if(y<1.5)continue;
  buildings.push({x,y,z,w:4.1+random()*2,d:4.3+random()*2,h:2.6+random()*1.1,side,tone:i%3});
 }
 const props=[];
 for(let i=0;i<430;i++){
  const z=-16+random()*(event.length+32),x=at(z).x+(random()-.5)*114;
  if(Math.abs(x-at(z).x)<10.8||Math.min(Math.abs(z),Math.abs(z-event.length))<5)continue;
  const y=heightAt(x,z);
  if(y<1.1||buildings.some(b=>Math.abs(b.x-x)<b.w*.5+3&&Math.abs(b.z-z)<b.d*.5+3)||props.some(p=>(p.x-x)**2+(p.z-z)**2<10))continue;
  const scale=.75+random()*1.45;
  props.push({x,y,z,scale,tree:random()>.28,tone:Math.floor(random()*3)});
 }
 const checkpoints=route.filter((p,i)=>i%12===0&&(p.z<gap[0]-5||p.z>gap[1]+6));
 const a=route[0],b=route[2], dx=b.x-a.x,dz=b.z-a.z;
 const len=Math.sqrt(dx*dx+dz*dz),w=Math.sqrt((1+dz/len)/2);
 return {event,route,props,buildings,gap,rampCenters,grid,vertices,indices:Uint32Array.from(indices),facets,at,roadHeight,heightAt,checkpoints,spawn:{x:a.x,y:a.y+1.05,z:a.z,qy:dx/(2*len*w),qw:w}};
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

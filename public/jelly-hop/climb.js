export const STEP=1/60;
export const TILE=105;
export const WORLD_WIDTH=570;
export const MAX_TICKS=108000;
export const MAX_INPUT_SIZE=30000;
const RADIUS=17;
const HALF_WIDTH=15;
export const platformDepth=platform=>platform.id==='floor'?42:13;
const GRAVITY=1040;
export const climbSeed=day=>(Math.imul(day,0x85ebca6b)^0x27d4eb2f)>>>0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function randomRow(seed,row){
 let n=(seed^Math.imul(row,0x9e3779b1))>>>0;
 return ()=>{
  n=(Math.imul(n,1664525)+1013904223)>>>0;
  return n/4294967296;
 };
}
export function platformsFor(seed,row,tick){
 if(row===0)return [{id:'floor',x:0,y:0,w:WORLD_WIDTH,type:'stone'}];
 const rng=randomRow(seed,row);
 const y=-row*TILE;
 const onLeft=row%2===0;
 const centerX=(onLeft?140:430)+(rng()-.5)*95;
 const side=onLeft?440:130;
 const width=76+Math.round(rng()*43);
 const roll=rng();
 const type=row<4?'stone':row%13===0?'spikes':roll<.28?'moving':roll<.42?'crumble':roll<.48?'spring':'stone';
 const moving=type==='moving'?Math.sin(tick*STEP*1.25+row)*35:0;
 const branchX=clamp(side+(rng()-.5)*110,56,WORLD_WIDTH-56);
 return [
  {id:row+'a',x:clamp(centerX-width*.5+moving,10,WORLD_WIDTH-width-10),y,w:width,type},
  {id:row+'b',x:branchX-46,y:y-33,w:92,type:row%8===0?'spring':'stone'},
  ...(row%6===0?[{id:row+'c',x:WORLD_WIDTH*.5-36,y:y+31,w:72,type:'crumble'}]:[])
 ];
}
export function createClimb(seed){
 return {seed,x:WORLD_WIDTH*.5,y:-RADIUS,vx:0,vy:0,ticks:0,height:0,standing:'floor',broken:new Map(),landed:false};
}
export function launchVector(angle,power){
 const speed=260+465*power/100;
 const radians=angle*Math.PI/180;
 return {vx:Math.sin(radians)*speed,vy:-Math.cos(radians)*speed};
}
export function stepClimb(run,launch){
 run.ticks++;
 run.landed=false;
 if(launch&&run.standing){
  const {vx,vy}=launchVector(...launch);
  run.vx=vx;run.vy=vy;run.standing=null;
 }
 const row=Math.max(0,Math.floor(-run.y/TILE));
 const platforms=[];
 for(let i=Math.max(0,row-1);i<=row+2;i++)platforms.push(...platformsFor(run.seed,i,run.ticks));
 if(run.standing){
  const standing=platforms.find(p=>p.id===run.standing);
  if(standing&&(run.broken.get(standing.id)??Infinity)>run.ticks){
   if(standing.type==='moving'){
    const prior=platformsFor(run.seed,Number.parseInt(standing.id,10),run.ticks-1).find(p=>p.id===standing.id);
    run.x+=standing.x-prior.x;
   }
   const nextX=run.x+run.vx*STEP;
   if(nextX>=standing.x&&nextX<=standing.x+standing.w){
    run.x=nextX;
    run.vx*=Math.exp(-STEP*5.4);
    return;
   }
   run.y=standing.y-RADIUS+.001;
  }
  run.standing=null;
 }
 const solid=platforms.filter(p=>(run.broken.get(p.id)??Infinity)>run.ticks);
 const previousX=run.x,previousY=run.y;
 run.vy+=GRAVITY*STEP;
 run.x+=run.vx*STEP;
 for(const p of solid){
  if(previousY+RADIUS<=p.y||previousY-RADIUS>=p.y+platformDepth(p))continue;
  if(run.vx>0&&previousX+HALF_WIDTH<=p.x&&run.x+HALF_WIDTH>p.x){
   run.x=p.x-HALF_WIDTH;run.vx*=-.42;
  }else if(run.vx<0&&previousX-HALF_WIDTH>=p.x+p.w&&run.x-HALF_WIDTH<p.x+p.w){
   run.x=p.x+p.w+HALF_WIDTH;run.vx*=-.42;
  }
 }
 if(run.x<HALF_WIDTH||run.x>WORLD_WIDTH-HALF_WIDTH){
  run.x=clamp(run.x,HALF_WIDTH,WORLD_WIDTH-HALF_WIDTH);
  run.vx*=-.42;
 }
 run.y+=run.vy*STEP;
 let contact,hitLine;
 for(const p of solid){
  if(run.x+HALF_WIDTH<=p.x||run.x-HALF_WIDTH>=p.x+p.w)continue;
  if(run.vy>=0){
   if(previousY+RADIUS>p.y||run.y+RADIUS<p.y)continue;
   if(hitLine===undefined||p.y<hitLine){contact=p;hitLine=p.y;}
  }else{
   const bottom=p.y+platformDepth(p);
   if(previousY-RADIUS<bottom||run.y-RADIUS>bottom)continue;
   if(hitLine===undefined||bottom>hitLine){contact=p;hitLine=bottom;}
  }
 }
 if(contact&&run.vy<0){
  run.y=hitLine+RADIUS;
  run.vy=Math.max(55,-run.vy*.19);
 }else if(contact){
  run.y=hitLine-RADIUS;
  run.landed=true;
  if(contact.type==='spring'){run.vy=-750;run.vx*=.73;}
  else if(contact.type==='spikes'){run.y=hitLine+platformDepth(contact)+RADIUS+.01;run.vy=65;run.vx*=.6;}
  else{
   run.standing=contact.id;run.vx*=.78;run.vy=0;
   if(contact.type==='crumble')run.broken.set(contact.id,run.ticks+54);
  }
 }
 run.height=Math.max(run.height,Math.floor((-run.y-RADIUS)/10));
}
export function verifyClimb(seed,inputs){
 if(typeof inputs!=='string'||inputs.length>MAX_INPUT_SIZE)return null;
 let path;
 try{path=JSON.parse(inputs);}catch{return null;}
 if(!Array.isArray(path)||path.length!==2)return null;
 const [ticks,moves]=path;
 if(!Number.isInteger(ticks)||ticks<1||ticks>MAX_TICKS||!Array.isArray(moves)||moves.length>1800)return null;
 let last=-1;
 for(const move of moves){
  if(!Array.isArray(move)||move.length!==3||!move.every(Number.isInteger))return null;
  const [t,angle,power]=move;
  if(t<=last||t>=ticks||angle< -85||angle>85||power<1||power>100)return null;
  last=t;
 }
 const flight=createClimb(seed);
 let i=0;
 while(flight.ticks<ticks){
  const launch=moves[i]?.[0]===flight.ticks?moves[i++].slice(1):null;
  if(launch&&!flight.standing)return null;
  stepClimb(flight,launch);
 }
 return flight.height;
}

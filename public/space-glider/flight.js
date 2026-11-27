export const STEP=1/60;
export const MAX_TICKS=36000;
export const BLOCK_WIDTH=24;
export const BLOCK_DEPTH=29;
export const flightDay=(now=Date.now())=>Math.floor(now/86400000);
export const flightSeed=day=>(Math.imul(day,0x9e3779b1)^0x45c7ab83)>>>0;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const smooth=value=>value*value*(3-2*value);
const acceleration=1-Math.exp(-STEP*2);
const steering=1-Math.exp(-STEP*12);
const solidOffsets=[-10,2,-6,6,-2,10];
const noseHalfWidth=.30;

export function gliderBlock(seed,column,row){
 let state=(seed^Math.imul(column,0x9e3779b1)^Math.imul(row,0x85ebca6b))>>>0;
 const rng=(low,high)=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return low+(high-low)*state/4294967296;
 };
 const center=column*BLOCK_WIDTH,ahead=row*BLOCK_DEPTH;
 const obstacles=[],pickups=[];
 const add=(dx,dz,width,depth,height,kind,fragile=false)=>{
  obstacles.push({x:center+dx,forward:ahead-dz,halfWidth:width*.5,halfDepth:depth*.5,height,kind,fragile,
   material:Math.floor(rng(0,4)),edge:Math.floor(rng(0,3))});
 };
 const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
 const empty=Math.floor(rng(0,4));
 for(const [i,[side,depthSide]] of corners.entries()){
  if(i===empty||row<5&&i===(empty+2)%4)continue;
  const dx=side*rng(6.1,8.2),dz=depthSide*rng(6.2,10);
  if(ahead-dz<28&&Math.abs(center+dx)<7.2)continue;
  add(dx,dz,rng(2.5,4.8),rng(2.6,5),rng(3.5,14),Math.floor(rng(0,4)),(i+row+column)%4===0);
 }
 if(row>=2){
  // Every six blocks cover the width, one obstacle at a time, leaving side routes open.
  const phase=row-2+column,slot=(phase%solidOffsets.length+solidOffsets.length)%solidOffsets.length;
  const dx=solidOffsets[slot];
  add(row===2&&column===0?0:dx,rng(-1.8,1.8),rng(4.8,5.3),rng(2.6,4.5),rng(4.5,9),Math.floor(rng(0,4)));
 }
 if(row>=1&&row%16<4&&rng(0,1)<.85){
  const x=center+rng(-4,4),forward=ahead+rng(-6,6);
  if(!obstacles.some(item=>Math.hypot(item.x-x,item.forward-forward)<4.8)){
   pickups.push({x,forward,kind:rng(0,1)<.53?'shield':'slow'});
  }
 }
 return {column,row,obstacles,pickups};
}

export function createFlight(seed){
 return {seed,x:0,velocity:0,distance:0,speed:15,lives:0,slow:0,ticks:0,done:false,blocks:new Map()};
}
function flightBlock(run,column,row){
 const key=column+':'+row;
 let block=run.blocks.get(key);
 if(!block){
  block=gliderBlock(run.seed,column,row);
  run.blocks.set(key,block);
 }
 return block;
}

// Both the client and the score verifier advance exactly one tick at a time.
export function stepFlight(run,direction){
 if(run.done)return;
 run.ticks++;
 run.hit=null;
 run.picked=null;
 run.slow=Math.max(0,run.slow-STEP);
 const cruise=15+15*smooth(clamp((run.distance-80)/840,0,1));
 run.speed+=(cruise*(run.slow>0?.66:1)-run.speed)*acceleration;
 run.velocity+=(direction*12-run.velocity)*steering;
 run.x+=run.velocity*STEP;
 const before=run.distance;
 run.distance+=run.speed*STEP;
 const column=Math.round(run.x/BLOCK_WIDTH),row=Math.round(run.distance/BLOCK_DEPTH);
 for(const [key,block] of run.blocks)if(block.row<row-1)run.blocks.delete(key);
 for(let r=row-1;r<=row+1;r++){
  for(let c=column-1;c<=column+1;c++){
   const block=flightBlock(run,c,r);
   for(const pickup of block.pickups){
    if(pickup.used||Math.abs(run.distance-pickup.forward)>=1.5||Math.abs(run.x-pickup.x)>=1.15)continue;
    pickup.used=true;
    run.picked=pickup.kind;
    if(pickup.kind==='shield')run.lives=1;
    else run.slow=5;
   }
   for(const item of block.obstacles){
    if(item.passed||before>item.forward+item.halfDepth||run.distance<item.forward-item.halfDepth||
       Math.abs(run.x-item.x)>=item.halfWidth+noseHalfWidth)continue;
    if(!item.fragile&&!run.lives){run.done=true;return;}
    if(!item.fragile)run.lives=0;
    run.hit=item;
    item.passed=true;
   }
  }
 }
 if(run.ticks>=MAX_TICKS)run.done=true;
}
export function verifyFlight(seed,inputs){
 if(typeof inputs!=='string'||inputs.length>MAX_TICKS||!/^[012]+$/.test(inputs))return null;
 const run=createFlight(seed);
 for(let i=0;i<inputs.length;i++){
  stepFlight(run,Number(inputs[i])-1);
  if(run.done)return i===inputs.length-1?Math.floor(run.distance):null;
 }
 return null;
}

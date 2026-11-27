import {makeAudio} from '/audio.js';
import {STEP,TILE,WORLD_WIDTH,MAX_TICKS,MAX_INPUT_SIZE,climbSeed,platformDepth,platformsFor,createClimb,launchVector,stepClimb} from './climb.js';

const el=id=>document.getElementById(id);
const canvas=el('game'),ctx=canvas.getContext('2d');
const play=el('play'),panel=el('panel'),notice=el('notice'),save=el('save'),pilot=el('pilot');
const board=el('leaderboard'),boardButton=el('board');
const music=makeAudio(el('sound'));
play.addEventListener('click',()=>music.start());
const day=Math.floor(Date.now()/86400000);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const ease=(value,target,rate,dt)=>value+(target-value)*(1-Math.exp(-rate*dt));
let daily={day,seed:climbSeed(day),scores:[],ghost:null};
let run=createClimb(daily.seed),ghost=null,moves=[],ghostMoves=[],ghostIndex=0,ghostLimit=0;
let playing=false,aim=null,queued=null,keys=0,clock=0,frameAt=0,accumulator=0;
let width=0,height=0,ratio=1,scale=1,offsetX=0,cameraX=0,cameraY=-480,squash=0,noticeUntil=0;
let driverId,record=null,saving=false,lastSaveAt=0,knownHeight=0;
try{
 driverId=localStorage.getItem('rapier-driver')??crypto.randomUUID();
 localStorage.setItem('rapier-driver',driverId);
 pilot.value=localStorage.getItem('jelly-pilot')??localStorage.getItem('rapier-name')??'Jelly';
}catch{}
function resize(){
 width=canvas.clientWidth;height=canvas.clientHeight;
 ratio=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 scale=Math.min(width/(WORLD_WIDTH+22),height/455,1.55);
 offsetX=(width-WORLD_WIDTH*scale)*.5;
}
addEventListener('resize',resize);
resize();
function message(text){notice.textContent=text;noticeUntil=clock+3.4;}
function drawBoard(){
 el('scores').replaceChildren(...daily.scores.map(({name,distance},index)=>{
  const row=document.createElement('li');
  if(index+1===daily.rank)row.className='current';
  const height=document.createElement('strong');height.textContent=distance+' m';
  row.append(name,height);
  return row;
 }));
 if(!daily.scores.length){
  const empty=document.createElement('li');empty.textContent='No climbs yet today.';el('scores').append(empty);
 }
}
function showBoard(open){
 board.hidden=!open;
 boardButton.setAttribute('aria-expanded',String(open));
 if(open)drawBoard();
}
boardButton.onclick=()=>showBoard(board.hidden);
el('closeBoard').onclick=()=>showBoard(false);
async function load(){
 try{
  const query=new URLSearchParams(driverId?{driver:driverId}:{});
  const response=await fetch('/api/jelly?'+query,{signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error();
  daily=await response.json();
  knownHeight=daily.rank?daily.scores[daily.rank-1]?.distance??0:0;
 }catch{message('Leaderboard unavailable. You can still climb.');}
 run=createClimb(daily.seed);
 play.disabled=false;
}
function start(){
 run=createClimb(daily.seed);moves=[];queued=aim=null;keys=0;accumulator=0;squash=0;record=null;
 cameraX=0;cameraY=-height/scale*.72;
 ghost=null;ghostIndex=0;
 if(el('mode').value==='ghost'){
  try{
   [ghostLimit,ghostMoves]=JSON.parse(daily.ghost.inputs);
   ghost=createClimb(daily.seed);
   message('Ghost: '+daily.ghost.name);
  }catch{message('No ghost saved for today yet.');}
 }else message('Pull down and away from your next ledge, then release.');
 panel.hidden=true;save.hidden=false;el('restart').hidden=false;showBoard(false);
 playing=true;play.blur();
}
play.onclick=start;
el('restart').onclick=()=>{
 playing=false;aim=queued=null;
 panel.hidden=false;save.hidden=true;el('restart').hidden=true;
 play.textContent='Climb again';
 void saveHeight(false);
};
function dragLaunch(){
 if(!aim)return null;
 const dx=aim.startX-aim.x,dy=aim.y-aim.startY;
 const strength=Math.hypot(dx,dy);
 if(strength<7||dy<0)return null;
 return [Math.round(clamp(Math.atan2(dx,dy)*180/Math.PI,-85,85)),
  Math.max(1,Math.round(Math.min(1,strength/Math.max(62,Math.min(width,height)*.25))*100))];
}
function updateAim(event){
 const bounds=canvas.getBoundingClientRect();
 aim.x=event.clientX-bounds.left;aim.y=event.clientY-bounds.top;
}
canvas.addEventListener('pointerdown',event=>{
 if(!playing||!run.standing||aim||event.button!==0)return;
 event.preventDefault();
 const bounds=canvas.getBoundingClientRect();
 const x=event.clientX-bounds.left,y=event.clientY-bounds.top;
 aim={id:event.pointerId,x,y,startX:x,startY:y};
 canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{if(aim?.id===event.pointerId)updateAim(event);});
canvas.addEventListener('pointerup',event=>{
 if(aim?.id!==event.pointerId)return;
 updateAim(event);queued=dragLaunch();aim=null;
});
for(const type of ['pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{
 if(aim?.id===event.pointerId)aim=null;
});
addEventListener('keydown',event=>{
 if(!playing)return;
 if(['ArrowLeft','KeyA','ArrowRight','KeyD','ArrowUp','Space'].includes(event.code))event.preventDefault();
 if(event.repeat)return;
 if(event.code==='ArrowLeft'||event.code==='KeyA')keys=-1;
 if(event.code==='ArrowRight'||event.code==='KeyD')keys=1;
 if((event.code==='Space'||event.code==='ArrowUp')&&run.standing&&!aim)queued=[keys*29,90];
});
addEventListener('keyup',event=>{
 if(keys===-1&&(event.code==='ArrowLeft'||event.code==='KeyA')||keys===1&&(event.code==='ArrowRight'||event.code==='KeyD'))keys=0;
});
addEventListener('blur',()=>{keys=0;aim=null;});
function advance(){
 const launch=run.standing&&!aim?queued:null;
 queued=null;
 if(launch){moves.push([run.ticks,...launch]);squash=-.24;}
 const previous=run.height;
 stepClimb(run,launch);
 if(aim&&!run.standing)aim=null;
 if(run.landed)squash=.25;
 if(run.height>previous&&run.ticks<=MAX_TICKS&&moves.length<=1800){
  record={height:run.height,ticks:run.ticks,moves:moves.length};
 }
 if(ghost&&ghost.ticks<ghostLimit){
  const action=ghostMoves[ghostIndex]?.[0]===ghost.ticks?ghostMoves[ghostIndex++].slice(1):null;
  stepClimb(ghost,action);
 }
 if(record&&record.height>knownHeight&&run.standing&&clock-lastSaveAt>12)void saveHeight(false);
}
async function saveHeight(manual){
 if(saving)return;
 if(!driverId||!record||record.height<=knownHeight){
  if(manual)message(record?'Best height already saved.':'Climb higher to save a score.');
  return;
 }
 const current=record;
 const inputs=JSON.stringify([current.ticks,moves.slice(0,current.moves)]);
 if(inputs.length>MAX_INPUT_SIZE){
  if(manual)message('This climb has reached the saved-replay limit.');
  return;
 }
 saving=true;lastSaveAt=clock;
 const name=pilot.value.trim()||'Jelly';
 try{localStorage.setItem('jelly-pilot',name);}catch{}
 try{
  const response=await fetch('/api/jelly',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({day:daily.day,id:driverId,name,inputs})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error);
  daily=result;
  knownHeight=Math.max(knownHeight,result.distance);
  if(manual)message(result.rank?'Saved '+result.distance+' m · rank #'+result.rank:'Saved '+result.distance+' m');
  if(!board.hidden)drawBoard();
 }catch(error){if(manual)message(error.message||'Could not save height.');}
 finally{saving=false;}
}
save.onclick=()=>void saveHeight(true);
function rect(x,y,w,h,r,color){
 ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();
}
const colors={stone:'#a5c884',moving:'#92d7eb',crumble:'#ebbc83',spring:'#eeb7eb',spikes:'#fa8ba8'};
function drawPlatform(p){
 const broken=run.broken.get(p.id);
 if(broken!==undefined&&broken<=run.ticks)return;
 const shake=broken!==undefined?Math.sin(run.ticks)*2:0;
 rect(p.x+shake,p.y,p.w,platformDepth(p),3,'#4e3b67');
 rect(p.x+shake,p.y,p.w,5,2,colors[p.type]);
 if(p.type==='spring'){
  for(let x=p.x+9;x<p.x+p.w-5;x+=9)rect(x,p.y-3,4,4,2,'#f7c2ff');
 }
 if(p.type==='spikes'){
  ctx.fillStyle=colors.spikes;ctx.beginPath();
  for(let x=p.x+2;x<p.x+p.w-7;x+=9){ctx.moveTo(x,p.y);ctx.lineTo(x+4,p.y-10);ctx.lineTo(x+8,p.y);ctx.closePath();}
  ctx.fill();
 }
}
function drawJelly(state,isGhost=false){
 ctx.save();
 if(isGhost)ctx.globalAlpha=.38;
 ctx.translate(state.x,state.y);
 const pulse=isGhost?0:squash+Math.sin(clock*14)*.035+(aim?.id!==undefined?.14:0);
 ctx.scale(1+pulse,1-pulse);
 ctx.fillStyle=isGhost?'#8cdef7':'#a1aeb5';
 ctx.strokeStyle=isGhost?'#d6eeff':'#596572';
 ctx.lineWidth=2.7;
 ctx.beginPath();
 ctx.moveTo(-13,-17);ctx.lineTo(11,-17);ctx.lineTo(16,-12);ctx.lineTo(16,12);
 ctx.lineTo(11,17);ctx.lineTo(-12,17);ctx.lineTo(-16,12);ctx.lineTo(-16,-12);
 ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=isGhost?'#a1e5f7':'#bdc9cc';
 ctx.beginPath();ctx.moveTo(-12,-14);ctx.lineTo(10,-14);ctx.lineTo(12,-9);ctx.lineTo(-11,-8);ctx.closePath();ctx.fill();
 for(const side of [-1,1]){
  const x=side*6,y=-2;
  const pupilX=x+Math.sign(state.vx)*.8+Math.sin(clock*13+side)*1.15;
  const pupilY=y+.4+Math.sin(clock*16+side)*1.05;
  ctx.fillStyle='#fff8ec';ctx.beginPath();ctx.ellipse(x,y,4.5,5.4,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(pupilX,pupilY,2,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
function frame(now){
 music.update(null,'preview',0);
 const dt=Math.min(.05,(now-(frameAt||now))/1000);frameAt=now;clock+=dt;
 if(playing){
  accumulator+=dt;
  while(accumulator>=STEP){accumulator-=STEP;advance();}
 }
 if(notice.textContent&&clock>noticeUntil)notice.textContent='';
 squash=ease(squash,0,9,dt);
 cameraX=ease(cameraX,run.x-clamp(run.x,25,WORLD_WIDTH-25),6,dt);
 cameraY=ease(cameraY,run.y-height/scale*.68,7,dt);
 el('stats').textContent='Height '+Math.max(0,Math.floor((-run.y-17)/10))+' m · Best '+Math.max(run.height,knownHeight)+' m';
 ctx.setTransform(ratio,0,0,ratio,0,0);
 const gradient=ctx.createLinearGradient(0,0,0,height);
 gradient.addColorStop(0,'#221937');gradient.addColorStop(1,'#664977');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(offsetX-cameraX*scale,-cameraY*scale);ctx.scale(scale,scale);
 const first=Math.max(0,Math.floor(-(cameraY+height/scale)/TILE));
 const last=Math.max(first,Math.ceil(-cameraY/TILE)+1);
 for(let row=first;row<=last;row++){
  for(const platform of platformsFor(run.seed,row,run.ticks))drawPlatform(platform);
 }
 const pull=dragLaunch();
 if(pull){
  const {vx,vy}=launchVector(...pull);
  ctx.fillStyle='#e4ffc0';
  for(let i=1;i<=16;i++){
   const time=i*.047;
   ctx.globalAlpha=1-i*.046;
   ctx.beginPath();ctx.arc(run.x+vx*time,run.y+vy*time+520*time*time,2.35,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
 }
 if(ghost)drawJelly(ghost,true);
 drawJelly(run);
 ctx.restore();
 if(aim){
  ctx.strokeStyle='#c1eeb0';ctx.lineWidth=1.7;
  ctx.beginPath();ctx.moveTo(aim.startX,aim.startY);ctx.lineTo(aim.x,aim.y);ctx.stroke();
 }
 requestAnimationFrame(frame);
}
void load();
requestAnimationFrame(frame);

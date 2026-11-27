import {WIDTH,HEIGHT,PICKUP_RADIUS,STEP,TABLE_COUNT,MAX_VERIFY_TICKS,utcDay,dailyTable,shoot,stepTable} from './physics.js';
import {makeAudio} from '/audio.js';
import {bindPlayerName,savePlayerName} from '/player-name.js';


const el=id=>document.getElementById(id);
const canvas=el('table'),ctx=canvas.getContext('2d');
const music=makeAudio(el('sound'));
const dialog=el('leaderboard'),player=el('player');
const day=utcDay();
let practiceTable=null;
const playedTables=new Set([day%TABLE_COUNT]);
const dateLabel=new Date(day*86400000).toISOString().slice(0,10)+' UTC';
let driver=crypto.randomUUID();
try{
 driver=localStorage.getItem('touch-red-driver')||driver;
 localStorage.setItem('touch-red-driver',driver);
}catch{}
bindPlayerName(player);

let table,mode,pointer,angle,speed,ticks,accumulator;
let previous=0,view,revision=0,boardRequest=0;
let strongestImpact=0,lastPlop=-Infinity;
const collectImpact=impact=>{strongestImpact=Math.max(strongestImpact,impact);};
function resize(){
 const ratio=Math.min(devicePixelRatio||1,2);
 const w=canvas.clientWidth,h=canvas.clientHeight;
 canvas.width=Math.round(w*ratio);
 canvas.height=Math.round(h*ratio);
 const rotated=h>w;
 const logicalWidth=rotated?HEIGHT:WIDTH,logicalHeight=rotated?WIDTH:HEIGHT;
 const scale=Math.max(.01,Math.min(w/logicalWidth,h/logicalHeight));
 view={ratio,rotated,scale,left:(w-logicalWidth*scale)/2,top:(h-logicalHeight*scale)/2};
}
new ResizeObserver(resize).observe(canvas);
resize();
function update(){
 el('hits').textContent=table.hits+' white hits';
}
function reset(){
 revision++;
 table=dailyTable(practiceTable??day);
 const practice=practiceTable!==null;
 el('puzzle').textContent=practice?'Random practice':dateLabel;
 el('daily-level').hidden=!practice;
 el('board').hidden=practice;
 el('random-level').textContent=practice?'New level':'Random level';
 const [cue,target]=table.balls;
 angle=Math.atan2(target.y-cue.y,target.x-cue.x);
 mode='aim';pointer=null;speed=510;ticks=0;accumulator=0;
 el('status').textContent='Pull back and release. Use as few white hits as possible.';
 el('reset').textContent='Reset shot';
 update();
}
function tablePoint(event){
 const bounds=canvas.getBoundingClientRect();
 const x=(event.clientX-bounds.left-view.left)/view.scale;
 const y=(event.clientY-bounds.top-view.top)/view.scale;
 return view.rotated?{x:y,y:HEIGHT-x}:{x,y};
}
function aim(event){
 const point=tablePoint(event);
 const dx=pointer.start.x-point.x,dy=pointer.start.y-point.y;
 const pull=Math.hypot(dx,dy);
 if(pull<8)return false;
 angle=Math.atan2(dy,dx);
 speed=Math.min(710,235+pull*3.3);
 return true;
}
function launch(){
 if(mode!=='aim')return;
 music.start();
 shoot(table,angle,speed);
 mode='shot';
 el('status').textContent='Shot in motion';
}
canvas.addEventListener('pointerdown',event=>{
 if(mode!=='aim'||pointer||event.button!==0)return;
 event.preventDefault();
 pointer={id:event.pointerId,start:tablePoint(event)};
 canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{if(event.pointerId===pointer?.id)aim(event);});
canvas.addEventListener('pointerup',event=>{
 if(event.pointerId!==pointer?.id)return;
 const ready=aim(event);
 pointer=null;
 if(ready)launch();
});
for(const type of ['pointercancel','lostpointercapture']){
 canvas.addEventListener(type,event=>{if(event.pointerId===pointer?.id)pointer=null;});
}
addEventListener('keydown',event=>{
 if(mode!=='aim'||dialog.open||event.target.matches('button,input,a'))return;
 if(event.code==='ArrowLeft'||event.code==='ArrowRight'){
  event.preventDefault();
  const turn=(event.code==='ArrowLeft'?-1:1)*(event.shiftKey?.006:.032);
  angle=(angle+turn)%(2*Math.PI);
 }else if(event.code==='ArrowUp'||event.code==='ArrowDown'){
  event.preventDefault();speed=Math.max(235,Math.min(710,speed+(event.code==='ArrowUp'?15:-15)));
 }else if(event.code==='Space'&&!event.repeat){event.preventDefault();launch();}
});
el('reset').onclick=reset;
el('random-level').onclick=()=>{
 if(playedTables.size===TABLE_COUNT){
  playedTables.clear();
  playedTables.add(day%TABLE_COUNT);
  if(practiceTable!==null)playedTables.add(practiceTable);
 }
 const available=Array.from({length:TABLE_COUNT},(_,index)=>index).filter(index=>!playedTables.has(index));
 practiceTable=available[Math.floor(Math.random()*available.length)];
 playedTables.add(practiceTable);
 reset();
};
el('daily-level').onclick=()=>{
 practiceTable=null;
 reset();
};
async function requestBoard(shot){
 const response=await fetch('/api/touch-red?driver='+encodeURIComponent(driver),shot?{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(shot)
 }:undefined);
 const data=await response.json();
 if(!response.ok)throw Error(data.error);
 if(data.day!==day)throw Error('A new UTC table is ready. Reload to play it.');
 return data;
}
function drawBoard({scores,rank}){
 el('scores').replaceChildren(...scores.map(({name,hits},index)=>{
  const row=document.createElement('li'),score=document.createElement('strong');
  score.textContent=hits+' white hits';
  row.append(name,score);
  if(index+1===rank)row.style.color='#ffb8b0';
  return row;
 }));
 el('board-status').textContent=scores.length?(rank?'Your rank today is #'+rank+'.':''):'No scores yet today.';
}
function showBoard(finished){
 el('finish').hidden=!finished;
 el('player-label').hidden=finished;
 el('board-status').textContent='Loading scores…';
 el('scores').replaceChildren();
 if(!dialog.open)dialog.showModal();
}
async function loadBoard(){
 const request=++boardRequest;
 try{
  const data=await requestBoard();
  if(request===boardRequest)drawBoard(data);
 }catch(error){if(request===boardRequest)el('board-status').textContent=error.message;}
}
el('board').onclick=()=>{
 showBoard(false);
 void loadBoard();
};
el('play-again').onclick=()=>{
 dialog.close();
 reset();
};
async function endShot(){
 mode='result';
 el('reset').textContent='Play again';
 const score=table.hits+' white '+(table.hits===1?'hit':'hits');
 el('status').textContent=score;
 if(practiceTable!==null){
  el('status').textContent='Congrats! '+score+'.';
  return;
 }
 el('finish-score').textContent=score;
 showBoard(true);
 if(ticks>MAX_VERIFY_TICKS){
  el('finish-status').textContent='Shots over 10 minutes are unranked.';
  await loadBoard();
  return;
 }
 const current=revision;
 const request=++boardRequest;
 el('finish-status').textContent='Saving score…';
 try{
  const data=await requestBoard({day,id:driver,name:savePlayerName(player.value)||'Player',angle,speed,ticks});
  if(request===boardRequest)drawBoard(data);
  if(current===revision)el('finish-status').textContent='Score verified.';
 }catch(error){
  if(current===revision)el('finish-status').textContent='Score not saved. '+error.message;
  if(request===boardRequest)await loadBoard();
 }
}
function render(){
 ctx.resetTransform();
 ctx.clearRect(0,0,canvas.width,canvas.height);
 const {ratio,rotated,scale,left,top}=view;
 const s=ratio*scale;
 if(rotated)ctx.setTransform(0,s,-s,0,(left+HEIGHT*scale)*ratio,top*ratio);
 else ctx.setTransform(s,0,0,s,left*ratio,top*ratio);
 ctx.save();
 ctx.beginPath();ctx.rect(0,0,WIDTH,HEIGHT);ctx.clip();
 ctx.fillStyle='#161f2d';ctx.fillRect(0,0,WIDTH,HEIGHT);
 ctx.strokeStyle='#253449';ctx.lineWidth=1;
 ctx.beginPath();
 for(let x=35;x<WIDTH;x+=35){ctx.moveTo(x,0);ctx.lineTo(x,HEIGHT);}
 for(let y=35;y<HEIGHT;y+=35){ctx.moveTo(0,y);ctx.lineTo(WIDTH,y);}
 ctx.stroke();
 ctx.strokeStyle="#8194aa";ctx.lineWidth=4;ctx.strokeRect(0,0,WIDTH,HEIGHT);
 for(const pickup of table.pickups){
  if(pickup.used)continue;
  ctx.save();
  ctx.translate(pickup.x,pickup.y);
  if(rotated)ctx.rotate(-Math.PI/2);
  const stopPickup=pickup.kind==='stop';
  const increase=pickup.factor>1;
  ctx.fillStyle=stopPickup?'#ffc83d':'#61de97';
  ctx.strokeStyle=stopPickup?'#fff2a6':'#bcffd8';
  ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(0,0,PICKUP_RADIUS,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#162a24';
  ctx.lineWidth=2.4;
  ctx.lineJoin='round';
  ctx.lineCap='round';
  ctx.beginPath();
  if(stopPickup){
   ctx.rect(-5,-5,10,10);
   ctx.fillStyle='#162a24';
   ctx.fill();
  }else{
   ctx.moveTo(-8,2);ctx.lineTo(-8,8);ctx.lineTo(-2,8);
   ctx.moveTo(-7,7);ctx.lineTo(7,-7);
   ctx.moveTo(2,-8);ctx.lineTo(8,-8);ctx.lineTo(8,-2);
   if(!increase){
    ctx.beginPath();
    ctx.moveTo(-8,-8);ctx.lineTo(-3,-3);
    ctx.moveTo(-8,-3);ctx.lineTo(-3,-3);ctx.lineTo(-3,-8);
    ctx.moveTo(8,8);ctx.lineTo(3,3);
    ctx.moveTo(8,3);ctx.lineTo(3,3);ctx.lineTo(3,8);
   }
  }
  ctx.stroke();
  ctx.restore();
 }
 const cue=table.balls[0];
 if(mode==='aim'){
  ctx.strokeStyle='#ffc4b9';ctx.lineWidth=2;
  ctx.setLineDash([5,6]);
  ctx.beginPath();ctx.moveTo(cue.x,cue.y);
  const length=Math.min(185,40+speed*.18);
  ctx.lineTo(cue.x+Math.cos(angle)*length,cue.y+Math.sin(angle)*length);ctx.stroke();
  ctx.setLineDash([]);
 }
 for(const [i,ball] of table.balls.entries()){
  ctx.fillStyle=i===0?'#ff514e':i===1?'#d92d3f':'#faf9f2';
  ctx.beginPath();ctx.arc(ball.x,ball.y,ball.radius,0,Math.PI*2);ctx.fill();
  if(i===0){
   ctx.strokeStyle='#ffd4ce';ctx.lineWidth=2.3;
   ctx.beginPath();ctx.arc(ball.x,ball.y,ball.radius+4,0,Math.PI*2);ctx.stroke();
  }else if(i===1){
   ctx.strokeStyle='#ffb4ac';ctx.lineWidth=1.6;
   ctx.beginPath();ctx.arc(ball.x,ball.y,4,0,Math.PI*2);ctx.stroke();
  }
 }
 ctx.restore();
}

function frame(now){
 const dt=Math.min(.25,(now-(previous||now))/1000);previous=now;
 music.update(null,'preview',0);
 if(mode==='shot'){
  strongestImpact=0;
  accumulator+=dt;
  while(accumulator>=STEP&&mode==='shot'){
   accumulator-=STEP;ticks++;
   const power=table.lastPower;
   stepTable(table,collectImpact);
   if(power!==table.lastPower)el('status').textContent=table.lastPower.kind==='stop'?table.lastPower.label:table.lastPower.label+' collected.';
   if(table.result==='clear')void endShot();
  }
  if(strongestImpact>=12&&now-lastPlop>=45){
   music.waterBead(strongestImpact);
   lastPlop=now;
  }
  update();
 }
 render();requestAnimationFrame(frame);
}
reset();
requestAnimationFrame(frame);

import {createHash} from 'node:crypto';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {DAY,eventFor,makeCourse,regionalEvent,regions,configuredStage} from './public/course.js';
import {normalizeCountry} from './public/countries.js';
import {ready,verify} from './public/race.js';

await ready;
const previewOffset=Number(process.env.RALLY_PREVIEW_OFFSET??0);
if(!Number.isInteger(previewOffset)||Math.abs(previewOffset)>365)throw Error('Invalid RALLY_PREVIEW_OFFSET');
const previewEvent=previewOffset?eventFor(Date.now()+DAY*previewOffset):null;
const cloud=!previewEvent&&process.env.FIREBASE_PROJECT_ID?await (await import('./firebase-scores.js')).firebaseScores():null;
const db=new URL(previewEvent?'./scores-regional-preview-v11.json':'./scores-rapier-v9.json',import.meta.url);
let scores={};
if(!cloud&&!process.env.VERCEL){
 try{scores=JSON.parse(await readFile(db,'utf8'));}
 catch(error){if(error.code!=='ENOENT')throw error;}
}
const mime={js:'text/javascript',html:'text/html',css:'text/css',ttf:'font/ttf'};
const assets=new Map(['/index.html','/style.css','/game.js','/course.js','/vehicle.js','/race.js','/audio.js','/countries.js','/rally-dust.ttf']
 .map(path=>[path,'public'+path]));
assets.set('/','public/index.html');
assets.set('/vendor/three.module.js','node_modules/three/build/three.module.js');
assets.set('/vendor/three.core.js','node_modules/three/build/three.core.js');
assets.set('/vendor/rapier.mjs','node_modules/@dimforge/rapier3d-compat/rapier.mjs');
let cachedCourse, writes=Promise.resolve();
const board=day=>Object.entries(scores[day]??{}).sort((a,b)=>a[1].ms-b[1].ms).slice(0,50);
const publicBoard=rankings=>rankings.map(({id,name,ms,country})=>({
 name,ms,country:normalizeCountry(country),driverKey:createHash('sha256').update(id).digest('hex')
}));
const rivalLimit=10;
const carIds=new Set(['expedition','hatch','coupe','buggy','truck']);
const normalizeCar=id=>carIds.has(id)?id:'expedition';
const publicReplay=({name,ms,inputs,country,car})=>({name,ms,inputs,country:normalizeCountry(country),car:normalizeCar(car)});
const localRankings=day=>board(day).map(([id,entry])=>({...entry,id}));
const snapshot=day=>cloud?cloud.snapshot(day,rivalLimit+1):
 {rankings:localRankings(day),runs:board(day).slice(0,rivalLimit+1)};
const ghost=({rankings,runs})=>{
 const leader=rankings[0];
 const replay=runs.find(([id,entry])=>id===leader?.id&&entry.ms===leader.ms)?.[1];
 return replay?.inputs?publicReplay({...replay,country:leader.country}):null;
};
async function save(day,id,name,ms,inputs,country,car){
 if(cloud)return cloud.save(day,id,name,ms,inputs,country,car);
 const operation=writes.then(async()=>{
  const previous=scores[day]??{};
  const prior=previous[id];
  const retainsTime=prior&&prior.ms<=ms;
  if(retainsTime&&(!country||country===prior.country))return;
  const entry=retainsTime?{...prior,country}:{name,ms,inputs,country:country??prior?.country??null,car};
  const top=Object.entries({...previous,[id]:entry}).sort((a,b)=>a[1].ms-b[1].ms).slice(0,50);
  if(!top.some(([key])=>key===id))return;
  const next={...scores,[day]:Object.fromEntries(top)};
  const temp=new URL(previewEvent?'./scores-regional-preview-v11.tmp':'./scores-rapier-v9.tmp',import.meta.url);
  await writeFile(temp,JSON.stringify(next));
  await rename(temp,db);
  scores=next;
 });
 writes=operation.catch(()=>{});
 return operation;
}
function json(res,status,payload){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
 res.end(JSON.stringify(payload));
}
export async function handleRequest(req,res,endpoint){
 try{
  const url=new URL(req.url,'http://localhost'),path=endpoint??url.pathname;
  if(req.method==='GET'&&assets.has(path)){
   const file=assets.get(path),vendor=path.startsWith('/vendor/');
   const data=await readFile(new URL('./'+file,import.meta.url));
   res.writeHead(200,{'Content-Type':(mime[file.split('.').at(-1)]??'text/javascript')+'; charset=utf-8',
    'Cache-Control':vendor?'public, max-age=86400':'no-cache'});
   return res.end(data);
  }
  if(process.env.VERCEL&&!cloud)return json(res,503,{error:'Leaderboard storage is not configured.'});
  const requested=url.searchParams.get('region');
  const region=Object.hasOwn(regions,requested)?requested:'plains';
  const base=previewEvent?regionalEvent(previewEvent,region):eventFor();
  const {event,options}=!previewEvent&&cloud?configuredStage(base,await cloud.schedule(base.day)??{}):{event:base};
  const boardKey=previewEvent?event.day+'-'+region:event.day;
  if(req.method==='GET'&&path==='/api/event'){
   const board=await snapshot(boardKey);
   return json(res,200,{event,options,preview:Boolean(previewEvent),scores:publicBoard(board.rankings),ghost:ghost(board)});
  }
  if(req.method==='GET'&&path==='/api/rivals'){
   const driver=url.searchParams.get('driver');
   const {runs}=await snapshot(boardKey);
   const rivals=runs.filter(([id,entry])=>id!==driver&&entry.inputs).slice(0,rivalLimit).map(([,entry])=>publicReplay(entry));
   return json(res,200,{day:event.day,rivals});
  }
  if(req.method==='POST'&&path==='/api/result'){
   let raw='';
   for await(const chunk of req){
    raw+=chunk;
    if(raw.length>17000)return json(res,413,{error:'Run payload too large.'});
   }
   let run;
   try{run=JSON.parse(raw);}catch{return json(res,400,{error:'Invalid run.'});}
   const {day,id,name,inputs}=run??{};
   if(day!==event.day)return json(res,409,{error:'The next daily stage is ready. Reload to race it.'});
   if(typeof name!=='string'||!name.trim()||name.length>20||typeof id!=='string'||
    !/^[a-f0-9-]{36}$/.test(id)||typeof inputs!=='string'||!/^[0-9a-zA-Z_-]{60,14400}$/.test(inputs)){
    return json(res,400,{error:'Invalid run or driver name.'});
   }
   if(!cachedCourse||JSON.stringify(cachedCourse.event)!==JSON.stringify(event))cachedCourse=makeCourse(event);
   const ms=verify(cachedCourse,inputs);
   if(ms===null)return json(res,422,{error:'The replay did not finish the stage.'});
   const car=normalizeCar(run.car);
   const saved=await save(boardKey,id,name.trim(),ms,inputs,normalizeCountry(run.country),car);
   const current=await snapshot(boardKey);
   const rankings=saved?.rankings??current.rankings;
   const index=rankings.findIndex(row=>row.id===id);
   const leader=index===0&&saved?.replay
    ?publicReplay(saved.replay)
    :ghost({rankings,runs:current.runs});
   return json(res,200,{ms,rank:index<0?null:index+1,scores:publicBoard(rankings),ghost:leader});
  }
  return json(res,404,{error:'Page not found.'});
 }catch(error){
  console.error(error);
  if(!res.headersSent)json(res,500,{error:'Could not process the race.'});
  else res.end();
 }
}

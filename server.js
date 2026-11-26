import http from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {eventFor,makeCourse} from './public/course.js';
import {normalizeCountry} from './public/countries.js';
import {ready,verify} from './public/race.js';

await ready;
const cloud=process.env.FIREBASE_PROJECT_ID?await (await import('./firebase-scores.js')).firebaseScores():null;
const db=new URL('./scores-rapier-v9.json',import.meta.url);
let scores={};
if(!cloud){
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
const publicBoard=day=>cloud?cloud.top(day):board(day).map(([,entry])=>({name:entry.name,ms:entry.ms,country:normalizeCountry(entry.country)}));
const ghost=day=>{
 if(cloud)return cloud.leader(day);
 const leader=board(day)[0]?.[1];
 return leader?{name:leader.name,ms:leader.ms,inputs:leader.inputs,country:normalizeCountry(leader.country)}:null;
};
const rank=async(day,id)=>{
 if(cloud)return cloud.rank(day,id);
 const index=board(day).findIndex(([key])=>key===id);
 return index<0?null:index+1;
};
async function save(day,id,name,ms,inputs,country){
 if(cloud)return cloud.save(day,id,name,ms,inputs,country);
 const operation=writes.then(async()=>{
  const previous=scores[day]??{};
  if(previous[id]?.ms<=ms)return;
  const top=Object.entries({...previous,[id]:{name,ms,inputs,country}}).sort((a,b)=>a[1].ms-b[1].ms).slice(0,50);
  if(!top.some(([key])=>key===id))return;
  const next={...scores,[day]:Object.fromEntries(top)};
  const temp=new URL('./scores-rapier-v9.tmp',import.meta.url);
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
http.createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&assets.has(path)){
   const file=assets.get(path),vendor=path.startsWith('/vendor/');
   const data=await readFile(new URL('./'+file,import.meta.url));
   res.writeHead(200,{'Content-Type':(mime[file.split('.').at(-1)]??'text/javascript')+'; charset=utf-8',
    'Cache-Control':vendor?'public, max-age=86400':'no-cache'});
   return res.end(data);
  }
  const event=eventFor();
  if(req.method==='GET'&&path==='/api/event'){
   return json(res,200,{event,scores:await publicBoard(event.day),ghost:await ghost(event.day)});
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
   if(cachedCourse?.event.day!==day)cachedCourse=makeCourse(event);
   const ms=verify(cachedCourse,inputs);
   if(ms===null)return json(res,422,{error:'The replay did not finish the stage.'});
   await save(day,id,name.trim(),ms,inputs,normalizeCountry(run.country));
   return json(res,200,{ms,rank:await rank(day,id),scores:await publicBoard(day),ghost:await ghost(day)});
  }
  return json(res,404,{error:'Page not found.'});
 }catch(error){
  console.error(error);
  if(!res.headersSent)json(res,500,{error:'Could not process the race.'});
  else res.end();
 }
}).listen(Number(process.env.PORT??4173),process.env.HOST??'127.0.0.1',()=>{
 console.log('White House Games listening on port '+(process.env.PORT??4173));
});

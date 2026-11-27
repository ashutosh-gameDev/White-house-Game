export async function firebaseScores() {
 const {applicationDefault, cert, initializeApp} = await import('firebase-admin/app');
 const {getFirestore} = await import('firebase-admin/firestore');
 const key=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 const app = initializeApp({
  projectId:process.env.FIREBASE_PROJECT_ID,
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential:key?cert(JSON.parse(key)):applicationDefault()})
 });
 const db=getFirestore(app);
 const boardFor=day=>db.collection('dailyRallyRapierV9').doc(String(day));
 const maps=db.collection('gameSchedules').doc('daily-rally').collection('stages');
 const schedules=new Map();
 const snapshots=new Map();
 const flights=day=>db.collection('spaceGliderDailyV3').doc(String(day));
 const snapshotTtl=45_000;
 return {
  async gliderBoard(day){
   return (await flights(day).get()).data()?.runs??[];
  },
  saveGlider(day,run){
   const board=flights(day);
   return db.runTransaction(async tx=>{
    const rows=(await tx.get(board)).data()?.runs??[];
    const previous=rows.find(row=>row.id===run.id);
    if(previous?.distance>=run.distance)return rows;
    const next=[...rows.filter(row=>row.id!==run.id),run].sort((a,b)=>b.distance-a.distance).slice(0,20);
    if(!next.includes(run))return rows;
    tx.set(board,{runs:next});
    return next;
   });
  },
  schedule(day,{fresh=false}={}){
   if(fresh)return maps.doc(String(day)).get().then(doc=>doc.data()?.settings??null);
   const now=Date.now();
   for(const [key,cached] of schedules){
    if(cached.until<=now)schedules.delete(key);
   }
   const previous=schedules.get(day);
   if(previous)return previous.value;
   const value=maps.doc(String(day)).get().then(doc=>doc.data()?.settings??null).catch(error=>{
    if(schedules.get(day)?.value===value)schedules.delete(day);
    throw error;
   });
   schedules.set(day,{until:now+60_000,value});
   return value;
  },
  async publishStage(day,settings){
   await db.runTransaction(async tx=>{
    if(day<=Math.floor(Date.now()/86400000))throw Error('Only future UTC stages can be published.');
    tx.set(maps.doc(String(day)),{settings});
   });
   schedules.delete(day);
  },
  snapshot(day,limit){
   const now=Date.now();
   for(const [key,entry] of snapshots){
    if(entry.expires<=now)snapshots.delete(key);
   }
   const cached=snapshots.get(day);
   if(cached)return cached.promise;
   const board=boardFor(day);
   const entry={expires:Infinity};
   entry.promise=(async()=>{
    const rankings=(await board.get()).data()?.rankings??[];
    const refs=rankings.slice(0,limit).map(row=>board.collection('runs').doc(row.id));
    const documents=refs.length?await db.getAll(...refs):[];
    entry.expires=Date.now()+snapshotTtl;
    return {rankings,runs:documents.map(doc=>[doc.id,doc.data()]).filter(([,run])=>run?.inputs)};
   })().catch(error=>{
    if(snapshots.get(day)===entry)snapshots.delete(day);
    throw error;
   });
   snapshots.set(day,entry);
   return entry.promise;
  },
  async save(day,id,name,ms,inputs,country,car) {
   const board=boardFor(day);
   return db.runTransaction(async tx=>{
    const snap=await tx.get(board);
    const scores=snap.data()?.rankings??[];
    const prior=scores.find(row=>row.id===id);
    if(prior?.ms<=ms){
     if(!country||country===prior.country)return {rankings:scores};
     const rankings=scores.map(row=>row.id===id?{...row,country}:row);
     tx.set(board,{rankings});
     tx.set(board.collection('runs').doc(id),{country},{merge:true});
     return {rankings};
    }
    const countryForScore=country??prior?.country??null;
    const ranked=[...scores.filter(row=>row.id!==id),{id,name,ms,country:countryForScore}]
     .sort((a,b)=>a.ms-b.ms).slice(0,50);
    if(!ranked.some(row=>row.id===id)) return {rankings:scores};
    tx.set(board,{rankings:ranked});
    tx.set(board.collection('runs').doc(id),{name,ms,inputs,country:countryForScore,car});
    for(const old of scores){
     if(!ranked.some(row=>row.id===old.id)) tx.delete(board.collection('runs').doc(old.id));
    }
    return {rankings:ranked,replay:{name,ms,inputs,country:countryForScore,car}};
   });
  }
 };
}
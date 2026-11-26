import {normalizeCountry} from './public/countries.js';
export async function firebaseScores() {
 const {applicationDefault, initializeApp} = await import('firebase-admin/app');
 const {getFirestore} = await import('firebase-admin/firestore');
 const app = initializeApp({
  projectId:process.env.FIREBASE_PROJECT_ID,
  ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : {credential:applicationDefault()})
 });
 const db=getFirestore(app);
 const boardFor=day=>db.collection('dailyRallyRapierV9').doc(String(day));
 return {
  async top(day) {
   const snap=await boardFor(day).get();
   return (snap.data()?.rankings??[]).map(({name,ms,country})=>({name,ms,country:normalizeCountry(country)}));
  },
  async leader(day){
   const board=boardFor(day);
   const leader=(await board.get()).data()?.rankings?.[0];
   if(!leader)return null;
   const replay=(await board.collection('runs').doc(leader.id).get()).data();
   return replay?.inputs?{name:replay.name,ms:replay.ms,inputs:replay.inputs,country:normalizeCountry(replay.country)}:null;
  },
  async rank(day,id){
   const entries=(await boardFor(day).get()).data()?.rankings??[];
   const index=entries.findIndex(row=>row.id===id);
   return index<0?null:index+1;
  },
  async save(day,id,name,ms,inputs,country) {
   const board=boardFor(day);
   await db.runTransaction(async tx=>{
    const snap=await tx.get(board);
    const scores=snap.data()?.rankings??[];
    const prior=scores.find(row=>row.id===id);
    if(prior?.ms<=ms) return;
    const ranked=[...scores.filter(row=>row.id!==id),{id,name,ms,country}]
     .sort((a,b)=>a.ms-b.ms).slice(0,50);
    if(!ranked.some(row=>row.id===id)) return;
    tx.set(board,{rankings:ranked});
    tx.set(board.collection('runs').doc(id),{name,ms,inputs,country});
    for(const old of scores){
     if(!ranked.some(row=>row.id===old.id)) tx.delete(board.collection('runs').doc(old.id));
    }
   });
  }
 };
}
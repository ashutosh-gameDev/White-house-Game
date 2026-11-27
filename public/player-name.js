const key='white-house-games-player-name';
const legacyKeys=['rapier-name','glider-pilot','jelly-pilot','touch-red-name'];
const clean=value=>value?.trim().slice(0,20)||'';
let sessionName;

export function getPlayerName(fallback='Player'){
 try{
  const saved=localStorage.getItem(key);
  if(saved!==null)return clean(saved)||fallback;
  for(const legacy of legacyKeys){
   const name=clean(localStorage.getItem(legacy));
   if(!name)continue;
   savePlayerName(name);
   return name;
  }
 }catch{}
 return sessionName||fallback;
}

export function savePlayerName(value){
 sessionName=clean(value);
 try{localStorage.setItem(key,sessionName);}catch{}
 return sessionName;
}

export function bindPlayerName(input,fallback='Player'){
 input.value=getPlayerName(fallback);
 input.addEventListener('change',()=>savePlayerName(input.value));
 addEventListener('storage',event=>{
  if(event.key===key&&document.activeElement!==input)input.value=getPlayerName(fallback);
 });
}

import {games} from '/game-cards.js';
import {countries,drawFlag,normalizeCountry} from '/countries.js';

import {bindPlayerName} from '/player-name.js';
bindPlayerName(document.querySelector('#playerName'));

const picker=document.querySelector('#boardGame');
const list=document.querySelector('#boardRows');
const status=document.querySelector('#boardStatus');
const cache=new Map();
let request=0;
picker.replaceChildren(...games.map(game=>new Option(game.title,game.id)));
const fromGame=new URLSearchParams(location.search).get('game');
picker.value=games.some(game=>game.id===fromGame)?fromGame:games[0].id;
const prettyTime=ms=>Math.floor(ms/60000)+':'+(ms%60000/1000).toFixed(3).padStart(6,'0');
async function showBoard(){
 const token=++request,game=games.find(game=>game.id===picker.value);
 list.replaceChildren();
 if(!game.board){
  if(game.id!=='rail'){status.textContent='This game has no leaderboard.';return;}
  let score=0;
  try{score=Number(localStorage.getItem('spiral-rail-best'))||0;}catch{}
  status.textContent='High score on this device: '+score+' m';
  return;
 }
 status.textContent='Loading scores…';
 try{
  const previous=cache.get(game.id);
  let scores=previous?.expires>Date.now()?previous.scores:null;
  if(!scores){
   const response=await fetch(game.board,{signal:AbortSignal.timeout(6000)});
   if(!response.ok)throw Error();
   scores=(await response.json()).scores;
   if(!Array.isArray(scores))throw Error();
   cache.set(game.id,{scores,expires:Date.now()+45000});
  }
  if(token!==request)return;
  status.textContent=scores.length?'':'No scores yet today.';
  list.replaceChildren(...scores.map(score=>{
   const row=document.createElement('li'),value=document.createElement('strong');
   const country=normalizeCountry(score.country);
   if(country){
    const flag=drawFlag(country);
    flag.setAttribute('role','img');flag.setAttribute('aria-label',countries[country]);
    row.append(flag);
   }
   value.textContent=game.id==='elastic'?score.hits+' white hits':game.id==='rally'?prettyTime(score.ms):score.distance+' m';
   row.append(score.name,value);
   return row;
  }));
 }catch{if(token===request)status.textContent='Leaderboard unavailable right now.';}
}
picker.onchange=()=>void showBoard();
void showBoard();

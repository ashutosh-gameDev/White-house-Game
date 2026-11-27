const games=[
 {id:'rally',title:'Daily Rally',href:'/'},
 {id:'glider',title:'Space Glider',href:'/space-glider'},
 {id:'rail',title:'Spiral Rail',href:'/spiral-rail'},
 {id:'jelly',title:'Jelly Hop',href:'/jelly-hop'}
];

if(location.pathname!=='/practice'){
 for(const shelf of document.querySelectorAll('[data-other-games]')){
  const cards=games.filter(game=>game.id!==shelf.dataset.otherGames).map(game=>{
   const link=document.createElement('a');
   link.className='game-card';
   link.href=game.href;

   const logo=document.createElement('span');
   logo.className='game-logo game-logo--'+game.id;
   logo.setAttribute('aria-hidden','true');
   const mark=document.createElement('i');
   mark.className='game-logo-mark';
   logo.append(mark);

   const title=document.createElement('strong');
   title.textContent=game.title;
   const arrow=document.createElement('span');
   arrow.className='game-card-arrow';
   arrow.setAttribute('aria-hidden','true');
   arrow.textContent='→';
   link.append(logo,title,arrow);
   return link;
  });
  shelf.replaceChildren(...cards);
  shelf.hidden=!cards.length;
 }
}

export const countries={IN:'India',PK:'Pakistan',CN:'China',AU:'Australia',SG:'Singapore',AE:'United Arab Emirates',TR:'Türkiye',ES:'Spain',VN:'Vietnam',SE:'Sweden',CH:'Switzerland',BD:'Bangladesh',NP:'Nepal',JP:'Japan',BR:'Brazil',US:'United States',GB:'United Kingdom',CA:'Canada',FR:'France',DE:'Germany',IT:'Italy',NL:'Netherlands',IE:'Ireland',PA:'Panama',UA:'Ukraine',ID:'Indonesia',PL:'Poland'};
export const normalizeCountry=value=>typeof value==="string"&&Object.hasOwn(countries,value)?value:null;

export function drawFlag(code){
 const canvas=document.createElement('canvas');
 canvas.width=96;canvas.height=64;
 const g=canvas.getContext('2d');
 const rect=(color,x,y,w,h)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
 const circle=(color,x,y,r)=>{g.fillStyle=color;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
 const poly=(color,points)=>{g.fillStyle=color;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
 const horizontal=(...colors)=>colors.forEach((color,i)=>rect(color,0,i*64/colors.length,96,64/colors.length+1));
 const vertical=(...colors)=>colors.forEach((color,i)=>rect(color,i*96/colors.length,0,96/colors.length+1,64));
 const white='#fff',red='#d72b35',blue='#194794',green='#13864c';
 const star=(color,x,y,r)=>{
  poly(color,Array.from({length:10},(_,i)=>{
   const angle=i*Math.PI/5-Math.PI/2,k=i%2?r*.40:r;
   return [x+Math.cos(angle)*k,y+Math.sin(angle)*k];
  }));
 };
 switch(code){
  case 'IN':{
   horizontal('#ff9933',white,'#138808');
   g.strokeStyle='#13277a';g.lineWidth=1.15;
   g.beginPath();g.arc(48,32,8.1,0,Math.PI*2);g.stroke();
   for(let i=0;i<24;i++){
    const a=i*Math.PI/12;
    g.beginPath();g.moveTo(48,32);g.lineTo(48+Math.cos(a)*7.8,32+Math.sin(a)*7.8);g.stroke();
   }
   break;
  }
  case 'PK':
   horizontal('#01411c');rect(white,0,0,24,64);
   circle(white,58,32,15);circle('#01411c',64,27,13);
   star(white,69,23,6);break;
  case 'CN':
   horizontal('#de2910');star('#ffde00',20,16,8);
   for(const [x,y] of [[34,7],[39,13],[39,21],[34,27]])star('#ffde00',x,y,2.45);
   break;
  case 'AU':
   horizontal('#012169');g.save();g.beginPath();g.rect(0,0,48,32);g.clip();
   g.scale(.5,.5);
   poly(white,[[0,0],[9,0],[96,56],[96,64],[86,64],[0,8]]);
   poly(white,[[96,0],[87,0],[0,56],[0,64],[10,64],[96,8]]);
   poly(red,[[0,0],[4,0],[96,60],[96,64],[92,64],[0,4]]);
   poly(red,[[96,0],[92,0],[0,60],[0,64],[4,64],[96,4]]);
   rect(white,40,0,16,64);rect(white,0,24,96,16);rect(red,43,0,10,64);rect(red,0,27,96,10);
   g.restore();
   for(const [x,y,r] of [[24,48,7],[72,11,3.8],[82,28,4],[65,37,4],[77,52,4],[87,38,2.5]])star(white,x,y,r);
   break;
  case 'SG':
   horizontal('#ed2939',white);circle(white,21,16,10);circle('#ed2939',25,16,8.3);
   for(const [x,y] of [[29,8],[36,13],[34,21],[24,13],[26,21]])star(white,x,y,2.1);
   break;
  case 'AE':horizontal('#00732f',white,'#111');rect('#ff1723',0,0,24,64);break;
  case 'TR':horizontal('#e30a17');circle(white,37,32,15);circle('#e30a17',41,32,12.2);star(white,53,32,8);break;
  case 'ES':horizontal('#aa151b');rect('#f1bf00',0,16,96,32);rect('#aa151b',25,25,8,12);rect('#f1bf00',26,29,6,3);break;
  case 'VN':horizontal('#da251d');star('#ffff00',48,32,16);break;
  case 'SE':horizontal('#006aa7');rect('#fecc00',28,0,9,64);rect('#fecc00',0,28,96,9);break;
  case 'CH':horizontal('#d52b1e');rect(white,42,13,12,38);rect(white,29,26,38,12);break;
  case 'BD':horizontal('#006a4e');circle('#f42a41',43,32,17);break;
  case 'NP':
   poly('#003893',[[1,1],[78,36],[43,36],[85,63],[1,63]]);
   poly('#dc143c',[[5,8],[65,33],[32,33],[73,59],[5,59]]);
   circle(white,18,25,6);circle('#dc143c',19,22,5);star(white,20,47,8);break;
  case 'JP':horizontal(white);circle('#bc002d',48,32,15);break;
  case 'BR':horizontal('#009739');poly('#ffdd00',[[48,8],[85,32],[48,56],[11,32]]);circle('#002776',48,32,13);poly(white,[[36,27],[58,33],[60,38],[35,31]]);break;
  case 'US':
   horizontal(...Array.from({length:13},(_,i)=>i%2?white:'#b31942'));rect('#0a3161',0,0,42,35);
   for(let row=0;row<9;row++)for(let col=0;col<(row%2?5:6);col++)star(white,4+(row%2?3.3:0)+col*6.8,3+row*3.6,1.45);
   break;
  case 'GB':
   horizontal('#012169');
   poly(white,[[0,0],[9,0],[96,56],[96,64],[86,64],[0,8]]);
   poly(white,[[96,0],[87,0],[0,56],[0,64],[10,64],[96,8]]);
   poly('#c8102e',[[0,0],[4,0],[96,60],[96,64],[92,64],[0,4]]);
   poly('#c8102e',[[96,0],[92,0],[0,60],[0,64],[4,64],[96,4]]);
   rect(white,40,0,16,64);rect(white,0,24,96,16);rect('#c8102e',43,0,10,64);rect('#c8102e',0,27,96,10);
   break;
  case 'CA':
   rect('#d80621',0,0,96,64);rect(white,24,0,48,64);
   poly('#d80621',[[48,10],[52,23],[59,17],[57,29],[67,26],[63,35],[67,36],[51,46],[49,45],[49,55],[47,55],[47,45],[45,46],[29,36],[33,35],[29,26],[39,29],[37,17],[44,23]]);
   break;
  case 'FR':vertical('#0055a4',white,'#ef4135');break;
  case 'DE':horizontal('#171717','#dd0000','#ffce00');break;
  case 'IT':vertical('#009246',white,'#ce2b37');break;
  case 'NL':horizontal('#ae1c28',white,'#21468b');break;
  case 'IE':vertical('#169b62',white,'#ff883e');break;
  case 'PA':
   horizontal(white);rect(red,48,0,48,32);rect(blue,0,32,48,32);star(blue,24,16,8);star(red,72,48,8);break;
  case 'UA':horizontal('#0057b7','#ffdd00');break;
  case 'ID':horizontal('#ce1126',white);break;
  case 'PL':horizontal(white,'#dc143c');break;
  default:horizontal('#647d73');
 }
 return canvas;
}

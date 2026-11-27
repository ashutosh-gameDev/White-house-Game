export const WIDTH=720,HEIGHT=430,RADIUS=12,STEP=1/240;
// Two white balls on the cue-to-target line block a straight shot.
const layouts = [
 {"points":[[128,315],[585,263],[293,296],[420,282],[661,270],[187,230],[484,260],[605,313],[182,385],[364,84],[44,119],[596,52],[592,146],[387,356],[585,384],[677,313],[675,153],[256,214],[217,351],[479,135]]},
 {"points":[[80,306],[591,188],[264,264],[407,230],[256,179],[74,72],[429,138],[624,230],[150,232],[595,369],[659,249],[244,79],[624,92],[207,133],[132,340],[379,355],[145,55],[317,297],[286,328],[585,125],[677,77]]},
 {"points":[[170,337],[606,81],[327,245],[449,173],[117,65],[353,113],[285,112],[493,280],[674,176],[83,178],[432,118],[343,170],[201,373],[404,354],[537,303],[509,57],[253,220],[355,215],[244,166],[481,113],[81,269],[569,43]]},
 {"points":[[152,98],[597,266],[312,158],[437,206],[597,126],[410,143],[552,207],[72,214],[522,318],[661,240],[157,224],[441,277],[167,377],[400,253],[173,337],[242,183],[540,384],[258,318],[358,363],[114,350],[215,109],[551,66],[432,356]]},
 {"points":[[130,268],[605,257],[301,264],[434,261],[579,118],[196,271],[147,208],[399,339],[100,65],[176,111],[503,148],[244,212],[481,328],[97,320],[532,63],[281,86],[292,166],[44,261],[63,171],[366,245]]},
 {"points":[[110,330],[630,90],[297,244],[443,176],[668,229],[284,293],[376,203],[234,216],[481,252],[611,325],[603,224],[303,80],[55,114],[74,278],[270,375],[386,94],[54,316],[196,66],[63,61],[498,169],[190,305]]},
 {"points":[[144,283],[658,361],[329,311],[473,333],[305,138],[60,312],[291,190],[615,228],[84,198],[481,87],[493,235],[292,263],[435,101],[119,102],[88,240],[553,53],[392,40],[518,107],[671,130],[140,223],[48,258],[244,309]]},
 {"points":[[139,326],[652,194],[324,278],[467,242],[293,151],[588,151],[492,373],[431,77],[216,112],[231,158],[361,183],[182,238],[575,372],[473,320],[272,86],[42,293],[649,125],[495,164],[643,299],[81,143],[308,50],[332,230],[446,143]]},
 {"points":[[109,86],[614,114],[291,96],[432,104],[655,320],[469,277],[503,147],[255,362],[652,205],[227,269],[374,68],[529,322],[652,50],[132,268],[202,131],[370,232],[314,189],[574,309],[427,302],[173,198]]},
 {"points":[[73,345],[567,301],[251,329],[389,317],[642,192],[516,87],[104,227],[146,387],[415,214],[490,179],[345,139],[382,175],[326,220],[498,123],[456,259],[405,114],[457,142],[183,277],[257,275],[328,90],[49,277]]},
 {"points":[[94,99],[579,144],[269,115],[404,128],[284,46],[436,361],[182,145],[496,48],[654,73],[642,362],[341,129],[292,268],[316,75],[210,357],[50,232],[168,281],[451,59],[393,87],[159,232],[578,186],[338,292],[422,201]]},
 {"points":[[105,228],[615,238],[289,232],[431,234],[136,111],[367,201],[485,373],[302,296],[412,369],[525,387],[609,352],[652,61],[195,205],[48,252],[180,136],[454,69],[430,276],[661,196],[604,292],[172,362],[470,129],[460,304],[128,69]]},
 {"points":[[68,210],[636,210],[272,210],[432,210],[474,169],[155,209],[554,241],[203,343],[103,180],[365,133],[153,105],[628,130],[281,117],[200,236],[481,260],[331,304],[443,90],[224,153],[171,168],[393,284]]},
 {"points":[[171,211],[612,146],[330,188],[453,169],[660,131],[489,358],[590,269],[417,367],[156,275],[94,238],[365,297],[46,87],[340,345],[268,220],[598,48],[130,134],[242,272],[232,165],[532,155],[310,238],[102,302]]},
 {"points":[[64,66],[617,167],[263,102],[418,131],[571,307],[282,210],[511,227],[347,325],[674,171],[424,378],[68,332],[148,354],[178,207],[201,377],[345,161],[508,381],[113,213],[477,204],[553,194],[468,99],[562,363],[419,191]]},
 {"points":[[165,236],[555,176],[305,214],[415,198],[478,254],[289,336],[74,200],[135,142],[161,277],[334,46],[395,265],[205,243],[628,122],[558,66],[167,41],[230,124],[264,296],[335,244],[414,386],[647,256],[603,271],[94,53],[433,316]]},
 {"points":[[64,149],[573,236],[247,180],[390,205],[566,279],[383,278],[474,263],[294,271],[512,254],[474,172],[323,337],[65,329],[438,123],[105,256],[647,335],[122,193],[354,42],[126,59],[593,196],[548,378]]},
 {"points":[[144,239],[596,253],[307,244],[433,248],[130,313],[54,170],[130,40],[536,359],[547,223],[59,44],[390,259],[596,387],[175,112],[484,195],[649,367],[415,59],[645,268],[276,75],[661,211],[587,196],[266,298]]},
 {"points":[[117,94],[648,155],[308,116],[457,133],[499,182],[540,187],[201,223],[160,293],[458,196],[324,175],[304,224],[489,225],[334,58],[536,310],[608,108],[159,111],[220,304],[571,43],[144,200],[308,351],[104,368],[620,269]]},
 {"points":[[114,340],[643,168],[304,278],[453,230],[307,162],[390,197],[130,115],[211,196],[603,86],[366,292],[553,173],[497,281],[105,224],[434,121],[177,278],[648,108],[355,137],[502,52],[385,48],[571,334],[401,256],[260,201],[260,294]]}
];

export const PICKUP_RADIUS=16;
const powerUps=[
 {kind:'stop',label:'Shooter stopped.'},
 {kind:'size',factor:2,label:'Double size'},
 {kind:'size',factor:.5,label:'Half size'}
];

function placePickups(points,day){
 const pickups=[];
 let state=day+1;
 const random=()=>{
  state=(Math.imul(state,1664525)+1013904223)>>>0;
  return state/4294967296;
 };
 for(const power of powerUps){
  for(let attempt=0;attempt<256;attempt++){
   const x=Math.round(48+random()*(WIDTH-96));
   const y=Math.round(48+random()*(HEIGHT-96));
   if(points.some(([px,py])=>Math.hypot(x-px,y-py)<46))continue;
   if(pickups.some(p=>Math.hypot(x-p.x,y-p.y)<60))continue;
   pickups.push({...power,x,y});
   break;
  }
 }
 return pickups;
}

export function makeTable(layout){
 return {balls:layout.points.map(([x,y])=>({x,y,vx:0,vy:0,radius:RADIUS})),pickups:layout.pickups??[],lastPower:null,hits:0,result:null};
}
export function shoot(table,angle,speed){
 table.balls[0].vx=Math.cos(angle)*speed;
 table.balls[0].vy=Math.sin(angle)*speed;
}
export function stepTable(table,onImpact){
 const {balls}=table;
 for(const ball of balls){
  const {radius}=ball;
  ball.x+=ball.vx*STEP;ball.y+=ball.vy*STEP;
  if(ball.x<radius){ball.x=2*radius-ball.x;ball.vx=Math.abs(ball.vx);}
  if(ball.x>WIDTH-radius){ball.x=2*(WIDTH-radius)-ball.x;ball.vx=-Math.abs(ball.vx);}
  if(ball.y<radius){ball.y=2*radius-ball.y;ball.vy=Math.abs(ball.vy);}
  if(ball.y>HEIGHT-radius){ball.y=2*(HEIGHT-radius)-ball.y;ball.vy=-Math.abs(ball.vy);}
 }
 const cue=balls[0];
 for(const pickup of table.pickups){
  if(pickup.used||Math.hypot(cue.x-pickup.x,cue.y-pickup.y)>=cue.radius+PICKUP_RADIUS)continue;
  pickup.used=true;
  table.lastPower=pickup;
  if(pickup.kind==='stop'){
   cue.vx=0;
   cue.vy=0;
  }else{
   cue.radius=RADIUS*pickup.factor;
   cue.x=Math.max(cue.radius,Math.min(WIDTH-cue.radius,cue.x));
   cue.y=Math.max(cue.radius,Math.min(HEIGHT-cue.radius,cue.y));
  }
 }
 for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
  const a=balls[i],b=balls[j];
  const dx=b.x-a.x,dy=b.y-a.y,separation=Math.hypot(dx,dy);
  const contact=a.radius+b.radius;
  if(separation>=contact)continue;
  const nx=separation?dx/separation:1,ny=separation?dy/separation:0;
  const overlap=(contact-separation)/2;
  a.x-=nx*overlap;a.y-=ny*overlap;b.x+=nx*overlap;b.y+=ny*overlap;
  const approach=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;
  if(approach<=0)continue;
  onImpact?.(approach);
  // Equal masses and restitution 1: exchange the normal velocity components.
  a.vx-=approach*nx;a.vy-=approach*ny;
  b.vx+=approach*nx;b.vy+=approach*ny;
  if(i===0){
   if(j===1)table.result='clear';
   if(j!==1&&table.result===null)table.hits++;
  }
 }
}

export const MAX_VERIFY_TICKS = 600 / STEP;
export const utcDay = () => Math.floor(Date.now() / 86400000);
export const TABLE_COUNT=layouts.length*4;
export function dailyTable(day) {
 const layout = layouts[day % layouts.length];
 const orientation = Math.floor(day / layouts.length) % 4;
 const points=layout.points.map(([x,y]) => [
  orientation & 1 ? WIDTH-x : x, orientation & 2 ? HEIGHT-y : y
 ]);
 return makeTable({points,pickups:placePickups(points,day%TABLE_COUNT)});
}
export function verifyShot(day, angle, speed, ticks) {
 if (!Number.isSafeInteger(ticks) || ticks<1 || ticks>MAX_VERIFY_TICKS) return null;
 if (!Number.isFinite(angle) || Math.abs(angle)>Math.PI*2 || !Number.isFinite(speed) || speed<235 || speed>710) return null;
 const table = dailyTable(day);
 shoot(table,angle,speed);
 for (let tick=1; tick<=ticks; tick++) {
  stepTable(table);
  if (table.result==='clear') return tick===ticks ? table.hits : null;
 }
 return null;
}

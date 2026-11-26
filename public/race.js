import {DT,inputCodes,FINISH_GATE} from './course.js';
import {ready,createVehicle,place,updateVehicle} from './vehicle.js';
export {ready};
export const clock=ticks=>Math.round(ticks*1000/60);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const turnIn=.31, center=.36;
function steeringCurve(speed){
 const x=speed/18;
 if(x===0)return .56;
 let low=0,high=Math.max(1,x);
 for(let i=0;i<23;i++){
  const m=(low+high)*.5,m2=m*m,m4=m2*m2;
  if(m4*m4*m2<x)low=m;else high=m;
 }
 const r=(low+high)*.5;
 return .56/(1+x*r*r*r);
}
export function snapshot(car){
 const {body,vehicle}=car.sim,p=body.translation(),q=body.rotation(),v=body.linvel();
 return {p,q,v,wheels:[0,1,2,3].map(i=>({
  spin:vehicle.wheelRotation(i)??0,length:vehicle.wheelSuspensionLength(i)??.52
 }))};
}
export function makeCar(course){
 const sim=createVehicle(course);
 place(sim,course.spawn);
 return {sim,pose:snapshot({sim}),ticks:0,done:false,steer:0,angle:0,checkpoint:-1,
  jumpHeld:false,launchUsed:false,airTicks:0,landingTicks:0,drift:false,grounded:false,speed:0,forward:0,reset:false};
}
function recover(car,course){
 const p=course.checkpoints[car.checkpoint];
 if(p){
  const ahead=course.at(p.z+3),dx=ahead.x-p.x,dz=3,len=Math.sqrt(dx*dx+dz*dz),qw=Math.sqrt((1+dz/len)/2);
  place(car.sim,{x:p.x,y:p.y+1.05,z:p.z,qy:dx/(2*len*qw),qw});
 }else place(car.sim,course.spawn);
 car.reset=true;car.steer=0;car.angle=0;car.launchUsed=false;car.airTicks=0;car.landingTicks=0;
}
export function step(car,mask,course){
 if(car.done)return;
 const previous=car.pose, {p,q,v}=previous;
 const sx=2*(q.w*q.y+q.x*q.z),sz=1-2*(q.x*q.x+q.y*q.y);
 const forward=v.x*sx+v.z*sz,speed=Math.sqrt(v.x*v.x+v.z*v.z);
 const lateral=v.x*sz-v.z*sx;
 const steer=Number(Boolean(mask&1))-Number(Boolean(mask&2));
 const gas=Boolean(mask&4),brake=Boolean(mask&8),jump=Boolean(mask&32);
 const reverse=brake&&!gas&&forward<.5;
 const grounded=[0,1,2,3].filter(i=>car.sim.vehicle.wheelIsInContact(i)).length>=2;
 const drift=grounded&&Boolean(mask&16)&&steer!==0&&forward>7;
 if(grounded){
  if(car.airTicks>=7&&speed>4)car.landingTicks=20;
  car.airTicks=0;
 }else{
  car.airTicks++;
 }
 const landing=grounded?car.landingTicks/20:0;
 const contactGrip=landing||(!grounded&&car.airTicks>=7&&v.y<0?1:0);
 const landingSlide=landing>0&&Math.abs(lateral)>1.85&&speed>5;
 if(car.landingTicks>0)car.landingTicks--;
 const steeringChange=(steer-car.steer)*(steer?turnIn:center);
 car.steer+=clamp(steeringChange,-.26,.26);
 car.angle=car.steer*steeringCurve(speed)*(1-.71*landing);
 const gap=course.gap,atLip=!course.bridge&&p.z>=gap[0]-3.1&&p.z<=gap[0]&&Math.abs(p.x-course.at(p.z).x)<5.5;
 const waterLaunch=atLip&&grounded&&forward>10&&!car.launchUsed;
 if(waterLaunch)car.launchUsed=true;
 if(!atLip)car.launchUsed=false;
 const zNext=p.z+v.z*DT;
 const shortcutRamp=course.shortcuts.some(link=>{
  const ramp=course.shortcutAt(link.rampZ);
  return p.z<link.rampZ&&zNext>=link.rampZ&&Math.abs(p.x-ramp.x)<3.6&&Math.abs(ramp.x-course.at(link.rampZ).x)>5;
 });
 const onPoweredRamp=course.boostRamps.some(z=>p.z<z&&zNext>=z&&Math.abs(p.x-course.at(z).x)<=3.55);
 const rampBoost=onPoweredRamp&&grounded&&forward>10.5;
 const roadRamp=course.rampCenters.some(z=>p.z<z&&zNext>=z&&(!course.region||Math.abs(p.x-course.at(z).x)<5.4));
 const ramp=(shortcutRamp||roadRamp)&&forward>13&&grounded;
 const launch=waterLaunch?6.35:rampBoost?6.45:grounded&&jump&&!car.jumpHeld?4.8:ramp?3.65:0;
 const corner=Math.abs(car.steer)*clamp((speed-8)/12,0,1);
 const limit=33-corner*(drift?7:13);
 const throttleForce=3400*clamp((limit-forward)/7,0,1)*(1-corner*.27);
 const force=reverse?(forward>-7?-1850:0):gas&&!brake?throttleForce:0;
 updateVehicle(car.sim,{angle:car.angle,force,brake:brake&&!reverse?34:drift?5:grounded&&forward>limit+1?Math.min(14,(forward-limit)*2):0,drift,landing:contactGrip,landingSlide:contactGrip>0&&Math.abs(lateral)>1.85,grounded:grounded&&!launch,launch,boost:rampBoost?Math.min(6.5,Math.max(1.75,36-forward)):0});
 car.jumpHeld=jump;car.ticks++;car.pose=snapshot(car);
 const next=car.pose.p;
 car.grounded=grounded;car.rampBoost=rampBoost;car.drift=drift||landingSlide;car.slip=Math.abs(lateral);
 car.speed=speed;car.forward=forward;car.reset=false;car.missedCheckpoint=false;
 if(next.y<.26&&course.heightAt(next.x,next.z)<0){
  recover(car,course);car.pose=snapshot(car);return;
 }
 const cp=course.checkpoints[car.checkpoint+1];
 if(cp&&next.z>=cp.z){
  const crossed=previous.p.z<cp.z;
  const fraction=crossed?(cp.z-previous.p.z)/(next.z-previous.p.z):1;
  const x=previous.p.x+(next.x-previous.p.x)*fraction;
  const z=crossed?cp.z:next.z;
  const alternative=course.shortcutAt(z);
  const permitted=Boolean(course.region)||Math.abs(x-course.at(z).x)<=22||alternative&&Math.abs(x-alternative.x)<5;
  if(permitted&&course.heightAt(x,z)>0&&next.z<=cp.z+24){
   car.checkpoint++;
  }else if(next.z>cp.z+24){
   car.missedCheckpoint=true;
  }
 }
 const finish=course.event.length+FINISH_GATE.crossingOffset;
 if(course.region&&next.z>=finish&&next.z<=finish+3.5){
  const inside=Math.abs(next.x-course.at(finish).x)<=FINISH_GATE.postOffset-FINISH_GATE.postWidth*.5;
  if(inside&&car.checkpoint>=course.checkpoints.length-2){car.done=true;return;}
 }
 if(previous.p.z>=finish||next.z<finish)return;
 const fraction=(finish-previous.p.z)/(next.z-previous.p.z);
 const crossingX=previous.p.x+(next.x-previous.p.x)*fraction;
 const inside=Math.abs(crossingX-course.at(finish).x)<=FINISH_GATE.postOffset-FINISH_GATE.postWidth/2;
 if(!inside)return;
 if(car.checkpoint>=course.checkpoints.length-2){
  car.done=true;
 }else{
  car.missedCheckpoint=true;
 }
}
export function verify(course,inputs){
 const car=makeCar(course);
 try{
  for(let i=0;i<inputs.length;i++){
   step(car,inputCodes.indexOf(inputs[i]),course);
   if(car.done)return i===inputs.length-1?clock(car.ticks):null;
  }
  return null;
 }finally{car.sim.dispose();}
}

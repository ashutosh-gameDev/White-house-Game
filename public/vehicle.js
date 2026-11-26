import RAPIER from '@dimforge/rapier3d-compat';
import {DT} from './course.js';

export const ready=RAPIER.init();
export const wheels=[[-1.02,1.24],[1.02,1.24],[-1.02,-1.24],[1.02,-1.24]];
const TERRAIN=0x0001ffff,OBSTACLE=0x0002ffff,CAR=0x0004ffff;
export function createVehicle(course){
 const world=new RAPIER.World({x:0,y:-9.81,z:0});
 world.timestep=DT;
 world.numSolverIterations=8;
 world.createCollider(RAPIER.ColliderDesc.trimesh(course.vertices,course.indices,RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES)
  .setFriction(.72).setCollisionGroups(TERRAIN));
 for(const prop of course.props){
  const shape=prop.tree?RAPIER.ColliderDesc.cylinder(prop.scale*.69,prop.scale*.26)
   :RAPIER.ColliderDesc.ball(prop.scale*.62);
  world.createCollider(shape.setTranslation(prop.x,prop.y+prop.scale*(prop.tree?.69:.48),prop.z).setCollisionGroups(OBSTACLE));
 }
 for(const b of course.buildings){
  world.createCollider(RAPIER.ColliderDesc.cuboid(b.w*.5,b.h*.55,b.d*.5)
   .setTranslation(b.x,b.y+b.h*.34,b.z).setCollisionGroups(OBSTACLE));
 }
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(false).setCcdEnabled(true)
  .setLinearDamping(.12).setAngularDamping(.37));
 world.createCollider(RAPIER.ColliderDesc.roundCuboid(.91,.24,1.62,.11)
  .setTranslation(0,.36,0).setDensity(0).setFriction(.32).setCollisionGroups(CAR),body);
 world.createCollider(RAPIER.ColliderDesc.roundCuboid(.67,.26,.63,.1)
  .setTranslation(0,.97,.05).setDensity(0).setCollisionGroups(CAR),body);
 body.setAdditionalMassProperties(770,{x:0,y:-.095,z:0},{x:980,y:1190,z:610},{x:0,y:0,z:0,w:1},true);
 const vehicle=world.createVehicleController(body);
 vehicle.indexUpAxis=1;
 vehicle.setIndexForwardAxis=2;
 for(const [x,z] of wheels){
  const i=vehicle.numWheels();
  vehicle.addWheel({x,y:.14,z},{x:0,y:-1,z:0},{x:-1,y:0,z:0},.52,.49);
  vehicle.setWheelSuspensionStiffness(i,40);
  vehicle.setWheelSuspensionCompression(i,6.2);
  vehicle.setWheelSuspensionRelaxation(i,5.2);
  vehicle.setWheelMaxSuspensionTravel(i,.31);
  vehicle.setWheelMaxSuspensionForce(i,26000);
  vehicle.setWheelFrictionSlip(i,2.8);
  vehicle.setWheelSideFrictionStiffness(i,1);
 }
 return {world,body,vehicle,dispose(){world.removeVehicleController(vehicle);world.free();}};
}
export function place(sim,pose){
 const {body}=sim;
 body.setTranslation({x:pose.x,y:pose.y,z:pose.z},true);
 body.setRotation({x:0,y:pose.qy,z:0,w:pose.qw},true);
 body.setLinvel({x:0,y:0,z:0},true);
 body.setAngvel({x:0,y:0,z:0},true);
 body.resetForces(true);
 body.resetTorques(true);
}
export function updateVehicle(sim,control){
 const {world,body,vehicle}=sim;
 for(let i=0;i<4;i++){
  vehicle.setWheelSteering(i,i<2?control.angle:0);
  vehicle.setWheelEngineForce(i,control.force);
  vehicle.setWheelBrake(i,control.drift&&i<2?0:control.brake);
  vehicle.setWheelFrictionSlip(i,control.drift&&i>=2?1.15:2.8);
  vehicle.setWheelSideFrictionStiffness(i,control.drift&&i>=2?.60:1);
 }
 if(control.launch){
  const v=body.linvel();
  body.setLinvel({x:v.x,y:Math.max(0,v.y)+control.launch,z:v.z},true);
 }
 if(control.grounded){
  const w=body.angvel(),q=body.rotation();
  const upY=1-2*(q.x*q.x+q.z*q.z);
  if(upY>.55){
   const sx=2*(q.w*q.y+q.x*q.z),sz=1-2*(q.x*q.x+q.y*q.y);
   const upX=2*(q.x*q.y-q.w*q.z),upZ=2*(q.y*q.z+q.w*q.x);
   const bank=upX*sz-upZ*sx, rate=w.x*sx+w.z*sz;
   const v=body.linvel(), lateral=v.x*sz-v.z*sx;
   if(!control.drift){
    const blend=Math.max(-1.4,Math.min(1.4,lateral*.056));
    body.setLinvel({x:v.x-sz*blend,y:v.y,z:v.z+sx*blend},true);
    const yawDamping=Math.max(0,Math.abs(w.y)-.94)*.14;
    const pitchRate=(w.x*sz-w.z*sx)*.035;
    body.setAngvel({x:w.x-sz*pitchRate,y:w.y-Math.sign(w.y)*yawDamping,z:w.z+sx*pitchRate},true);
   }
   const impulse=Math.max(-53,Math.min(53,(3500*bank-1050*rate)*DT));
   body.applyTorqueImpulse({x:sx*impulse,y:0,z:sz*impulse},true);
  }
 }else{
  const q=body.rotation(),w=body.angvel(),v=body.linvel();
  const upX=2*(q.x*q.y-q.w*q.z);
  const upY=1-2*(q.x*q.x+q.z*q.z);
  const upZ=2*(q.y*q.z+q.w*q.x);
  if(upY>.22){
   const sx=2*(q.w*q.y+q.x*q.z),sz=1-2*(q.x*q.x+q.y*q.y);
   const targetPitch=Math.max(0,Math.min(.10,-v.y*.013));
   const impulseX=(3200*(upY*sz*targetPitch-upZ)-2200*w.x)*DT;
   const impulseZ=(3200*(upX-upY*sx*targetPitch)-1600*w.z)*DT;
   const cap=n=>Math.max(-105,Math.min(105,n));
   body.applyTorqueImpulse({x:cap(impulseX),y:cap(-510*w.y*DT),z:cap(impulseZ)},true);
  }
 }
 vehicle.updateVehicle(DT,RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,0x00040001);
 world.step();
}

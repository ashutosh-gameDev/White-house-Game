export function makeAudio(toggle){
 let context,master,engineFilter,engineGain,noiseGain,musicGain,muted=true;
 let nextBeat=0,beat=0;
 const cylinders=[];
 // "Village Miles" — original background composition, CC0 1.0 Universal.
 // https://creativecommons.org/publicdomain/zero/1.0/
 const bpm=108, stepLength=60/bpm/2;
 const bars=[
  {root:50,pad:[62,69,76],riff:[74,81,null,79,76,null,81,86]},
  {root:50,pad:[62,67,74],riff:[84,null,81,79,74,null,76,79]},
  {root:46,pad:[58,65,74],riff:[77,81,null,84,81,null,77,74]},
  {root:48,pad:[60,67,76],riff:[76,null,79,81,79,76,null,74]},
  {root:50,pad:[62,69,76],riff:[74,79,81,null,86,84,81,null]},
  {root:53,pad:[65,69,76],riff:[84,81,null,77,76,null,77,81]},
  {root:46,pad:[58,65,74],riff:[77,null,81,79,77,74,null,76]},
  {root:48,pad:[60,67,74],riff:[79,76,null,74,76,null,72,null]}
 ];
 const hz=midi=>440*2**((midi-69)/12);
 let percussionBuffer;
 function initialize(){
  context=new AudioContext();
  master=context.createGain();
  master.gain.value=0;
  const limiter=context.createDynamicsCompressor();
  limiter.threshold.value=-14;
  limiter.ratio.value=4;
  master.connect(limiter).connect(context.destination);

  engineGain=context.createGain();
  engineGain.gain.value=0;
  engineFilter=context.createBiquadFilter();
  engineFilter.type='lowpass';
  engineFilter.Q.value=.65;
  engineFilter.connect(engineGain).connect(master);
  const real=new Float32Array([0,1,.18,.46,.10,.28,.08,.14,.07]);
  const imag=new Float32Array([0,0,.36,-.13,.22,-.13,.16,-.12,.06]);
  const pulse=context.createPeriodicWave(real,imag);
  for(const [ratio,level,detune] of [[1,.62,0],[.5,.36,0],[1,.21,-13]]){
   const oscillator=context.createOscillator(),gain=context.createGain();
   oscillator.setPeriodicWave(pulse);oscillator.detune.value=detune;
   gain.gain.value=level;
   oscillator.connect(gain).connect(engineFilter);
   oscillator.start();
   cylinders.push({oscillator,ratio});
  }

  const buffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
  const samples=buffer.getChannelData(0);
  for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
  percussionBuffer=buffer;
  const noise=context.createBufferSource();
  noise.buffer=buffer;noise.loop=true;
  const filter=context.createBiquadFilter();
  filter.type='bandpass';filter.frequency.value=1440;filter.Q.value=2.2;
  noiseGain=context.createGain();noiseGain.gain.value=0;
  noise.connect(filter).connect(noiseGain).connect(master);
  noise.start();

  musicGain=context.createGain();
  musicGain.gain.value=.30;
  const musicFilter=context.createBiquadFilter();
  musicFilter.type='lowpass';musicFilter.frequency.value=1900;
  musicGain.connect(musicFilter).connect(master);
 }
 toggle.onclick=async()=>{
  try{
   if(!context)initialize();
   await context.resume();
   muted=!muted;
   master.gain.setTargetAtTime(muted?0:.65,context.currentTime,.035);
   if(!muted)nextBeat=context.currentTime+.04;
   toggle.textContent=muted?'Sound off':'Sound on';
   toggle.setAttribute('aria-pressed',String(!muted));
  }catch{toggle.textContent='Sound unavailable';}
 };
 function note(freq,end,start,duration,volume,type='square',destination=master,attack=.012){
  const osc=context.createOscillator(),gain=context.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,start);
  osc.frequency.exponentialRampToValueAtTime(end,start+duration);
  gain.gain.setValueAtTime(.001,start);
  gain.gain.exponentialRampToValueAtTime(volume,start+attack);
  gain.gain.exponentialRampToValueAtTime(.001,start+duration);
  osc.connect(gain).connect(destination);
  osc.start(start);osc.stop(start+duration+.015);
 }
 function tone(freq,end,duration,volume,type='square',offset=0){
  if(context&&!muted)note(freq,end,context.currentTime+offset,duration,volume,type);
 }
 function shaker(start,level){
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  source.buffer=percussionBuffer;
  filter.type='bandpass';filter.frequency.value=3250;filter.Q.value=.78;
  gain.gain.setValueAtTime(level,start);
  gain.gain.exponentialRampToValueAtTime(.001,start+.10);
  source.connect(filter).connect(gain).connect(musicGain);
  source.start(start,(beat*.137)%.71);source.stop(start+.11);
 }
 function background(now,mode){
  musicGain.gain.setTargetAtTime(mode==='racing'?.24:mode==='finished'?.12:.40,now,.26);
  if(nextBeat<now-.4)nextBeat=now+.035;
  while(nextBeat<now+.13){
   const slot=beat%8,bar=bars[Math.floor(beat/8)%bars.length],root=hz(bar.root);
   const swung=nextBeat+(slot%2?.023:0);
   if(slot===0){
    for(const pitch of bar.pad)note(hz(pitch),hz(pitch),swung,1.83,.044,'sine',musicGain,.20);
   }
   if(slot===0||slot===4)note(94,41,swung,.17,.20,'sine',musicGain,.009);
   if(slot===0||slot===3||slot===5){
    const pitch=slot===3?root*1.5:root;
    note(pitch,pitch,swung,.43,.20,'triangle',musicGain,.023);
   }
   if(slot===2||slot===6){
    note(178,105,swung,.13,.086,'triangle',musicGain);
    shaker(swung,.09);
   }else if(slot%2)shaker(swung,.033);
   const melody=bar.riff[slot];
   if(melody!==null){
    const pitch=hz(melody);
    note(pitch,pitch,swung,.37,.085,'triangle',musicGain,.017);
    note(pitch*2,pitch*2,swung,.13,.018,'sine',musicGain,.012);
   }
   beat++;
   nextBeat+=stepLength;
  }
 }
 return {
  update(car,mode,mask){
   if(!context||muted)return;
   const t=context.currentTime,active=mode==='racing'||mode==='countdown';
   const speed=Math.abs(car?.forward??0), load=Boolean(mask&4);
   const gear=speed<8?0:speed<15?1:speed<23?2:speed<31?3:4;
   const rpm=Math.min(5700,850+speed*[355,245,183,150,123][gear]+(load?260:0));
   const pulseRate=rpm/36;
   for(const {oscillator,ratio} of cylinders)oscillator.frequency.setTargetAtTime(pulseRate*ratio,t,.065);
   engineFilter.frequency.setTargetAtTime(82+rpm*(load?.115:.073),t,.08);
   engineGain.gain.setTargetAtTime(active?(load?.23:.14):0,t,.10);
   noiseGain.gain.setTargetAtTime(active&&car?.drift?Math.min(.12,car.slip*.015):0,t,.075);
   background(t,mode);
  },
  thud(){tone(110,36,.15,.35,'triangle');},
  checkpoint(){tone(660,810,.10,.11);},
  finish(){[523,659,784,1047,784,1047].forEach((n,i)=>tone(n,n,.25,i===5?.22:.15,'square',i*.105));}
 };
}
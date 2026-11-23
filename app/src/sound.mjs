/* Lightweight original synthesized interface sounds; no external audio or copyrighted music. */
export function makeAudio(getEnabled=()=>true){
 let context=null,lastPickup=0;
 const presets={tap:[420,.055,'sine',.025],pickup:[830,.09,'sine',.045],reward:[740,.19,'triangle',.075],death:[190,.28,'sawtooth',.038],power:[570,.14,'triangle',.055]};
 function play(name='tap'){
  if(!getEnabled())return false;
  const spec=presets[name]||presets.tap;
  const now=Date.now();if(name==='pickup'&&now-lastPickup<110)return false;if(name==='pickup')lastPickup=now;
  try{
   const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Ctor)return false;
   if(!context)context=new Ctor();
   if(context.state==='suspended')context.resume().catch(()=>{});
   const time=context.currentTime;
   const osc=context.createOscillator(),gain=context.createGain();
   osc.type=spec[2];osc.frequency.setValueAtTime(spec[0],time);
   osc.frequency.exponentialRampToValueAtTime(Math.max(80,spec[0]*(name==='death'?.45:1.25)),time+spec[1]);
   gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(spec[3],time+.011);
   gain.gain.exponentialRampToValueAtTime(.0001,time+spec[1]);
   osc.connect(gain);gain.connect(context.destination);osc.start(time);osc.stop(time+spec[1]+.01);
   return true;
  }catch{return false;}
 }
 function close(){if(context&&context.state!=='closed')context.close().catch(()=>{});context=null;}
 return {play,close};
}

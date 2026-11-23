/** Named, distinct OFFLINE NPC rivals; never presented as remote accounts. */
export const NPC_NAMES=Object.freeze([
'SkyReaper','JadeComet','BubbleNova','IronCoil','TideHunter','MossGlimmer',
'EmberVex','FrostWarden','PrismFox','MoonChaser','StormTalon','DuskHowl',
'NeonRift','SolarClaw','VoidRunner','AbyssWake','StarSentinel','CrimsonFlare',
'OrbitShade','KirinBloom','InfinityFang','NebulaWing','Timekeeper','AstraVortex']);
export const NPC_PERSONALITIES=Object.freeze(['harvester','hunter','cautious','sprinter']);
export function chooseNpcRoster(manifest,count=9,matchIndex=0){
 if(!manifest?.characters?.length)throw Error('Character manifest is required');
 const characters=manifest.characters,used=new Set(),result=[];
 for(let i=0;i<Math.min(count,characters.length);i++){
  const idx=(matchIndex*11+i*7)%characters.length;
  if(used.has(idx))throw Error('Duplicate NPC appearance');used.add(idx);
  const c=characters[idx];
  result.push({id:'rival-'+i,skin:c.id,displayName:NPC_NAMES[idx]||'Rival '+(i+1),
   difficulty:Math.min(.9,.3+(i%5)*.13),personality:NPC_PERSONALITIES[i%NPC_PERSONALITIES.length],initialMass:2+i*4});
 }
 return result;
}

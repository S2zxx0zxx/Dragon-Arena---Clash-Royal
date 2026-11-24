import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CrystalArena,RULES,FOOD_TYPES,segmentCount} from '../engine/arena.mjs';
import {chooseNpcRoster,NPC_NAMES} from '../src/npc.mjs';
import {syncEnergy,spendEnergy,grantEnergy,REGEN_MS} from '../src/energy.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../manifest/game_assets.json',import.meta.url)));
test('ten genuine food families with useful masses',()=>{
 assert.equal(FOOD_TYPES.length,10);
 assert.deepEqual(new Set(FOOD_TYPES.map(f=>f.id)),new Set(manifest.food.map(f=>f.id)));
});
test('food replenishes deterministically after eating',()=>{
 const a=new CrystalArena(88),p=a.addPlayer({id:'you',x:90,y:90});
 a.addFood({x:90,y:90,type:'star_dust',mass:3});
 a.step();assert.equal(p.mass,3);
 for(let i=0;i<60;i++)a.step();
 assert.ok(a.food.some(f=>f.source==='respawn'));
 assert.ok(a.food.length<=RULES.foodTarget);
});
test('stronger head wins, weaker drops food and credits kill',()=>{
 const a=new CrystalArena(91),strong=a.addPlayer({id:'strong',x:92,y:90,angle:Math.PI}),weak=a.addPlayer({id:'weak',x:91.2,y:90});
 strong.mass=100;strong.segmentCount=segmentCount(strong.mass);strong.body=a.sampleBody(strong);
 a.step();assert.ok(strong.alive);assert.equal(weak.alive,false);assert.equal(weak.lastDeath.killerId,'strong');
 assert.ok(a.food.some(f=>f.source==='death'));
});
test('equal head collision is a fair double defeat',()=>{
 const a=new CrystalArena(92),x=a.addPlayer({id:'x',x:92,y:90,angle:Math.PI}),y=a.addPlayer({id:'y',x:91.2,y:90});
 a.step();assert.ok(!x.alive&&!y.alive);
});
test('magnet is continuous on simulated ticks and speed expiry is deterministic',()=>{
 const a=new CrystalArena(99),p=a.addPlayer({id:'you',x:50,y:50});
 a.addFood({x:55,y:50,type:'galaxy_orb',mass:5});
 p.magnetUntilTick=20;p.speedUntilTick=2;
 const before=a.food[0].x;a.step();assert.ok(a.food[0].x<before);
});
test('NPC identities rotate with unique skins within each match',()=>{
 assert.equal(new Set(NPC_NAMES).size,24);
 const r=chooseNpcRoster(manifest,9,1);
 assert.equal(r.length,9);assert.equal(new Set(r.map(x=>x.skin)).size,9);
 assert.ok(r.every(x=>x.displayName&&x.id.startsWith('rival-')));
});
test('bot respawns and keeps identity',()=>{
 const a=new CrystalArena(33),bot=a.addPlayer({id:'bot',x:75,y:75,isBot:true,displayName:'SkyReaper'});
 a.kill(bot,'test');
 for(let i=0;i<RULES.botRespawnTicks;i++)a.step();
 assert.ok(bot.alive);assert.equal(bot.displayName,'SkyReaper');
});
test('energy regeneration and cap are real local state',()=>{
 const s={energy:20};const now=1000000;
 assert.ok(spendEnergy(s,1,now));assert.equal(s.energy,19);
 syncEnergy(s,now+REGEN_MS);assert.equal(s.energy,20);
 assert.equal(grantEnergy(s,5,now+REGEN_MS),0);
});

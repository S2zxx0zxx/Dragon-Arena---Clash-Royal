import assert from 'node:assert/strict';
import test from 'node:test';
import {CrystalArena,RULES,segmentCount} from '../engine/arena.mjs';
test('body grows predictably, and enforces 220-node physical cap',()=>{
 assert.equal(segmentCount(0),8);assert.equal(segmentCount(2),8);assert.equal(segmentCount(3),9);
 assert.equal(segmentCount(636),220);assert.equal(segmentCount(20000),220);
 assert.equal((RULES.maxSegments-1)*RULES.bodySpacing,135.78);
});
test('food collection adds mass and length threshold with deterministic tick',()=>{
 const a=new CrystalArena(91),p=a.addPlayer({id:'p',x:50,y:50});
 a.addFood({x:50.1,y:50.1,type:'star_dust',mass:3});a.step();
 assert.equal(p.mass,3);assert.equal(p.segmentCount,9);assert.equal(a.food.length,0);
});
test('simultaneous head-head collision is symmetric',()=>{
 const a=new CrystalArena(92),p=a.addPlayer({id:'p',x:75,y:75}),q=a.addPlayer({id:'q',x:75.5,y:75,angle:Math.PI});
 a.step();assert.equal(p.alive,false);assert.equal(q.alive,false);
 assert.equal(a.effects.length,2);
});
test('head touching an opponent body kills only the colliding head when there is no head-head overlap',()=>{
 const a=new CrystalArena(93),p=a.addPlayer({id:'p',x:50,y:50,angle:0});
 const q=a.addPlayer({id:'q',x:48.15,y:50,angle:0});
 a.step();assert.equal(q.alive,false);assert.equal(p.alive,true);
});
test('kill generates finite collectible mass based on victim length, not cosmetic tier',()=>{
 const a=new CrystalArena(94),p=a.addPlayer({id:'p',x:77,y:77,skin:'infinity_dragon'});
 p.mass=60;p.segmentCount=segmentCount(p.mass);p.body=a.sampleBody(p);
 assert.equal(a.kill(p,'test'),true);assert.equal(a.kill(p,'test'),false);
 assert.equal(a.food.reduce((sum,f)=>sum+f.mass,0),Math.floor(60*RULES.deathDropFraction));
 assert.ok(a.food.every(f=>f.mass>=1 && f.mass<=5));
 const huge=a.addPlayer({id:'huge',x:83,y:83});huge.mass=900;a.kill(huge,'test');
 const drops=a.food.filter(f=>f.source==='death');
 assert.equal(drops.reduce((v,f)=>v+f.mass,0),Math.floor(60*.65)+Math.floor(900*.65));
 assert.ok(drops.some(f=>f.mass>5),'high-mass player uses value-packed drop pellets');
});
test('same seed leads to same synthetic food positions',()=>{
 const a=new CrystalArena(16),b=new CrystalArena(16);a.seedFood(40);b.seedFood(40);assert.deepEqual(a.food,b.food);
});
test('body owner is credited for opponent body collision',()=>{
 const a=new CrystalArena(145),owner=a.addPlayer({id:'owner',x:50,y:50,angle:0});
 const victim=a.addPlayer({id:'victim',x:48.15,y:50,angle:0});
 a.step();
 assert.equal(owner.alive,true);assert.equal(victim.alive,false);
 assert.equal(victim.lastDeath.killerId,'owner');
 assert.equal(a.effects.find(x=>x.skin===victim.skin).killerId,'owner');
});

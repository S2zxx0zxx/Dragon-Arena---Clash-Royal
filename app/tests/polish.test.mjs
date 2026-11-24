import test from 'node:test';
import assert from 'node:assert/strict';
import {CrystalArena,RULES} from '../engine/arena.mjs';
import {boundPoint,constrainCamera,minimapState,PRESENTATION} from '../src/polish.mjs';

test('world-space point clamping is stable and symmetric',()=>{
 assert.deepEqual(boundPoint(-4,999),{x:1.25,y:178.75});
 assert.deepEqual(boundPoint(100,88),{x:100,y:88});
});
test('camera stays within a viewport-safe region near all corners',()=>{
 for(const p of [{x:0,y:0},{x:180,y:180},{x:0,y:180},{x:180,y:0}]){
   const c=constrainCamera(p,52,29);assert.ok(c.x>=28&&c.x<=152);assert.ok(c.y>=16.5&&c.y<=163.5);
 }
});
test('minimap uses real physics positions and never fabricated grid dots',()=>{
 const a=new CrystalArena(500),player=a.addPlayer({id:'you',x:45,y:90,angle:1});
 const opponent=a.addPlayer({id:'bot',x:130,y:20});
 const f=a.addFood({x:20,y:40,type:'crystal_shard',mass:2});
 const map=minimapState(a);
 assert.equal(map.food.length,1);assert.equal(map.players.length,2);
 assert.equal(map.food[0].id,f.id);assert.equal(map.food[0].x,20/180);assert.equal(map.food[0].y,40/180);
 assert.equal(map.players.find(x=>x.isYou).x,.25);
 assert.equal(map.players.find(x=>x.id==='bot').y,20/180);
 a.food=[];assert.equal(minimapState(a).food.length,0);
});
test('lethal boundary prevents player head crossing arena world limits',()=>{
 const a=new CrystalArena(501),p=a.addPlayer({id:'you',x:179.46,y:90,angle:0});
 a.step();assert.equal(p.alive,false);assert.equal(p.lastDeath.cause,'boundary');
 assert.ok(p.x<180);assert.equal(p.lastDeath.x,p.x);
});
test('head movement within world remains legal until the boundary',()=>{
 const a=new CrystalArena(502),p=a.addPlayer({id:'you',x:85,y:85,angle:0});a.step();
 assert.equal(p.alive,true);assert.ok(p.x>85);
});
test('each rarity gets an individual dragon stage accent',()=>{
 assert.equal(Object.keys(PRESENTATION).length,6);
 assert.equal(new Set(Object.values(PRESENTATION).map(x=>x.glow)).size,6);
});

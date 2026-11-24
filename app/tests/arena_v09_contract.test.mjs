import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CrystalArena,RULES} from '../engine/arena.mjs';
import {FOOD_ICONS} from '../src/arena_presentation.mjs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const renderer=fs.readFileSync(new URL('../src/renderer.js',import.meta.url),'utf8');
test('live arena UI has score, time, alive, kill, boundary, defeat and interactive buttons',()=>{
 for(const id of ['arena-effects','live-score','arena-alive','arena-defeated','arena-timer','boundary-warning','arena-defeat-pop','final-score','final-rank'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const action of ['pause','magnet','shield','boost','home','share','play'])assert.ok(html.includes('data-action="'+action+'"'),action);
 assert.ok(main.includes('arenaPresentation.draw(arena,renderer,time)'));
 assert.ok(main.includes('arena.players.filter(q=>q.alive).length'));
 assert.ok(renderer.includes('this.currentVP=arena?vp:null'));
});
test('food icons cover every authored food type from real simulation',()=>{
 const game=new CrystalArena(341);game.seedFood(120);
 assert.equal(game.food.length,120);
 for(const f of game.food)assert.ok(FOOD_ICONS[f.type],f.type);
});
test('death trail preserves body path, victim identity and real death food',()=>{
 const game=new CrystalArena(552);const p=game.addPlayer({id:'dragon1',displayName:'NebulaWing',x:90,y:90,initialMass:90});
 const before=p.body.length;assert.ok(game.kill(p,'head','you'));
 const effect=game.effects[0];assert.equal(effect.victimName,'NebulaWing');assert.ok(effect.trail.length>=before);assert.ok(effect.trail.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));
 assert.ok(game.food.some(f=>f.source==='death'));
 for(let n=0;n<140;n++)game.step(RULES.fixedDt);
 assert.equal(game.effects.length,0);
});
test('real boundary collision kills and cannot teleport or move outside world',()=>{
 const game=new CrystalArena(116);const p=game.addPlayer({id:'you',x:RULES.worldSize-RULES.headRadius-.02,y:90,angle:0});
 game.step(RULES.fixedDt);assert.equal(p.alive,false);assert.equal(p.lastDeath.cause,'boundary');
 assert.ok(p.x<RULES.worldSize);
});

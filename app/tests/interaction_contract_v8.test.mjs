import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
test('primary on-screen actions are implemented',()=>{
 const cases=new Set([...main.matchAll(/case '([a-z0-9-]+)'/g)].map(m=>m[1]));
 for(const a of ['play','practice','friends','home','pause','resume','boost','magnet','speed','shield','creatures','shop','result','revive-coins']) {
  assert.match(html,new RegExp('data-action="'+a+'"'),a);
  assert.ok(cases.has(a),a+' has no action switch branch');
 }
});
test('active buffs, pointer cancel, named rivals and honest offline mode are wired',()=>{
 assert.match(html,/id="active-power-status"/);
 for(const key of ['pointercancel','lostpointercapture','visibilitychange','chooseNpcRoster','spendEnergy','displayName'])assert.match(main,new RegExp(key));
 assert.match(main,/not connected/);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),css=read('src/styles.css'),renderer=read('src/renderer.js');
const manifest=JSON.parse(read('manifest/game_assets.json'));
test('all reference-locked UI screens and four shop tabs are present',()=>{
  for(const id of ['splash','consent','home','arena','revive','result','shop','creatures','secondary'])assert.match(html,new RegExp(`id="${id}"`),id);
  for(const tab of ['offers','energy','coins','powerups'])assert.match(html,new RegExp(`data-shop="${tab}"`));
  for(const id of ['joystick','minimap','revive-clock','live-score','skin-picker','shop-items'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/data-visual-contract="92541-primary-92540-secondary"/);
});
test('all interactive controls have legal action bindings and no duplicate screen IDs',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'duplicate DOM ids');
  for(const v of ['play','home','creatures','shop','revive-coins','result','boost','pause','resume','settings','reference'])assert.match(html,new RegExp(`data-action="${v}"`));
});
test('all 24 characters preserve original identity and competitive parity',()=>{
  assert.equal(manifest.characters.length,24);
  assert.equal(new Set(manifest.characters.map(c=>c.id)).size,24);
  const rarities=['common','uncommon','rare','epic','legendary','mythic'];
  for(const rarity of rarities)assert.equal(manifest.characters.filter(c=>c.rarity===rarity).length,4,rarity);
  for(const c of manifest.characters){
    assert.deepEqual(c.gameplayModifiers,{},c.id+' cosmetics must not affect competitive gameplay');
    for(const f of [c['3d'].head,c['3d'].body,c['3d'].tail,c['3dPreview']])assert.ok(fs.existsSync(path.join(root,f)),f);
    assert.ok(fs.existsSync(path.join(root,'assets/death_effects/3d/',c.id+'_peak_burst.glb')));
  }
});
test('true WebGL2 renderer uses instanced 3D bodies and original 3D stage',()=>{
  assert.match(renderer,/drawElementsInstanced/);
  assert.match(renderer,/assets\/scene\/lobby_stage\.glb/);
  assert.match(renderer,/webgl2/);
  assert.ok(fs.statSync(path.join(root,'assets/scene/lobby_stage.glb')).size>5000);
});
test('reduced motion, responsive viewport and PWA offline shell are in package',()=>{
  assert.match(css,/prefers-reduced-motion/);
  assert.match(css,/@media \(orientation:portrait\)/);
  assert.match(html,/name="viewport"/);
  assert.match(html,/manifest\.webmanifest/);
  const webManifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(webManifest.orientation,'landscape');
  assert.ok(fs.statSync(path.join(root,'icons/dragon-512.png')).size>1000);
  assert.ok(fs.existsSync(path.join(root,'sw.js')));
});

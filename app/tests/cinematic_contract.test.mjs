import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('premium screens retain live 3D canvas and foreground controls',()=>{
 const html=read('index.html');assert.match(html,/id="scene3d"/);assert.match(html,/id="cosmic-backdrop"/);assert.match(html,/src\/cinematic\.css/);
 for(const action of ['play','creatures','lab-prev','lab-next','rotate-dragon','reset-dragon'])assert.match(html,new RegExp('data-action="'+action+'"'));
});
test('actual 3D previews are model-based, not baked screenshot buttons',()=>{
 const renderer=read('src/renderer.js');assert.match(renderer,/previewRotation/);assert.match(renderer,/drawSegments\(body/);
 const main=read('src/main.js');assert.match(main,/mountCosmicBackdrop/);assert.match(main,/labPointers=new Map/);
 assert.match(main,/zoomShowcase/);
});
test('procedural environment and PWA files are wired',()=>{
 const src=read('src/cosmic.mjs'),sw=read('sw.js');assert.match(src,/drawCosmic/);assert.match(src,/getContext\('2d'/);
 assert.match(sw,/cinematic\.css/);assert.match(sw,/cosmic\.mjs/);
});

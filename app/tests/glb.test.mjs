import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadGLB} from '../src/glb.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const gl={ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,STATIC_DRAW:35044,FLOAT:5126,TRIANGLES:4,
  createVertexArray:()=>({}),bindVertexArray:()=>{},createBuffer:()=>({}),bindBuffer:()=>{},bufferData:()=>{},enableVertexAttribArray:()=>{},vertexAttribPointer:()=>{}};
const origFetch=globalThis.fetch;
globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>{const b=await readFile(path.join(root,url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}});

test('real 3D GLB loader parses character, food, and death meshes',async()=>{
 const manifest=JSON.parse(await readFile(path.join(root,'manifest/game_assets.json'),'utf8'));
 assert.equal(manifest.characters.length,24);
 for(const c of manifest.characters){
  for(const part of ['head','body','tail']){
   const p=`assets/characters/${c.rarity}/${c.id}/3d/${part}.glb`;
   const m=await loadGLB(p,gl);assert.ok(m.parts.length>0,c.id+':'+part);assert.ok(m.parts.every(m=>m.count>0&&m.color.length===3));
  }
  const d=await loadGLB(`assets/death_effects/3d/${c.id}_peak_burst.glb`,gl);assert.ok(d.parts.length>0,c.id+':death');
 }
 for(const name of ['energy_orb','crystal_shard','star_dust','galaxy_orb','heart_core']){
  const m=await loadGLB(`assets/food/3d/${name}.glb`,gl);assert.ok(m.parts.length>0,name);
 }
});

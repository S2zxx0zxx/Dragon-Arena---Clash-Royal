import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadGLB} from '../src/glb.js';
const path=new URL('../assets/characters/mythic/time_wyrm/3d/preview_10_parts.glb',import.meta.url);
test('3D GLB batches 300+ primitives to a smaller set of GPU draw calls and frees resources',async()=>{
 const b=fs.readFileSync(path),old=globalThis.fetch;let made=0,freed=0;
 const gl={ARRAY_BUFFER:1,ELEMENT_ARRAY_BUFFER:2,STATIC_DRAW:3,FLOAT:4,
  createBuffer(){made++;return {};},createVertexArray(){made++;return {};},
  bindVertexArray(){},bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},
  deleteVertexArray(){freed++;},deleteBuffer(){freed++;}};
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)});
 try{const model=await loadGLB('synthetic.glb',gl);assert.ok(model.sourcePrimitiveCount>=300);
  assert.ok(model.parts.length<model.sourcePrimitiveCount/3);model.dispose();assert.equal(made,freed);}
 finally{globalThis.fetch=old;}
});

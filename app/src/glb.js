// Minimal, dependency-free glTF 2.0 binary triangle loader for this kit.
// Rejects unsupported accessors rather than silently corrupting meshes.
export async function loadGLB(url, gl) {
  const response = await fetch(url);
  if(!response.ok) throw new Error(`GLB HTTP ${response.status}: ${url}`);
  const arr = await response.arrayBuffer(), dv = new DataView(arr);
  if(dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2)throw new Error('Expected glTF 2.0 GLB');
  let off=12, doc=null, bin=null;
  while(off<arr.byteLength){
    const n=dv.getUint32(off,true),type=dv.getUint32(off+4,true);off+=8;
    if(type===0x4e4f534a)doc=JSON.parse(new TextDecoder().decode(new Uint8Array(arr,off,n)));
    if(type===0x004e4942)bin=arr.slice(off,off+n);
    off+=n;
  }
  if(!doc||!bin)throw new Error('Invalid GLB chunks');
  const bview=new DataView(bin);
  function accessor(idx){
    const a=doc.accessors[idx],v=doc.bufferViews[a.bufferView];
    if(a.sparse)throw new Error('Sparse accessors not implemented');
    const count=a.count,dim=({SCALAR:1,VEC2:2,VEC3:3,VEC4:4})[a.type];
    const elemSize=({5121:1,5123:2,5125:4,5126:4})[a.componentType];
    if(!dim||!elemSize)throw new Error('Unsupported accessor '+a.componentType);
    const stride=v.byteStride||dim*elemSize,begin=v.byteOffset+(a.byteOffset||0),out=[];
    for(let i=0;i<count;i++)for(let j=0;j<dim;j++){
      const o=begin+i*stride+j*elemSize;
      out.push(a.componentType===5126?bview.getFloat32(o,true):a.componentType===5125?bview.getUint32(o,true):a.componentType===5123?bview.getUint16(o,true):bview.getUint8(o));
    }
    return out;
  }

  // WebGL2 mobile fix: combine meshes sharing a material into one GPU draw call.
  // Trimesh scenes have hundreds of tiny meshes; v0.8 created 3 GPU objects per mesh.
  const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  const matmul=(a,b)=>{const r=Array(16).fill(0);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;};
  const matrix=n=>{
    if(n.matrix)return n.matrix;
    const [x,y,z,w]=n.rotation||[0,0,0,1],[sx,sy,sz]=n.scale||[1,1,1],[tx,ty,tz]=n.translation||[0,0,0];
    return [(1-2*(y*y+z*z))*sx,(2*(x*y+z*w))*sx,(2*(x*z-y*w))*sx,0,
      (2*(x*y-z*w))*sy,(1-2*(x*x+z*z))*sy,(2*(y*z+x*w))*sy,0,
      (2*(x*z+y*w))*sz,(2*(y*z-x*w))*sz,(1-2*(x*x+y*y))*sz,0,tx,ty,tz,1];
  };
  const instances=[];
  const visit=(idx,parent,visited)=>{
    if(visited.has(idx))throw Error('Cyclic GLB nodes');
    const n=doc.nodes?.[idx];if(!n)return;
    const m=matmul(parent,matrix(n));if(n.mesh!==undefined)instances.push([n.mesh,m]);
    const next=new Set(visited);next.add(idx);for(const child of n.children||[])visit(child,m,next);
  };
  const scene=doc.scenes?.[doc.scene||0];
  if(scene)for(const id of scene.nodes||[])visit(id,identity(),new Set());
  else if(doc.nodes?.length)for(const n of doc.nodes)if(n.mesh!==undefined)instances.push([n.mesh,matrix(n)]);
  else for(let i=0;i<(doc.meshes||[]).length;i++)instances.push([i,identity()]);
  const batches=new Map();let primitiveCount=0;
  for(const [idx,m] of instances){
    const mesh=doc.meshes[idx];if(!mesh)throw Error('Missing mesh '+idx);
    for(const primitive of mesh.primitives){
      if(primitive.mode!==undefined&&primitive.mode!==4)throw Error('Nontriangle GLB');
      const points=accessor(primitive.attributes.POSITION);
      const inds=primitive.indices===undefined?Array.from({length:points.length/3},(_,i)=>i):accessor(primitive.indices);
      const material=doc.materials?.[primitive.material||0]||{};
      const rgb=(material.pbrMetallicRoughness?.baseColorFactor||[.1,.8,1,1]).slice(0,3);
      const key=rgb.map(v=>Math.round(v*1000)).join(':');
      if(!batches.has(key))batches.set(key,{color:rgb,vertices:[],indices:[]});
      const batch=batches.get(key),offset=batch.vertices.length/3;
      for(let i=0;i<points.length;i+=3){
        const x=points[i],y=points[i+1],z=points[i+2];
        batch.vertices.push(m[0]*x+m[4]*y+m[8]*z+m[12],
          m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]);
      }
      for(const v of inds){if(v>=points.length/3)throw Error('GLB index overflow');batch.indices.push(offset+v);}
      primitiveCount++;
    }
  }
  const parts=[];
  try{
    for(const batch of batches.values()){
      const vao=gl.createVertexArray(),vb=gl.createBuffer(),ib=gl.createBuffer();
      if(!vao||!vb||!ib)throw Error('GPU buffer allocation failed');
      gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vb);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(batch.vertices),gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(batch.indices),gl.STATIC_DRAW);
      parts.push({vao,vb,ib,count:batch.indices.length,color:batch.color,instanceBuffer:null});
    }
    gl.bindVertexArray(null);
    return {url,parts,sourcePrimitiveCount:primitiveCount,
      dispose(){for(const p of parts){
        if(p.instanceBuffer)gl.deleteBuffer(p.instanceBuffer);
        gl.deleteBuffer(p.vb);gl.deleteBuffer(p.ib);gl.deleteVertexArray(p.vao);
      }}
    };
  }catch(error){
    gl.bindVertexArray(null);
    for(const p of parts){gl.deleteBuffer(p.vb);gl.deleteBuffer(p.ib);gl.deleteVertexArray(p.vao);}
    throw error;
  }
}

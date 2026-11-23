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
  const meshParts=[];
  for(const mesh of doc.meshes||[])for(const primitive of mesh.primitives){
    if(primitive.mode!==undefined&&primitive.mode!==4)throw new Error('Non-triangle GLB primitive');
    const points=accessor(primitive.attributes.POSITION);
    const inds=primitive.indices===undefined?points.map((_,i)=>i).filter(i=>i%3===0):accessor(primitive.indices);
    const indexArray=new Uint32Array(primitive.indices===undefined?Array.from({length:points.length/3},(_,i)=>i):inds);
    const vao=gl.createVertexArray();gl.bindVertexArray(vao);
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indexArray,gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    const material=doc.materials?.[primitive.material||0]||{};
    const rgb=material.pbrMetallicRoughness?.baseColorFactor||[.1,.8,1,1];
    meshParts.push({vao,count:indexArray.length,color:rgb.slice(0,3),metal:material.pbrMetallicRoughness?.metallicFactor||.15,instanceBuffer:null});
  }
  return {parts:meshParts,url};
}

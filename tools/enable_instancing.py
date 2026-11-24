from pathlib import Path
r=Path(__file__).resolve().parents[1]
glb=r/'app/src/glb.js';s=glb.read_text()
s=s.replace("meshParts.push({vao,count:indexArray.length,color:rgb.slice(0,3),metal:material.pbrMetallicRoughness?.metallicFactor||.15});", "meshParts.push({vao,count:indexArray.length,color:rgb.slice(0,3),metal:material.pbrMetallicRoughness?.metallicFactor||.15,instanceBuffer:null});")
glb.write_text(s)
rend=r/'app/src/renderer.js';s=rend.read_text()
s=s.replace('layout(location=0) in vec3 aPos;\nuniform mat4 uModel, uVP;out vec3 vWorld;out vec3 vLocal;\nvoid main(){vec4 wp=uModel*vec4(aPos,1.);vWorld=wp.xyz;vLocal=aPos;gl_Position=uVP*wp;}', '''layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aInstance;
uniform mat4 uModel, uVP;uniform float uInstanced,uSegmentScale;out vec3 vWorld;out vec3 vLocal;
void main(){
 vec4 wp=uModel*vec4(aPos,1.);
 if(uInstanced>.5){float ca=cos(aInstance.w),sa=sin(aInstance.w);
  vec3 scaled=aPos*uSegmentScale;
  wp=vec4(aInstance.x + scaled.x*ca+scaled.z*sa, aInstance.y+scaled.y, aInstance.z-scaled.x*sa+scaled.z*ca,1.);
 }
 vWorld=wp.xyz;vLocal=aPos;gl_Position=uVP*wp;
}''')
s=s.replace("['uModel','uVP','uColor','uCam','uGlow','uGround','uTime']", "['uModel','uVP','uColor','uCam','uGlow','uGround','uTime','uInstanced','uSegmentScale']")
s=s.replace("gl.uniformMatrix4fv(this.u.uModel,false,model);gl.uniform1f(this.u.uGlow,glow);", "gl.uniformMatrix4fv(this.u.uModel,false,model);gl.uniform1f(this.u.uInstanced,0);gl.uniform1f(this.u.uGlow,glow);")
find=' peek(path){const v=this.cache.get(path);return v&&v._value?v._value:null;}'
put=''' drawSegments(mesh,nodes,scale=.8,glow=.36){
  if(!mesh||!nodes.length)return;
  const gl=this.gl, data=new Float32Array(nodes.length*4);
  for(let i=0;i<nodes.length;i++){
   const node=nodes[i],ahead=i?nodes[i-1]:node;
   const angle=Math.atan2(ahead.z-node.z,ahead.x-node.x);
   data.set([node.x,node.h,node.z,Math.PI-angle],i*4);
  }
  gl.uniformMatrix4fv(this.u.uModel,false,identity());gl.uniform1f(this.u.uGround,0);
  gl.uniform1f(this.u.uInstanced,1);gl.uniform1f(this.u.uSegmentScale,scale);gl.uniform1f(this.u.uGlow,glow);
  for(const p of mesh.parts){
   gl.bindVertexArray(p.vao);
   if(!p.instanceBuffer)p.instanceBuffer=gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER,p.instanceBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
   gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,16,0);gl.vertexAttribDivisor(1,1);
   gl.uniform3fv(this.u.uColor,p.color);gl.drawElementsInstanced(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0,nodes.length);
   gl.vertexAttribDivisor(1,0);gl.disableVertexAttribArray(1);
  }
  gl.bindVertexArray(null);gl.uniform1f(this.u.uInstanced,0);
 }
'''+find
assert find in s
s=s.replace(find,put)
old='''   const lodStep=nodes.length>65?Math.ceil(nodes.length/65):1;
   for(let i=nodes.length-1;i>=1;i-=lodStep){let pos=nodes[i],ahead=nodes[i-1]||p;const a=Math.atan2(ahead.y-pos.y,ahead.x-pos.x);this.drawModel(i===nodes.length-1?tail:body,pos.x,.46+Math.sin(this.t*4-i*.5)*.04,pos.y,Math.PI-a,.8,.25);}
   this.drawModel(head,p.x,.52+Math.sin(this.t*4)*.04,p.y,Math.PI-p.angle,.87,p.id==='you'?.8:.43);'''
new='''   const visibleNodes=nodes.length>RULES_RENDER_MAX?nodes.filter((_,i)=>i%Math.ceil(nodes.length/RULES_RENDER_MAX)===0):nodes;
   const bodyTransforms=visibleNodes.slice(1,visibleNodes.length-1).map((node,i)=>({x:node.x,h:.46+Math.sin(this.t*3.4-i*.21)*.04,z:node.y}));
   this.drawSegments(body,bodyTransforms,.8,p.id==='you'?.55:.32);
   const tip=nodes[nodes.length-1],before=nodes[nodes.length-2]||p;
   this.drawModel(tail,tip.x,.48,tip.y,Math.PI-Math.atan2(before.y-tip.y,before.x-tip.x),.72,.48);
   this.drawModel(head,p.x,.52+Math.sin(this.t*4)*.04,p.y,Math.PI-p.angle,.87,p.id==='you'?.8:.48);'''
assert old in s
s=s.replace("const RAD=Math.PI/180;", "const RAD=Math.PI/180;\nconst RULES_RENDER_MAX=120; // dynamic body LOD cap; gameplay still tracks all 220 segments")
s=s.replace(old,new)
# Danger: single instance attribute buffer overwritten with normals? distinct per mesh. okay
rend.write_text(s)
print('GPU segment instancing enabled')

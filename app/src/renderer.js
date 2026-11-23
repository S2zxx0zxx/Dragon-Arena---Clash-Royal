import {loadGLB} from './glb.js';
const RAD=Math.PI/180;
const RULES_RENDER_MAX=120; // dynamic body LOD cap; gameplay still tracks all 220 segments
const VSH=`#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aInstance;
uniform mat4 uModel, uVP;uniform float uInstanced,uSegmentScale;out vec3 vWorld;out vec3 vLocal;
void main(){
 vec4 wp=uModel*vec4(aPos,1.);
 if(uInstanced>.5){float ca=cos(aInstance.w),sa=sin(aInstance.w);
  vec3 scaled=aPos*uSegmentScale;
  wp=vec4(aInstance.x + scaled.x*ca+scaled.z*sa, aInstance.y+scaled.y, aInstance.z-scaled.x*sa+scaled.z*ca,1.);
 }
 vWorld=wp.xyz;vLocal=aPos;gl_Position=uVP*wp;
}`;
const FSH=`#version 300 es
precision highp float;in vec3 vWorld;in vec3 vLocal;uniform vec3 uColor;uniform vec3 uCam;uniform float uGlow;uniform float uGround;uniform float uTime;out vec4 frag;
void main(){
 if(uGround>.5){
  float a=abs(fract(vWorld.x/2.)-.5),b=abs(fract(vWorld.z/2.)-.5);
  float lines=(1.-smoothstep(.474,.493,max(a,b)))*.075;
  float broad=(1.-smoothstep(.475,.50,max(abs(fract(vWorld.x/12.)-.5),abs(fract(vWorld.z/12.)-.5))))*.07;
  float r=length(vWorld.xz);vec3 base=mix(vec3(.022,.019,.079),vec3(.005,.059,.140),1.-smoothstep(0.,90.,r));
  frag=vec4(base+vec3(.00,.27,.45)*lines+vec3(.07,.18,.34)*broad,1.);return;
 }
 vec3 dx=dFdx(vWorld),dy=dFdy(vWorld);vec3 n=normalize(cross(dx,dy));
 vec3 eye=normalize(uCam-vWorld);if(dot(n,eye)<0.)n=-n;
 vec3 light=normalize(vec3(-.45,.82,.59));
 float diff=max(dot(n,light),0.);float rim=pow(1.-max(dot(n,eye),0.),2.6);
 float spec=pow(max(dot(reflect(-light,n),eye),0.),30.);
 float facet=pow(max(dot(n,normalize(vec3(.57,.82,.33))),0.),8.);
 float sheen=pow(max(dot(reflect(-normalize(vec3(-.30,.75,-.45)),n),eye),0.),54.);
 float opal=.5+.5*sin(vLocal.x*18. + vLocal.y*14. + vLocal.z*11. + uTime*.70);
 vec3 prism=mix(vec3(.12,.80,1.),vec3(.90,.16,1.),opal);
 vec3 base=uColor*(.27+1.04*diff)+vec3(.8,.96,1.)*spec*.76;
 base+=uColor*rim*(.68+uGlow*.53);base+=uColor*uGlow*.22;
 base+=prism*(rim*.32 + facet*.12 + sheen*.15)*(.65+uGlow*.45);
 base+=vec3(.35,.47,.89)*pow(max(dot(n,normalize(vec3(.6,.5,-.8))),0.),4.)*.24;
 // Spectral facets and sparkling edges, from actual 3D normals and animated light.
 frag=vec4(pow(clamp(base,vec3(0.),vec3(2.2)),vec3(.92)),1.);
}`;
function shader(gl,type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function matMultiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function identity(){const a=new Float32Array(16);a[0]=a[5]=a[10]=a[15]=1;return a;}
function T(x,y,z){const a=identity();a[12]=x;a[13]=y;a[14]=z;return a;}
function S(x,y,z){const a=identity();a[0]=x;a[5]=y;a[10]=z;return a;}
function Ry(a){const o=identity(),c=Math.cos(a),s=Math.sin(a);o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;}
function Rx(a){const o=identity(),c=Math.cos(a),s=Math.sin(a);o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o;}
function ortho(w,h,near,far){const o=identity();o[0]=2/w;o[5]=2/h;o[10]=-2/(far-near);o[14]=-(far+near)/(far-near);return o;}
function lookAt(eye,target,up=[0,1,0]){
 const sub=(a,b)=>a.map((v,i)=>v-b[i]);const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l)};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let z=norm(sub(eye,target)),x=norm(cross(up,z)),y=cross(z,x);
 let o=identity();o[0]=x[0];o[1]=y[0];o[2]=z[0];o[4]=x[1];o[5]=y[1];o[6]=z[1];o[8]=x[2];o[9]=y[2];o[10]=z[2];o[12]=-x.reduce((sum,v,i)=>sum+v*eye[i],0);o[13]=-y.reduce((sum,v,i)=>sum+v*eye[i],0);o[14]=-z.reduce((sum,v,i)=>sum+v*eye[i],0);return o;
}
export class CrystalRenderer {
 constructor(canvas){
  this.canvas=canvas;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.resolved?.clear();});const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance',depth:true});if(!gl)throw Error('WebGL2 unavailable');this.gl=gl;
  const prog=gl.createProgram();gl.attachShader(prog,shader(gl,gl.VERTEX_SHADER,VSH));gl.attachShader(prog,shader(gl,gl.FRAGMENT_SHADER,FSH));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));this.program=prog;
  this.u={};for(const n of ['uModel','uVP','uColor','uCam','uGlow','uGround','uTime','uInstanced','uSegmentScale'])this.u[n]=gl.getUniformLocation(prog,n);
  this.cache=new Map();this.scene='home';this.skin='neon_dragonling';this.arena=null;this.t=0;this.cameraAt=[0,0,0];
  const vertices=new Float32Array([-150,0,-150,150,0,-150,150,0,150,-150,0,150]);const indices=new Uint32Array([0,1,2,0,2,3]);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);let vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);let ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);this.ground={parts:[{vao,count:6,color:[.02,.06,.19]}]};
 }
 async preload(skin){
  const found=this.manifest?.characters?.find(c=>c.id===skin);if(!found)return;
  const dir=`assets/characters/${found.rarity}/${skin}/3d`;
  await Promise.all(['head','body','tail','preview_10_parts'].map(k=>this.get(`${dir}/${k}.glb`).catch(()=>null)));
 }
 async get(path){if(!this.cache.has(path))this.cache.set(path,loadGLB(path,this.gl).catch(e=>{this.cache.delete(path);throw e;}));return this.cache.get(path);}
 async useSkin(id){this.skin=id;await this.preload(id);}
 setManifest(manifest){this.manifest=manifest;}
 drawModel(mesh,x,y,z,angle=0,scale=1,glow=.4,transforms=null){if(!mesh)return;
  const gl=this.gl;let model=matMultiply(T(x,y,z),matMultiply(Ry(angle),S(scale,scale,scale)));
  if(transforms)model=matMultiply(model,transforms);
  gl.uniformMatrix4fv(this.u.uModel,false,model);gl.uniform1f(this.u.uInstanced,0);gl.uniform1f(this.u.uGlow,glow);gl.uniform1f(this.u.uGround,0);
  for(const p of mesh.parts){gl.bindVertexArray(p.vao);gl.uniform3fv(this.u.uColor,p.color);gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0);}gl.bindVertexArray(null);
 }
 drawSegments(mesh,nodes,scale=.8,glow=.36){
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
 peek(path){const v=this.cache.get(path);return v&&v._value?v._value:null;}
 // A resolved-promise cache is tracked separately to avoid await in render frame.
 async ready(path){const v=await this.get(path);this.resolved??=new Map();this.resolved.set(path,v);return v;}
 async prime(){
  const m=this.manifest?.characters?.find(c=>c.id===this.skin);if(!m)return;
  const base=`assets/characters/${m.rarity}/${m.id}/3d/`;
  await Promise.all(['head','body','tail','preview_10_parts'].map(k=>this.ready(base+k+'.glb')));
  for(const food of ['energy_orb','crystal_shard','star_dust','galaxy_orb','heart_core'])await this.ready(`assets/food/3d/${food}.glb`);
  await this.ready(`assets/death_effects/3d/${m.id}_peak_burst.glb`);
  await this.ready('assets/scene/lobby_stage.glb');
 }
 resize(){const dpr=Math.min(devicePixelRatio||1,(this.arena&&this.scene==='arena')?1.25:1.5),w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);return {w,h};}
 render(dt=0.016){if(this.lost)return;const gl=this.gl,{w,h}=this.resize();this.t+=dt;gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!w||!h)return;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
  const asp=w/h,arena=this.scene==='arena',home=this.scene==='home'||this.scene==='creatures',burst=this.scene==='revive';
  const pp=this.arena?.players?.find(p=>p.id==='you'),x=arena?(pp?.x||90):0,z=arena?(pp?.y||90):0;
  const eye=arena?[x,24,z+6]:[4.0,7.0,12.5],target=arena?[x,0,z]:[0,0,0];
  const vp=matMultiply(arena?ortho(33*asp,33,.1,200):perspective(42*RAD,asp,.1,200),lookAt(eye,target));
  gl.uniformMatrix4fv(this.u.uVP,false,vp);gl.uniform3fv(this.u.uCam,eye);gl.uniform1f(this.u.uTime,this.t);
  if(arena){gl.uniformMatrix4fv(this.u.uModel,false,identity());gl.uniform1f(this.u.uGround,1);for(const p of this.ground.parts){gl.bindVertexArray(p.vao);gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0)}gl.bindVertexArray(null);}
  else if(home){
   const m=this.manifest?.characters?.find(c=>c.id===this.skin);if(!m)return;let base=`assets/characters/${m.rarity}/${m.id}/3d/`;
   const model=this.resolved?.get(base+'preview_10_parts.glb');
   const stage=this.resolved?.get('assets/scene/lobby_stage.glb');
   // World-space 3D portal, floating hero and genuinely faceted crystal geometry.
   this.drawModel(stage,.38,-.32,-.10,this.t*.09,1.05,.90);
   this.drawModel(model,-2.65,-.26+Math.sin(this.t*1.24)*.14,0,Math.sin(this.t*.45)*.20,1.11,.84,matMultiply(Ry(.26),Rx(Math.sin(this.t*.73)*.024)));
   return;
  }else if(burst){
   const fx=this.resolved?.get(`assets/death_effects/3d/${this.skin}_peak_burst.glb`);
   for(let i=0;i<3;i++)this.drawModel(fx,Math.cos(this.t*.28+i*2.09)*.15,Math.sin(this.t*.4+i)*.12,0,this.t*(.28+i*.18),1.25-i*.24,.88);return;
  }else return;
  if(!this.arena)return;
  const visible=this.arena.food.filter(f=>Math.abs(f.x-x)<27&&Math.abs(f.y-z)<21).slice(0,95);
  for(const f of visible){const mesh=this.resolved?.get(`assets/food/3d/${f.type}.glb`);this.drawModel(mesh,f.x,.45+Math.sin(this.t*3+f.id)*.12,f.y,this.t*.7+f.id,.42,.78);}
  for(const p of this.arena.players){if(!p.alive||Math.abs(p.x-x)>30||Math.abs(p.y-z)>25)continue;
   const m=this.manifest?.characters?.find(c=>c.id===p.skin);if(!m)continue;const b=`assets/characters/${m.rarity}/${p.skin}/3d/`;
   const head=this.resolved?.get(b+'head.glb'),body=this.resolved?.get(b+'body.glb'),tail=this.resolved?.get(b+'tail.glb');
   const nodes=p.body||[];
   const visibleNodes=nodes.length>RULES_RENDER_MAX?nodes.filter((_,i)=>i%Math.ceil(nodes.length/RULES_RENDER_MAX)===0):nodes;
   const bodyTransforms=visibleNodes.slice(1,visibleNodes.length-1).map((node,i)=>({x:node.x,h:.46+Math.sin(this.t*3.4-i*.21)*.04,z:node.y}));
   this.drawSegments(body,bodyTransforms,.8,p.id==='you'?.55:.32);
   const tip=nodes[nodes.length-1],before=nodes[nodes.length-2]||p;
   this.drawModel(tail,tip.x,.48,tip.y,Math.PI-Math.atan2(before.y-tip.y,before.x-tip.x),.72,.48);
   this.drawModel(head,p.x,.52+Math.sin(this.t*4)*.04,p.y,Math.PI-p.angle,.87,p.id==='you'?.8:.48);
  }
  for(const e of this.arena.effects){const fx=this.resolved?.get(`assets/death_effects/3d/${e.skin}_peak_burst.glb`);const phase=Math.min(1,e.age/1.3),burstScale=Math.max(.01,Math.sin(phase*Math.PI)*1.3);
   this.drawModel(fx,e.x,.7,e.y,this.t*.9,burstScale,.9);
   if(phase<.55)this.drawModel(fx,e.x,.9,e.y,-this.t*.6,burstScale*.5,.6);}
 }
}

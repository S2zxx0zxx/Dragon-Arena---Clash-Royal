import {loadGLB} from './glb.js';
import {constrainCamera} from './polish.mjs';
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
precision highp float;
in vec3 vWorld;in vec3 vLocal;
uniform vec3 uColor;uniform vec3 uCam;
uniform float uGlow,uGround,uTime,uBarrier;
uniform int uArenaTheme;
out vec4 frag;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
void main(){
 if(uGround>.5){
  // Huge seamless arena plane: no tiled rectangular patches or synthetic hex grid.
  vec2 uv=vWorld.xz, slow=uv*.0042;
  float cloud=noise2(uv*.016+vec2(uTime*.0013,.1))*.39 + noise2(uv*.035)*.24 + noise2(uv*.088)*.13;
  float deep=pow(max(0.,sin(slow.x*3.4+sin(slow.y*2.4)*1.7)),5.);
  float galaxies=pow(max(0.,1.-distance(uv,vec2(129.,44.))/51.),4.);
  float nebula=cloud*.66+deep*.1+galaxies*.14;
  vec3 ink=vec3(.004,.005,.022),neb=vec3(.036,.018,.116),light=vec3(.15,.045,.26);
  if(uArenaTheme==1){ink=vec3(.002,.011,.025);neb=vec3(.013,.06,.083);light=vec3(.04,.22,.33);}
  else if(uArenaTheme==2){ink=vec3(.006,.009,.027);neb=vec3(.039,.033,.087);light=vec3(.11,.10,.23);}
  else if(uArenaTheme==3){ink=vec3(.003,.018,.031);neb=vec3(.018,.069,.051);light=vec3(.08,.17,.10);}
  else if(uArenaTheme==4){ink=vec3(.012,.003,.029);neb=vec3(.067,.016,.083);light=vec3(.25,.05,.28);}
  else if(uArenaTheme==5){ink=vec3(.006,.012,.026);neb=vec3(.041,.049,.075);light=vec3(.15,.18,.21);}
  vec3 col=mix(ink,neb,nebula)+light*galaxies*.27;
  vec2 starcell=floor(uv*1.15);float star=hash21(starcell);
  float localStar=length(fract(uv*1.15)-.5);
  float sparkle=(1.-smoothstep(.015,.085,localStar))*step(.986,star);
  col+=vec3(.35,.56,.97)*sparkle*(.55+.45*sin(uTime*1.7+star*50.));
  // A faint cosmic path adds motion without distracting from food and player.
  float curved=abs(sin(length(uv-vec2(85.,104.))*.028 + sin(uv.x*.012+uTime*.018)));
  col+=light*pow(max(0.,1.-curved),34.)*.11;
  frag=vec4(col,1.);return;
 }

 if(uBarrier>.5){
  vec2 p=vec2((vWorld.x+vWorld.z)*.17,vWorld.y*2.4);p.x+=mod(floor(p.y),2.)*.5;vec2 f=abs(fract(p)-.5);
  float edge=smoothstep(.43,.48,max(f.x,f.y));float pulse=.67+.33*sin(uTime*2.6+p.x*.17);
  vec3 energy=mix(vec3(.12,.01,.14),vec3(1.,.055,.13),.48+edge*.52);energy+=vec3(.9,.26,.02)*edge*2.4*pulse;
  frag=vec4(energy,.55+.42*edge);return;
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
  this.u={};for(const n of ['uModel','uVP','uColor','uCam','uGlow','uGround','uTime','uBarrier','uArenaTheme','uInstanced','uSegmentScale'])this.u[n]=gl.getUniformLocation(prog,n);
  this.cache=new Map();this.scene='home';this.skin='neon_dragonling';this.arena=null;this.t=0;this.cameraAt=[0,0,0];this.arenaTheme=0;this.graphicsQuality='balanced';this.glowEnabled=true;
  const vertices=new Float32Array([-1024,0,-1024,1024,0,-1024,1024,0,1024,-1024,0,1024]);const indices=new Uint32Array([0,1,2,0,2,3]);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);let vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);let ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);this.ground={parts:[{vao,count:6,color:[.02,.06,.19]}]};
  this.cameraAt=null;this.arenaElapsed=0;this.currentVP=null;this.lastViewHeight=24.5;this.previewRotation=0;this.previewZoom=1;this.boundary=this.makeArenaFence();
 }
 makeArenaFence(){
  const gl=this.gl,vertices=[],indices=[];
  const append=(a,b,top=2.6)=>{
   const i=vertices.length/3;
   vertices.push(a[0],.08,a[1],b[0],.08,b[1],b[0],top,b[1],a[0],top,a[1]);
   indices.push(i,i+1,i+2,i,i+2,i+3);
  };
  const edge=.58, far=179.42;
  const pts=[[edge,edge],[far,edge],[far,far],[edge,far],[edge,edge]];
  for(let k=0;k<4;k++){
   const a=pts[k],b=pts[k+1];
   // Visible translucent energy wall and taller prismatic spikes along the rim.
   append(a,b,2.6);
   for(let j=1;j<18;j++){
     const t=j/18,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
     let vx=k%2===0?.38:0,vy=k%2===1?.38:0;
     append([x-vx,y-vy],[x+vx,y+vy],j%3===0?3.1:2.5);
   }
  }
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(indices),gl.STATIC_DRAW);
  gl.bindVertexArray(null);return {parts:[{vao,count:indices.length,color:[.28,.16,.85]}]};
 }
 projectArena(x,z,y=.5){
  if(!this.currentVP)return null;const m=this.currentVP;
  const a=m[0]*x+m[4]*y+m[8]*z+m[12],b=m[1]*x+m[5]*y+m[9]*z+m[13];
  const w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;
  const nx=a/w,ny=b/w;return {x:(nx+1)*.5*this.canvas.clientWidth,y:(1-ny)*.5*this.canvas.clientHeight,visible:nx>-1.05&&nx<1.05&&ny>-1.05&&ny<1.05};
 }
 rotateShowcase(delta){this.previewRotation=(this.previewRotation+delta)%(Math.PI*2);}
 zoomShowcase(delta){this.previewZoom=Math.max(.72,Math.min(1.27,this.previewZoom+delta));}
 resetShowcase(){this.previewRotation=0;this.previewZoom=1;}
 async preload(skin){
  const found=this.manifest?.characters?.find(c=>c.id===skin);if(!found)return;
  const dir=`assets/characters/${found.rarity}/${skin}/3d`;
  await Promise.all(['head','body','tail'].map(k=>this.get(`${dir}/${k}.glb`).catch(()=>null)));
 }
 async get(path){if(!this.cache.has(path))this.cache.set(path,loadGLB(path,this.gl).catch(e=>{this.cache.delete(path);throw e;}));return this.cache.get(path);}
 async useSkin(id){this.skin=id;await this.preload(id);}
 setManifest(manifest){this.manifest=manifest;}
 drawModel(mesh,x,y,z,angle=0,scale=1,glow=.4,transforms=null,barrier=false){if(!mesh)return;
  const gl=this.gl;let model=matMultiply(T(x,y,z),matMultiply(Ry(angle),S(scale,scale,scale)));
  if(transforms)model=matMultiply(model,transforms);
  gl.uniformMatrix4fv(this.u.uModel,false,model);gl.uniform1f(this.u.uInstanced,0);gl.uniform1f(this.u.uGlow,this.glowEnabled?glow:0.05);gl.uniform1f(this.u.uGround,0);gl.uniform1f(this.u.uBarrier,barrier?1:0);
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
  gl.uniform1f(this.u.uInstanced,1);gl.uniform1f(this.u.uSegmentScale,scale);gl.uniform1f(this.u.uGlow,this.glowEnabled?glow:0.05);
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

 async prime(mode='hero'){
  const c=this.manifest?.characters?.find(x=>x.id===this.skin);
  if(!c)throw Error('Selected 3D dragon not found');
  const prefix='assets/characters/'+c.rarity+'/'+c.id+'/3d/';
  for(const part of ['head','body','tail'])await this.ready(prefix+part+'.glb');
  if(mode==='arena'){
   for(const food of this.manifest?.food||[])try{await this.ready('assets/food/3d/'+food.id+'.glb');}
    catch(error){console.warn('Optional food GLB unavailable',food.id,error);}
   try{await this.ready('assets/death_effects/3d/'+c.id+'_peak_burst.glb');}
    catch(error){console.warn('Optional death effect unavailable',error);}
  }else{
   try{await this.ready('assets/scene/lobby_stage.glb');}
   catch(error){console.warn('Optional stage unavailable',error);}
  }
 }
 async streamRivals(rivals,match){
  for(const rival of rivals){
   if(this.arena!==match)return;
   const c=this.manifest?.characters?.find(x=>x.id===rival.skin);
   if(!c)continue;
   for(const part of ['head','body','tail']){
    if(this.arena!==match)return;
    try{await this.ready('assets/characters/'+c.rarity+'/'+c.id+'/3d/'+part+'.glb');}
    catch(error){console.warn('NPC mesh unavailable',c.id,part,error);}
   }
   await new Promise(resolve=>setTimeout(resolve,0));
  }
 }
 releaseArenaAssets(){
  if(!this.resolved)return;
  const c=this.manifest?.characters?.find(x=>x.id===this.skin);
  const keep=c?'assets/characters/'+c.rarity+'/'+c.id+'/3d/':'';
  for(const [path,model] of this.resolved){
   if(path.startsWith('assets/characters/')&&!path.startsWith(keep)){
    model.dispose?.();this.resolved.delete(path);this.cache.delete(path);
   }
  }
 }
 resize(){const dpr=Math.min(devicePixelRatio||1,this.graphicsQuality==='battery'?.85:this.graphicsQuality==='high'?1.65:(this.arena&&this.scene==='arena')?1.25:1.5),w=Math.round(this.canvas.clientWidth*dpr),h=Math.round(this.canvas.clientHeight*dpr);if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);return {w,h};}
 render(dt=0.016){if(this.lost)return;const gl=this.gl,{w,h}=this.resize();this.t+=dt;gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!w||!h)return;
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
  const asp=w/h,arena=this.scene==='arena',home=this.scene==='home'||this.scene==='creatures',splash=this.scene==='splash',burst=this.scene==='revive';
  const pp=this.arena?.players?.find(p=>p.id==='you');
  if(arena&&this.arenaElapsed<10)this.arenaElapsed+=dt;
  const viewHeight=arena?24.5+8*Math.exp(-this.arenaElapsed*1.5):29,viewWidth=viewHeight*asp;this.lastViewHeight=viewHeight;
  const desired=constrainCamera({x:pp?.x??90,y:pp?.y??90},viewWidth,viewHeight);
  if(!this.cameraAt||!arena)this.cameraAt={...desired};
  else{
    // Smooth, bounded follow: never show untextured world or jerk at a boundary.
    const factor=Math.min(1,dt*5.8);
    this.cameraAt.x+=(desired.x-this.cameraAt.x)*factor;
    this.cameraAt.y+=(desired.y-this.cameraAt.y)*factor;
  }
  const x=arena?this.cameraAt.x:0,z=arena?this.cameraAt.y:0;
  const isLab=this.scene==='creatures';
  const eye=arena?[x,30,z+5]:isLab?[1.5,4.6,10.2]:splash?[0,5.05,12.3]:[2.6,5.85,11.8];
  const target=arena?[x,0,z]:[0,.6,0];
  const vp=matMultiply(arena?ortho(viewWidth,viewHeight,.1,300):perspective(43*RAD,asp,.1,300),lookAt(eye,target));
  this.currentVP=arena?vp:null;gl.uniformMatrix4fv(this.u.uVP,false,vp);gl.uniform1f(this.u.uBarrier,0);gl.uniform3fv(this.u.uCam,eye);gl.uniform1f(this.u.uTime,this.t);gl.uniform1i(this.u.uArenaTheme,this.arenaTheme||0);
  if(arena){gl.uniformMatrix4fv(this.u.uModel,false,identity());gl.uniform1f(this.u.uGround,1);for(const p of this.ground.parts){gl.bindVertexArray(p.vao);gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,0)}gl.bindVertexArray(null);
   // World-space perimeter on all four edges: shader never paints a broken panel outside it.
   gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.drawModel(this.boundary,0,0,0,0,1,1.4,null,true);gl.disable(gl.BLEND);
  }
  else if(home||splash){
   const m=this.manifest?.characters?.find(c=>c.id===this.skin);if(!m)return;let base=`assets/characters/${m.rarity}/${m.id}/3d/`;
   const stage=this.resolved?.get('assets/scene/lobby_stage.glb');
   const head=this.resolved?.get(base+'head.glb'),body=this.resolved?.get(base+'body.glb'),tail=this.resolved?.get(base+'tail.glb');
   // Live procedural spine: each GLB is a real mesh and the complete 3D creature
   // curves, breathes and trails without flipping a pre-rendered image sheet.
   // Stage and floating dragon have distinct world-space height; this is NOT a flat portrait.
   const rotate=isLab?this.previewRotation+Math.sin(this.t*.36)*.10:Math.sin(this.t*.30)*.12;
   const zoom=isLab?this.previewZoom*1.07:splash?1.05:1;
   const rise=1.5+Math.sin(this.t*1.45)*.14;
   const count=18,points=[];
   for(let i=0;i<count;i++){
    const f=i/(count-1);
    const lateral=Math.sin(f*6.0-this.t*1.05)*.54*f;
    const ix=3.85-i*.46,zVal=lateral+.2*Math.cos(f*3.7+this.t*.3);
    const s=Math.sin(rotate),c=Math.cos(rotate);
    points.push({x:(ix*c-zVal*s)*zoom,h:(rise+.34*Math.sin(f*3.5-this.t*.6))*zoom,
      z:(ix*s+zVal*c)*zoom});
   }
   const rarity=this.manifest?.characters?.find(c=>c.id===this.skin)?.rarity||'common';
   const stageTint={common:.88,uncommon:.96,rare:1.05,epic:1.13,legendary:1.25,mythic:1.32}[rarity]||1;
   this.drawModel(stage,0,-1.65,-.25,-this.t*.13,stageTint,1.12);
   // Gold and mythic creatures earn extra orbital stage lighting, not gameplay power.
   if(isLab&&['legendary','mythic'].includes(rarity))this.drawModel(stage,0,-1.72,-.25,this.t*.12,1.01,.72);
   this.drawSegments(body,points.slice(1,-1),.83*zoom,.88);
   const p0=points[0],tip=points[count-1],prev=points[count-2];
   this.drawModel(head,p0.x,p0.h,p0.z,Math.PI-rotate,.94*zoom,.98,matMultiply(Ry(Math.sin(this.t*.63)*.075),Rx(Math.sin(this.t*.8)*.034)));
   this.drawModel(tail,tip.x,tip.h,tip.z,Math.PI-rotate+Math.sin(this.t*2.5)*.20,.75*zoom,.81);
   // Reuse animated hero instead of loading hundreds of unused loading-screen preview geometries.

   return;
  }else if(burst){
   const fx=this.resolved?.get(`assets/death_effects/3d/${this.skin}_peak_burst.glb`);
   for(let i=0;i<3;i++)this.drawModel(fx,Math.cos(this.t*.28+i*2.09)*.15,Math.sin(this.t*.4+i)*.12,0,this.t*(.28+i*.18),1.25-i*.24,.88);return;
  }else return;
  if(!this.arena)return;
  const visible=this.arena.food.filter(f=>Math.abs(f.x-x)<viewWidth*.58&&Math.abs(f.y-z)<viewHeight*.65).slice(0,100);
  for(const f of visible){const mesh=this.resolved?.get(`assets/food/3d/${f.type}.glb`);this.drawModel(mesh,f.x,.52+Math.sin(this.t*2.6+f.id)*.15,f.y,this.t*.65+f.id,.78+(f.mass>=3?.2:0),.93);}
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

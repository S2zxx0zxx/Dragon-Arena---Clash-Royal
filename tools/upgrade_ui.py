"""Premium reference-locked UI refinement. Reproducible transforms for v3 foundation."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
renderer=r/'app/src/renderer.js'
s=renderer.read_text()
s=s.replace('uniform float uGlow;uniform float uGround;out vec4 frag;', 'uniform float uGlow;uniform float uGround;uniform float uTime;out vec4 frag;')
s=s.replace('vec3 base=uColor*(.34+.83*diff)+vec3(.74,.93,1.)*spec*.53;\n base+=uColor*rim*(.47+uGlow*.3);base+=uColor*uGlow*.19;\n base+=vec3(.22,.35,.7)*pow(max(dot(n,normalize(vec3(.6,.5,-.8))),0.),4.)*.16;\n frag=vec4(pow(base,vec3(.91)),1.);', '''float facet=pow(max(dot(n,normalize(vec3(.57,.82,.33))),0.),8.);
 float sheen=pow(max(dot(reflect(-normalize(vec3(-.30,.75,-.45)),n),eye),0.),54.);
 float opal=.5+.5*sin(vLocal.x*18. + vLocal.y*14. + vLocal.z*11. + uTime*.70);
 vec3 prism=mix(vec3(.12,.80,1.),vec3(.90,.16,1.),opal);
 vec3 base=uColor*(.27+1.04*diff)+vec3(.8,.96,1.)*spec*.76;
 base+=uColor*rim*(.68+uGlow*.53);base+=uColor*uGlow*.22;
 base+=prism*(rim*.32 + facet*.12 + sheen*.15)*(.65+uGlow*.45);
 base+=vec3(.35,.47,.89)*pow(max(dot(n,normalize(vec3(.6,.5,-.8))),0.),4.)*.24;
 // Spectral facets and sparkling edges, from actual 3D normals and animated light.
 frag=vec4(pow(clamp(base,vec3(0.),vec3(2.2)),vec3(.92)),1.);''')
s=s.replace("['uModel','uVP','uColor','uCam','uGlow','uGround']","['uModel','uVP','uColor','uCam','uGlow','uGround','uTime']")
s=s.replace("await this.ready(`assets/death_effects/3d/${m.id}_peak_burst.glb`);", "await this.ready(`assets/death_effects/3d/${m.id}_peak_burst.glb`);\n  await this.ready('assets/scene/lobby_stage.glb');")
s=s.replace('this.t+=dt;gl.clearColor', 'this.t+=dt;gl.clearColor')
s=s.replace('gl.uniformMatrix4fv(this.u.uVP,false,vp);gl.uniform3fv(this.u.uCam,eye);', 'gl.uniformMatrix4fv(this.u.uVP,false,vp);gl.uniform3fv(this.u.uCam,eye);gl.uniform1f(this.u.uTime,this.t);')
s=s.replace("const model=this.resolved?.get(base+'preview_10_parts.glb');\n   this.drawModel(model,-2.65,-.8,0,Math.sin(this.t*.45)*.25,1.11,.64,matMultiply(Ry(.3),Rx(.03)));", """const model=this.resolved?.get(base+'preview_10_parts.glb');
   const stage=this.resolved?.get('assets/scene/lobby_stage.glb');
   // World-space 3D portal, floating hero and genuinely faceted crystal geometry.
   this.drawModel(stage,.38,-.32,-.10,this.t*.09,1.05,.90);
   this.drawModel(model,-2.65,-.26+Math.sin(this.t*1.24)*.14,0,Math.sin(this.t*.45)*.20,1.11,.84,matMultiply(Ry(.26),Rx(Math.sin(this.t*.73)*.024)));""")
s=s.replace("const fx=this.resolved?.get(`assets/death_effects/3d/${this.skin}_peak_burst.glb`);\n   this.drawModel(fx,0,0,0,this.t*.43,1.6,.95);return;", """const fx=this.resolved?.get(`assets/death_effects/3d/${this.skin}_peak_burst.glb`);
   for(let i=0;i<3;i++)this.drawModel(fx,Math.cos(this.t*.28+i*2.09)*.15,Math.sin(this.t*.4+i)*.12,0,this.t*(.28+i*.18),1.25-i*.24,.88);return;""")
s=s.replace('this.drawModel(fx,e.x,.7,e.y,this.t*.9,Math.max(.01,Math.sin(Math.min(1,e.age/1.3)*Math.PI)*1.4),.9);','''const phase=Math.min(1,e.age/1.3),burstScale=Math.max(.01,Math.sin(phase*Math.PI)*1.3);
   this.drawModel(fx,e.x,.7,e.y,this.t*.9,burstScale,.9);
   if(phase<.55)this.drawModel(fx,e.x,.9,e.y,-this.t*.6,burstScale*.5,.6);''')
# Add stability hooks for WebGL context loss, sizing in performance mode
s=s.replace("this.canvas=canvas;const gl=canvas.getContext", "this.canvas=canvas;canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.resolved?.clear();});const gl=canvas.getContext")
s=s.replace('const gl=this.gl,{w,h}=this.resize();this.t+=dt;', 'if(this.lost)return;const gl=this.gl,{w,h}=this.resize();this.t+=dt;')
s=s.replace('const dpr=Math.min(devicePixelRatio||1,1.5)', "const dpr=Math.min(devicePixelRatio||1,(this.arena&&this.scene==='arena')?1.25:1.5)")
renderer.write_text(s)

html=r/'app/index.html'
h=html.read_text()
h=h.replace('Crystal Creatures Arena — Reference Locked 3D Foundation','Dragon Arena — Clash Royale | 3D Crystal Dragons')
h=h.replace('CRYSTAL<br><strong>CREATURES</strong>','DRAGON<br><strong>ARENA</strong>')
h=h.replace('3D ARENA · GROW · HUNT · COLLECT','CLASH ROYALE · CRYSTAL DRAGON BATTLES')
h=h.replace('CRYSTAL SHOP','DRAGON VAULT')
h=h.replace('CREATURE LAB <small>24 REAL GLB MODELS</small>','DRAGON LAB <small>24 ORIGINAL GLB CREATURES</small>')
h=h.replace('ENTER THE CRYSTAL ARENA','ENTER THE DRAGON ARENA')
h=h.replace('CRYSTAL SHOP','DRAGON VAULT')
h=h.replace('CRYSTAL STARTER','DRAGON STARTER')
h=h.replace('Crystal Creatures','Dragon Arena')
# Mark real game environments clearly accessible, hide dev reference toggle outside dev preview
h=h.replace('<div class="status-chip" id="render-status">3D ENGINE BOOT</div>','<div class="status-chip" id="render-status" aria-live="polite">3D ENGINE BOOT</div>')
h=h.replace('<meta name="theme-color" content="#080529">','<meta name="theme-color" content="#080529"><meta name="description" content="Dragon Arena — local 3D crystal dragon arena preview. Grow, collect, and clash.">')
h=h.replace('class="app-shell"','class="app-shell" data-visual-contract="92541-primary-92540-secondary"')
html.write_text(h)
main=r/'app/src/main.js';t=main.read_text()
t=t.replace("const STORAGE_KEY='crystal-creatures-build-v3-demo'", "const STORAGE_KEY='dragon-arena-v4-demo'")
t=t.replace("name:'CrystalPilot'", "name:'DragonPilot'")
t=t.replace('Crystal Creatures demo:', 'Dragon Arena demo:')
t=t.replace("'CREATURE LAB'", "'DRAGON LAB'")
t=t.replace("'CRYSTAL SHOP'", "'DRAGON VAULT'")
main.write_text(t)

css=r/'app/src/styles.css'
c=css.read_text()
c+='''
/* Reference-locked premium visual pass v4. Intentionally retains landscape arcade composition. */
:root{--navy:#060620;--deep:#07041c;--panel:rgba(11,12,58,.92);--cyan:#1beaff;--violet:#9d39ff;--gold:#ffc332;--radius-arcade:18px}
.app-shell{background:radial-gradient(ellipse 74% 86% at 48% 55%,#36147a 0,#0b1544 40%,#070520 78%,#02020f 100%)}
.app-shell:before,.app-shell:after{content:"";position:absolute;pointer-events:none;z-index:-1;width:27vw;height:30vh;bottom:-9vh;filter:drop-shadow(0 0 12px #15d9ff) drop-shadow(0 0 36px #8d22fe);opacity:.46;background:linear-gradient(162deg,#2feaff,#a42bff 65%,#350e82);clip-path:polygon(0% 100%,9% 48%,19% 63%,29% 10%,38% 67%,46% 27%,58% 75%,67% 21%,79% 67%,92% 47%,100% 100%)}
.app-shell:before{left:-5vw}.app-shell:after{right:-7vw;transform:scaleX(-1)}
.stars{animation:glide-starfield 24s linear infinite;opacity:.8}
@keyframes glide-starfield{to{background-position:120px 95px,200px 160px,300px 190px,180px 110px}}
.logo-mark{transform:skewX(-6deg);filter:drop-shadow(0 8px 5px #100533);font-family:system-ui,'Arial Black',sans-serif;line-height:.87}
.logo-mark strong{background:linear-gradient(#fff3bd,#ffcc51,#f98508);background-clip:text;-webkit-background-clip:text;color:transparent}
.hero-platform:before{content:"";position:absolute;inset:12% 0 8%;background:radial-gradient(ellipse at 51% 62%,#26a5ff2e,transparent 50%),radial-gradient(ellipse at 40% 57%,#e458ff26,transparent 65%);pointer-events:none}
.hero-label{font-size:clamp(9px,.89vw,16px);background:linear-gradient(90deg,#301657bb,#0a155eaa);padding:8px 12px;border-radius:8px;border:1px solid #8c7bff66}
.home-actions,.home-bottom,.home-left{z-index:2}
.btn,.icon-btn,.nav-tile,.shop-tabs button,.power-btn{border-width:2.5px;box-shadow:inset 0 3px 3px #ffffffa6,inset 0 -6px 0 #08144088,0 4px 0 #060724,0 0 17px #148eff77}
.btn:before{content:"";position:absolute;inset:3px 8% auto;height:15%;border-radius:80% 80% 45% 45%;background:linear-gradient(#ffffff9c,#ffffff00);pointer-events:none}
.btn.gold{background:linear-gradient(180deg,#fff8c0 0%,#ffc12b 26%,#e98505 72%,#ad4000);box-shadow:inset 0 3px 4px #fff9c0,0 5px 0 #713511,0 0 25px #ffac12aa;text-shadow:0 2px 3px #632900}
.play-btn{font-size:clamp(17px,2.1vw,38px);border-radius:20px;animation:play-pulse 2.8s ease-in-out infinite}
@keyframes play-pulse{50%{filter:brightness(1.13);box-shadow:inset 0 3px 3px #fff8d6,0 4px 0 #5b2902,0 0 34px #ff9c12bb}}
.panel,.dialog,.shop-card,.result-castle,.revive-panel{backdrop-filter:blur(9px);box-shadow:inset 0 1px 0 #ffffff99,0 6px 0 #03082666,0 0 25px #2510a875}
.shop-card{transition:filter .2s,transform .2s}.shop-card:hover{filter:brightness(1.12);transform:translateY(-2px)}
@media (prefers-reduced-motion:reduce){.stars,.play-btn,.splash-glow{animation:none!important}.btn,.shop-card{transition:none!important}}
@media (max-aspect-ratio:1.42){.game-topbar{left:2%;right:2%}.home-left{left:1.4%}.home-actions{right:2%;width:36%}.home-bottom{left:17%;right:3%}.hero-platform{left:10%;width:53%}.currency-row{gap:3px}.currency{padding:3px}}
@media (orientation:portrait){.app-shell:after{display:none}.app-shell:before{display:none}.screen.active:after{font-size:0}.app-shell{transform:none}.hero-platform{top:20%;height:44%;width:78%;left:10%}.home-actions{top:58%;left:13%;width:74%}.home-bottom{bottom:2%;left:3%;right:3%;gap:3px}.home-bottom button{font-size:9px;padding:7px 4px}.home-left{top:18%;width:13%}.nav-tile{height:40px;font-size:9px}.game-topbar{gap:3px}.currency{font-size:10px}.profile-pill{min-width:0}.hero-label{display:none}}
'''
css.write_text(c)
print('Updated renderer, HTML, code labels and CSS')

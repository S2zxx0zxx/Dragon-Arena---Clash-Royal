/** Runtime 2.5D food billboards and hit feedback layered over real 3D GLB meshes.
 * Visuals use real world positions, kills, drop trails and collection values. */
export const FOOD_ICONS=Object.freeze({energy_orb:'🍎',crystal_shard:'🧀',star_dust:'🍰',heart_core:'🍇',coin_core:'🥕',galaxy_orb:'🍔',element_gem:'🌽',xp_crystal:'🥝',event_star:'🍅',mystic_cube:'🥪'});
export const FOOD_COLORS=Object.freeze({energy_orb:'#ff626d',crystal_shard:'#ffd94c',star_dust:'#ff83c8',heart_core:'#b458ff',coin_core:'#ffac34',galaxy_orb:'#ffd160',element_gem:'#9cf25a',xp_crystal:'#81ffe7',event_star:'#ff655e',mystic_cube:'#ffca79'});
const TAU=Math.PI*2;
export class ArenaPresentation{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.tiles=new Map();this.picks=[];this.quality='balanced';}
 makeTile(type){
  const image=document.createElement('canvas');image.width=image.height=112;
  const c=image.getContext('2d'),shade=c.createRadialGradient(56,52,8,56,56,53);
  shade.addColorStop(0,'#ffffff30');shade.addColorStop(.65,(FOOD_COLORS[type]||'#39dfff')+'30');shade.addColorStop(1,'#00000000');
  c.fillStyle=shade;c.beginPath();c.arc(56,56,54,0,TAU);c.fill();
  c.font='78px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';c.textAlign='center';c.textBaseline='middle';
  c.shadowColor=FOOD_COLORS[type]||'#5fffff';c.shadowBlur=9;c.fillText(FOOD_ICONS[type]||'💎',56,54);
  this.tiles.set(type,image);return image;
 }
 pickup(mass,x,y){this.picks.push({mass,x,y,time:performance.now()});if(this.picks.length>8)this.picks.shift();}
 draw(arena,renderer,time=performance.now()){
  const {canvas,ctx}=this;if(!ctx||!arena||!renderer?.projectArena)return;
  const dpr=Math.min(devicePixelRatio||1,1.6),w=Math.round(canvas.clientWidth*dpr),h=Math.round(canvas.clientHeight*dpr);
  if(w<1||h<1)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  ctx.clearRect(0,0,w,h);ctx.setTransform(dpr,0,0,dpr,0,0);
  const food=arena.food.filter(f=>renderer.projectArena(f.x,f.y,.5)?.visible).slice(0,this.quality==='battery'?40:65);
  for(const f of food){
   const at=renderer.projectArena(f.x,f.y,.5);if(!at?.visible)continue;
   const size=Math.min(56,Math.max(27,34+f.mass*2.6)),pulse=Math.sin(time*.0024+f.id)*1.3;
   ctx.save();ctx.fillStyle='#03051999';ctx.beginPath();ctx.ellipse(at.x,at.y+size*.38,size*.34,size*.12,0,0,TAU);ctx.fill();
   if(f.source==='death'){ctx.shadowColor='#ff78e8';ctx.shadowBlur=16;ctx.strokeStyle='#fe8cf7a8';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(at.x,at.y,size*.43,0,TAU);ctx.stroke();}
   ctx.shadowColor=FOOD_COLORS[f.type]||'#8ff';ctx.shadowBlur=7;
   const tile=this.tiles.get(f.type)||this.makeTile(f.type);
   ctx.drawImage(tile,at.x-size*.57,at.y-size*.64+pulse,size*1.14,size*1.14);ctx.restore();
  }
  for(const fx of arena.effects){
   if(!fx.trail?.length)continue;const alive=Math.max(0,1-fx.age/2.2);if(!alive)continue;
   ctx.save();ctx.globalAlpha=alive;ctx.lineJoin='round';ctx.lineCap='round';
   for(const [width,color,blur] of [[13,'#fc31e8',25],[6,'#38caff',13],[2.5,'#fff8bd',5]]){
    ctx.beginPath();let begun=false;
    for(const pos of fx.trail){const pt=renderer.projectArena(pos.x,pos.y,.65);if(!pt?.visible){begun=false;continue;}if(!begun){ctx.moveTo(pt.x,pt.y);begun=true;}else ctx.lineTo(pt.x,pt.y);}
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.stroke();
   }
   const impact=renderer.projectArena(fx.x,fx.y,.68);
   if(impact?.visible){
    const radius=18+fx.age*44;ctx.lineWidth=3.5;ctx.strokeStyle='#fff1a0';ctx.shadowColor='#e648ff';ctx.shadowBlur=23;ctx.beginPath();ctx.arc(impact.x,impact.y,radius,0,TAU);ctx.stroke();
    for(let i=0;i<12;i++){const a=i*TAU/12+fx.age*1.4,d=fx.age*(28+i*3);ctx.fillStyle=i%2?'#ffe78c':'#f67fff';ctx.beginPath();ctx.arc(impact.x+Math.cos(a)*d,impact.y+Math.sin(a)*d,2.5+alive*2,0,TAU);ctx.fill();}
   }ctx.restore();
  }
  this.picks=this.picks.filter(p=>time-p.time<820);
  for(const p of this.picks){
   const pt=renderer.projectArena(p.x,p.y,.8);if(!pt?.visible)continue;const t=(time-p.time)/820;
   ctx.save();ctx.globalAlpha=1-t;ctx.textAlign='center';ctx.font='900 24px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#301157';ctx.strokeText('+'+p.mass,pt.x,pt.y-26-t*45);ctx.fillStyle='#fff199';ctx.shadowColor='#fd65ff';ctx.shadowBlur=10;ctx.fillText('+'+p.mass,pt.x,pt.y-26-t*45);ctx.restore();
  }
  ctx.setTransform(1,0,0,1,0,0);
 }
}
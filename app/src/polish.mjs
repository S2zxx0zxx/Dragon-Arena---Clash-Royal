/** Dragon Arena reference-locked UI helpers. Zero DOM and zero network access. */
import {RULES} from '../engine/arena.mjs';
export const WORLD_SIZE=RULES.worldSize;
export const ARENA_MARGIN=1.25;
export function boundPoint(x,y,size=WORLD_SIZE,margin=ARENA_MARGIN){
  return {x:Math.max(margin,Math.min(size-margin,x)),y:Math.max(margin,Math.min(size-margin,y))};
}
export function constrainCamera(position,viewportWidth,viewportHeight,size=WORLD_SIZE,padding=2){
  const halfW=Math.min(size/2,viewportWidth/2+padding),halfH=Math.min(size/2,viewportHeight/2+padding);
  return {x:Math.max(halfW,Math.min(size-halfW,position.x)),y:Math.max(halfH,Math.min(size-halfH,position.y))};
}
export function minimapState(arena,playerId='you'){
  if(!arena)return {food:[],players:[],boundary:WORLD_SIZE};
  return {boundary:WORLD_SIZE,
    food:arena.food.map(f=>({id:f.id,x:f.x/WORLD_SIZE,y:f.y/WORLD_SIZE,type:f.type,mass:f.mass})),
    players:arena.players.filter(p=>p.alive).map(p=>({id:p.id,x:p.x/WORLD_SIZE,y:p.y/WORLD_SIZE,angle:p.angle,isYou:p.id===playerId,score:p.score}))};
}
export function drawMinimap(canvas,arena,now=0){
  if(!canvas||!arena)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1),w=Math.max(48,Math.round(canvas.clientWidth*dpr)),h=Math.max(48,Math.round(canvas.clientHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const pad=7*dpr,iw=w-2*pad,ih=h-2*pad;ctx.clearRect(0,0,w,h);
  // Transparent map shows actual food and players.
  ctx.strokeStyle='#b18bff65';ctx.shadowColor='#ce78ff';ctx.shadowBlur=3*dpr;ctx.lineWidth=1.2*dpr;ctx.strokeRect(pad,pad,iw,ih);ctx.shadowBlur=0;
  const state=minimapState(arena);
  for(const food of state.food){const x=pad+food.x*iw,y=pad+food.y*ih;const color=food.type==='galaxy_orb'?'#e17aff':food.type==='star_dust'?'#ffdb56':food.type==='crystal_shard'?'#31e8ff':'#ffae38';
    ctx.beginPath();ctx.fillStyle=color;ctx.arc(x,y,Math.min(3.1,1.15+food.mass*.18)*dpr,0,2*Math.PI);ctx.fill();}
  // Larger player arrows: triangles point in the real physics heading, not a decorative dot grid.
  for(const player of state.players){const x=pad+player.x*iw,y=pad+player.y*ih;ctx.save();ctx.translate(x,y);ctx.rotate(player.angle);ctx.fillStyle=player.isYou?'#69fff6':'#ff745c';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=player.isYou?8*dpr:3*dpr;
    const radius=(player.isYou?5:3.2)*dpr;ctx.beginPath();ctx.moveTo(radius,0);ctx.lineTo(-radius*.65,-radius*.65);ctx.lineTo(-radius*.65,radius*.65);ctx.closePath();ctx.fill();ctx.restore();}
}
export const PRESENTATION={
 common:{glow:'#3ee7ff',platform:'cyan'},uncommon:{glow:'#4fffaa',platform:'jade'},rare:{glow:'#e580ff',platform:'amethyst'},epic:{glow:'#b55cff',platform:'violet'},legendary:{glow:'#ffce62',platform:'solar'},mythic:{glow:'#ff7ce7',platform:'astral'}
};

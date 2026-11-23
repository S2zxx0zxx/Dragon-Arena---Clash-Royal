// Original deterministic procedural space environment: no baked-in UI or dragon.
const rng=(s)=>()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296};
export function drawCosmic(canvas){
 const q=canvas.getBoundingClientRect();if(!q.width||!q.height)return;
 const f=Math.min(1.5,1800/Math.max(q.width,q.height)),w=canvas.width=Math.round(q.width*f),h=canvas.height=Math.round(q.height*f);
 const c=canvas.getContext('2d',{alpha:false});if(!c)return;const r=rng(9143001);
 const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#02031c');bg.addColorStop(.5,'#08062d');bg.addColorStop(1,'#03021a');c.fillStyle=bg;c.fillRect(0,0,w,h);
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<92;i++){const x=(.12+r()*.84)*w,y=r()*.66*h,rad=(.04+r()*.20)*w,hue=i%3===0?290:i%3===1?218:260,g=c.createRadialGradient(x,y,0,x,y,rad);g.addColorStop(0,'hsla('+hue+',99%,62%,'+(.013+r()*.035)+')');g.addColorStop(1,'hsla('+hue+',99%,42%,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y,rad,rad*(.19+r()*.38),r()*2,0,Math.PI*2);c.fill();}
 const gx=w*.81,gy=h*.18,rad=h*.21;
 for(let i=0;i<2200;i++){let rho=Math.sqrt(r())*rad,angle=(i%3)*Math.PI*2/3+rho/rad*4.9+(r()-.5)*.7,x=gx+Math.cos(angle)*rho*1.55,y=gy+Math.sin(angle)*rho*.54;let sz=(r()*.7+.25)*Math.max(.6,w/1400);c.fillStyle=i%8===0?'#ffbce3ae':i%3===0?'#9a78ff9c':'#728bff9c';c.fillRect(x,y,sz,sz);}
 let nucleus=c.createRadialGradient(gx,gy,0,gx,gy,rad*.36);nucleus.addColorStop(0,'#fff9e1c0');nucleus.addColorStop(.3,'#c453d6a1');nucleus.addColorStop(1,'#8827d500');c.fillStyle=nucleus;c.fillRect(gx-rad,gy-rad,rad*2,rad*2);
 for(let i=0;i<750;i++){let x=r()*w,y=r()*h*.84,sz=r()>.985?2:r()>.84?1.15:.47;c.fillStyle=i%5===0?'#abf3ffcc':'#c7c9ffab';c.beginPath();c.arc(x,y,sz,0,Math.PI*2);c.fill();if(sz>1.5){c.strokeStyle='#a5bfff5d';c.beginPath();c.moveTo(x-7,y);c.lineTo(x+7,y);c.moveTo(x,y-7);c.lineTo(x,y+7);c.stroke();}}c.restore();
 const px=w*.19,py=h*.32,pr=h*.245;c.save();c.beginPath();c.arc(px,py,pr,0,Math.PI*2);c.clip();let planet=c.createRadialGradient(px-pr*.38,py-pr*.58,0,px+pr*.25,py+pr*.12,pr*1.33);planet.addColorStop(0,'#647de0');planet.addColorStop(.22,'#323091');planet.addColorStop(.62,'#12104f');planet.addColorStop(1,'#03041b');c.fillStyle=planet;c.fillRect(px-pr,py-pr,pr*2,pr*2);c.restore();
 c.shadowColor='#66dfff';c.shadowBlur=pr*.12;c.strokeStyle='#68dfffbd';c.lineWidth=pr*.014;c.beginPath();c.arc(px,py,pr,-2.93,-.12);c.stroke();c.shadowBlur=0;
 let floor=c.createLinearGradient(0,h*.81,0,h);floor.addColorStop(0,'#18065f00');floor.addColorStop(1,'#120750bc');c.fillStyle=floor;c.fillRect(0,h*.8,w,h*.2);
 const shards=['#3fefff','#a749ff','#ee60fd'];
 for(let side=0;side<2;side++)for(let j=0;j<28;j++){let x=side?(w-r()*.17*w):r()*.17*w,y=h-r()*.18*h,he=(.025+r()*.15)*h,wi=(.008+r()*.023)*w;c.save();c.shadowBlur=he*.24;c.shadowColor=shards[j%3];c.fillStyle=shards[j%3];c.beginPath();c.moveTo(x-wi/2,y);c.lineTo(x-wi*.3,y-he*.73);c.lineTo(x,y-he);c.lineTo(x+wi*.34,y-he*.72);c.lineTo(x+wi/2,y);c.closePath();c.fill();c.shadowBlur=0;c.fillStyle='#e5ffffa9';c.beginPath();c.moveTo(x,y-he);c.lineTo(x-wi*.3,y-he*.73);c.lineTo(x-wi*.07,y);c.fill();c.restore();}
 let vig=c.createRadialGradient(w*.5,h*.44,h*.12,w*.5,h*.44,w*.76);vig.addColorStop(0,'#00000000');vig.addColorStop(1,'#00000bc4');c.fillStyle=vig;c.fillRect(0,0,w,h);
}
export function mountCosmicBackdrop(canvas){if(!canvas)return;let w=0,h=0;const refresh=()=>{let b=canvas.getBoundingClientRect();if(Math.abs(b.width-w)>1||Math.abs(b.height-h)>1){w=b.width;h=b.height;drawCosmic(canvas)}};refresh();addEventListener('resize',refresh,{passive:true});}
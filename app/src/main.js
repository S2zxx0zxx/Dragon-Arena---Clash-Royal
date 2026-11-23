import {CrystalArena, RULES} from '../engine/arena.mjs';
import {CrystalRenderer} from './renderer.js';
import {initProgress,recordMatch,visitLab,claimMission,claimEvent,claimMilestone,claimLogin} from './progression.mjs';
import {renderSecondaryPanel,SECONDARY_TITLES,ENVIRONMENTS} from './secondary.js';
import {makeAudio} from './sound.mjs';
import {drawMinimap,PRESENTATION} from './polish.mjs';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STORAGE_KEY='dragon-arena-v4-demo';
const defaultSave={name:'DragonPilot',level:1,xp:0,coins:9750,gems:125,energy:20,skin:'neon_dragonling',ownedSkins:['pebble_wisp','leafling','bubbletail','rockcoil','neon_dragonling'],inventory:{magnet:3,speed:3,shield:2},played:0};
let saved;try{saved={...defaultSave,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{saved={...defaultSave}};
initProgress(saved);
const audio=makeAudio(()=>saved.settings.sound);
const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saved))}catch{}};
let finishedMatch=false,secondaryTab='local',startingArena=false,lastMinimapAt=0;
function applyPreferences(){if(!renderer)return;renderer.graphicsQuality=saved.settings.graphics;renderer.glowEnabled=saved.settings.glow;renderer.arenaTheme=saved.arenaTheme;$('#app').classList.toggle('reduce-motion',!saved.settings.motion);}
let countedDeaths=new Set();
if('serviceWorker' in navigator && location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Offline cache unavailable',e));}
let renderer=null,manifest=null,active='splash',shopTab='offers',arena=null,paused=false,acc=0,elapsed=0,kills=0,lastRender=performance.now(),reviveLeft=5,reviveTick=0,skinLoading=false,refOpen=false,currentlyBoost=false,joystickHeld=false,deathPosition=null;
const SKIN_NAMES={};
const SKIN_PRICES={common:0,uncommon:400,rare:1600,epic:3900,legendary:10500,mythic:28000};
let previewSkin=saved.skin;
const SCREENS=['splash','consent','home','arena','revive','result','shop','creatures','secondary'];
const refs={splash:'00_splash',consent:'01_consent',home:'02_home',arena:'03_arena',revive:'04_revive',result:'05_results',shop:()=>({offers:'06_shop_offers',energy:'07_shop_energy',coins:'08_shop_coins',powerups:'09_shop_powerups'}[shopTab]),creatures:'02_home',secondary:'02_home'};
function toast(message){const t=$('#toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),3500);}
function renderStats(){ $$('[data-coins]').forEach(el=>el.textContent=fmt(saved.coins));$$('[data-gems]').forEach(el=>el.textContent=fmt(saved.gems));$$('[data-energy]').forEach(el=>el.textContent=fmt(saved.energy));$$('[data-level]').forEach(el=>el.textContent=saved.level);$$('[data-xpbar]').forEach(el=>el.style.width=`${Math.min(100,saved.xp/(saved.level*1000)*100)}%`);$('#player-handle').textContent=saved.name; }
function setScreen(name){if(!SCREENS.includes(name))return;active=name;$$('.screen').forEach(s=>s.classList.toggle('active',s.id===name));
 if(renderer)renderer.scene=({splash:'splash',home:'home',creatures:'creatures',arena:'arena',revive:'revive'})[name]||'none';
 if(name==='creatures')renderer?.resetShowcase?.();
 renderStats();if(name==='shop')updateShop();if(name==='creatures'){previewSkin=saved.skin;visitLab(saved);save();buildLab();}
 if(name==='home'){const owned=manifest?.characters?.find(c=>c.id===saved.skin);if(owned)$('#hero-name').textContent=owned.name;
  if(renderer&&renderer.skin!==saved.skin)renderer.useSkin(saved.skin).then(()=>renderer.prime()).catch(e=>console.error('Could not restore owned skin',e));}if(name==='secondary')renderSecondary();
 $('#render-status').textContent=renderer?`WEBGL2 · ${renderer.scene.toUpperCase()} · LOCAL DEMO`:'3D ENGINE UNAVAILABLE';
}
function currentSkin(){return manifest?.characters?.find(c=>c.id===(active==='creatures'?previewSkin:saved.skin))};
async function changeSkin(skin){if(skinLoading||!manifest.characters.some(c=>c.id===skin))return;skinLoading=true;previewSkin=skin;
 try{await renderer.useSkin(skin);await renderer.prime();renderer?.resetShowcase?.();
  const next=manifest.characters.find(c=>c.id===skin);document.querySelector('#creatures').dataset.rarity=next?.rarity||'common';
  if((saved.ownedSkins||[]).includes(skin)){saved.skin=skin;save();}
  $('#hero-name').textContent=currentSkin().name;$('#selected-skin-label').textContent=currentSkin().name.toUpperCase();
 }catch(e){console.error(e);toast('3D model load failed: '+e.message)}
 finally{skinLoading=false;buildLab();}
}
function unlockSkin(){
 const c=manifest?.characters?.find(x=>x.id===previewSkin);if(!c)return;
 const owned=new Set(saved.ownedSkins||[]);if(owned.has(c.id)){saved.skin=c.id;save();buildLab();toast('DRAGON EQUIPPED');return}
 const price=SKIN_PRICES[c.rarity]||0;
 if(saved.coins<price){toast(`Need ${fmt(price)} demo coins to unlock ${c.name}`);return}
 saved.coins-=price;owned.add(c.id);saved.ownedSkins=[...owned];saved.skin=c.id;save();renderStats();buildLab();toast(`${c.name} unlocked — cosmetic only!`);
}
function makeBot(i){const skins=['aqua_crystal','flame_wisp','frost_scale','leafling','crystal_fox','neon_dragonling','shadow_pup','solar_wyvern'];return skins[i%skins.length]}
async function startArena(){
 if(startingArena)return;
 if(!renderer){toast('WebGL2 is required. Use a supported browser.');return}
 startingArena=true;
 try{
  arena=new CrystalArena((Math.random()*1e9)>>>0);arena.addPlayer({id:'you',skin:saved.skin,x:90,y:90,angle:0});
  for(let i=0;i<7;i++){let a=i*Math.PI*2/7,d=9+i*1.4;arena.addPlayer({id:'bot-'+i,skin:makeBot(i),x:90+Math.cos(a)*d,y:90+Math.sin(a)*d,angle:a+Math.PI,isBot:true})}
  arena.seedFood(160);for(let i=0;i<38;i++){let a=Math.random()*Math.PI*2,d=Math.random()*11+1;arena.addFood({x:90+Math.cos(a)*d,y:90+Math.sin(a)*d,type:i%6===0?'galaxy_orb':i%4===0?'crystal_shard':'energy_orb',mass:i%6===0?5:i%4===0?2:1})}
  renderer.arena=arena;await renderer.prime();for(let i=0;i<8;i++){let id=makeBot(i),m=manifest.characters.find(c=>c.id===id);if(!m)continue;for(let part of ['head','body','tail'])await renderer.ready(`assets/characters/${m.rarity}/${id}/3d/${part}.glb`);}
  elapsed=0;kills=0;finishedMatch=false;countedDeaths.clear();paused=false;acc=0;currentlyBoost=false;setScreen('arena');renderHUD();
 }catch(e){console.error(e);toast('Could not start arena: '+e.message)}finally{startingArena=false}
}
function doDeath(){if(active!=='arena')return;const p=arena.players.find(p=>p.id==='you');deathPosition={x:p.x,y:p.y};reviveLeft=5;reviveTick=performance.now();let ranking=arena.players.filter(x=>x.alive||x.id==='you').sort((a,b)=>b.score-a.score);let rank=1+ranking.findIndex(x=>x.id==='you');if(rank<=0)rank=8;
 $('#death-rank').textContent='#'+rank;$('#death-mass').textContent=fmt(p.score);$('#revive-clock').textContent='5';audio.play('death');setScreen('revive');}
function finalize(){if(finishedMatch)return;if(!arena){setScreen('home');return}finishedMatch=true;const p=arena.players.find(p=>p.id==='you');let rank=1+arena.players.filter(x=>x.score>p.score).length;
 let xp=Math.min(2000,Math.round(p.score*2+elapsed*1.6+kills*35));let earned=Math.min(1500,Math.floor(p.score/3)+kills*15);saved.coins+=earned;saved.xp+=xp;saved.played++;recordMatch(saved,{mass:p.score,kills,seconds:elapsed,rank,skin:saved.skin,players:arena.players.map(pl=>({name:pl.id==='you'?saved.name:pl.id,score:pl.score,isYou:pl.id==='you'}))});while(saved.xp>=saved.level*1000){saved.xp-=saved.level*1000;saved.level++}save();
 $('#final-rank').textContent='#'+rank;$('#final-collected').textContent=fmt(p.score);$('#final-kills').textContent=fmt(kills);$('#final-time').textContent=`${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s`;$('#final-xp').textContent='+'+fmt(xp);setScreen('result');audio.play('reward');toast(`Earned ${fmt(earned)} demo coins`);
}
function revive(){if(active!=='revive'||saved.coins<250){toast('Not enough demo coins');return}saved.coins-=250;save();let p=arena.players.find(p=>p.id==='you');const loc=arena.point(20);p.alive=true;p.x=loc.x;p.y=loc.y;p.angle=0;p.aimAngle=0;p.history=[];for(let i=0;i<250;i++)p.history.push({x:p.x-i*.62,y:p.y});p.body=arena.sampleBody(p);arena.effects=[];paused=false;setScreen('arena');toast('Rejoined locally — score and mass retained')}
function renderHUD(){if(!arena)return;const p=arena.players.find(p=>p.id==='you');$('#live-score').textContent=fmt(p.score);$('#live-length').textContent=p.segmentCount;$('#quest-progress').style.width=Math.min(100,p.mass/2200*100)+'%';$('#quest-text').textContent=fmt(p.mass)+' / 2,200';
 const rank=[...arena.players].sort((a,b)=>b.score-a.score);$('#arena-leaders').replaceChildren(...rank.slice(0,6).map(pl=>{const li=document.createElement('li');li.className=pl.id==='you'?'you':'';li.textContent=`${pl.id==='you'?saved.name:pl.id} — ${fmt(pl.score)}`;return li}));
 if(performance.now()-lastMinimapAt>90){drawMinimap($('#minimap-canvas'),arena);lastMinimapAt=performance.now();}
 for(let k of ['magnet','speed','shield'])$('#'+k+'-count').textContent=saved.inventory[k]||0;
}
function usePower(kind){if(active!=='arena')return;const n=saved.inventory[kind]||0;if(!n){toast(`${kind} not in inventory — visit Shop`);return}saved.inventory[kind]=n-1;save();if(kind==='speed'){const p=arena.players.find(p=>p.id==='you');p.boostExpires=performance.now()+4000;p.boost=true}else if(kind==='magnet'){const p=arena.players.find(p=>p.id==='you');let near=arena.food.filter(f=>Math.hypot(p.x-f.x,p.y-f.y)<6).slice(0,20);let ids=new Set(near.map(f=>f.id));p.mass+=near.reduce((s,f)=>s+f.mass,0);p.score+=near.reduce((s,f)=>s+f.mass,0);arena.food=arena.food.filter(f=>!ids.has(f.id));}else if(kind==='shield'){const p=arena.players.find(p=>p.id==='you');p.shieldUntilTick=arena.tick+Math.round(10/RULES.fixedDt);}
 audio.play('power');toast(kind.toUpperCase()+' activated');renderHUD();}
const shopData={
 offers:[['FREE CHEST','Once per UTC day','🎁','FREE','daily'],['DRAGON STARTER','Featured preview','💠','PREVIEW','preview'],['NO ADS','Billing not integrated','🚫','COMING SOON','unavailable'],['DRAGON TREASURY','Premium art preview','🐉','PREVIEW','preview'],['WELCOME BONUS','Demo coins × 150','🪙','CLAIM','welcome'],['EVENT CRYSTAL','Coming soon','💎','LOCKED','unavailable']],
 energy:[['DAILY CHARGE','Restore 5 energy','⚡','FREE','energy'],['ENERGY ×20','Demo economy only','⚡','COMING SOON','unavailable'],['ENERGY ×100','Demo economy only','⚡','COMING SOON','unavailable'],['INFINITE ENERGY','Not enabled','♾','COMING SOON','unavailable'],['ARENA PASS','Never pay-to-win','🎟','INFO','info'],['BONUS ENERGY','Event system pending','✨','LOCKED','unavailable']],
 coins:[['COINS ×300','Earn by playing','🪙','PLAY TO EARN','play'],['COINS ×1,250','Real store not connected','🪙','COMING SOON','unavailable'],['COINS ×7,000','Real store not connected','🪙','COMING SOON','unavailable'],['COINS ×16,000','Real store not connected','💰','COMING SOON','unavailable'],['COINS ×50,000','Real store not connected','💰','COMING SOON','unavailable'],['COINS ×125,000','Real store not connected','💰','COMING SOON','unavailable']],
 powerups:[['MAGNET','Pull nearby food','🧲','300 COINS','magnet'],['SPEED BOOST','4s faster movement','⚡','300 COINS','speed'],['SHIELD','Blocks body/head collisions for 10s','🛡','300 COINS','shield'],['MAGNET ×3','Bundle','🧲','850 COINS','magnet3'],['SPEED ×3','Bundle','⚡','850 COINS','speed3'],['TRAIL EFFECT','Visual cosmetics pending','🌌','PREVIEW','preview']]
};
function updateShop(){ $$('.shop-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.shop===shopTab));$('#shop-title').textContent=({offers:'SPECIAL OFFERS',energy:'ENERGY RESOURCES',coins:'COIN COLLECTION',powerups:'ARENA POWER-UPS'})[shopTab];
 const grid=$('#shop-items');grid.replaceChildren(...shopData[shopTab].map(([name,desc,emoji,label,action],i)=>{const card=document.createElement('article');card.className='shop-card';
 let graphic=i%3===0?'crystal_shard':i%3===1?'coin_core':'element_gem';let file=`assets/food/2d/${graphic}.png`;
 const title=document.createElement('strong');title.textContent=name;const pic=document.createElement('img');pic.src=file;pic.alt='';const sub=document.createElement('small');sub.textContent=desc;const b=document.createElement('button');b.className='btn '+(action==='unavailable'?'navy':'green');b.dataset.purchase=action;b.textContent=label;
 if((action==='daily'&&saved.dailyChestDay===new Date().toISOString().slice(0,10))||(action==='energy'&&saved.dailyEnergyDay===new Date().toISOString().slice(0,10))||(action==='welcome'&&saved.welcome)){b.textContent='CLAIMED';b.disabled=true;}
 card.append(title,pic,sub,b);return card}));
}
function buy(action){if(action==='play'){startArena();return}if(action==='daily'){const day=new Date().toISOString().slice(0,10);if(saved.dailyChestDay===day){toast('Daily chest already claimed today');return}saved.dailyChestDay=day;saved.coins+=50;toast('Demo chest: +50 coins');}else if(action==='welcome'){if(saved.welcome){toast('Welcome reward already claimed');return}saved.welcome=true;saved.coins+=150;toast('+150 demo coins');}
 else if(action==='energy'){const day=new Date().toISOString().slice(0,10);if(saved.dailyEnergyDay===day){toast('Free energy claimed today');return}saved.dailyEnergyDay=day;saved.energy=Math.min(20,saved.energy+5);toast('Energy restored up to cap');}else if(['magnet','speed','shield','magnet3','speed3'].includes(action)){const count=action.endsWith('3')?3:1;const kind=action.replace('3','');let cost=count===3?850:300;if(saved.coins<cost){toast('Not enough coins');return}saved.coins-=cost;saved.inventory[kind]=(saved.inventory[kind]||0)+count;toast(`Bought ${count} ${kind} for ${cost} demo coins`)}else if(action==='preview'){toast('Concept preview only; paid storefront not integrated');return}else if(action==='info'){toast('Energy never grants competitive advantage in this local prototype');return}else{toast('Not available: no payments or rewarded ads are connected');return}save();renderStats();updateShop();}
function buildLab(){
 if(!manifest)return;
 const owned=new Set(saved.ownedSkins||[]),parent=$('#skin-picker');
 // Every card owns its label, price and hit area; no unlock button covers the carousel.
 parent.replaceChildren(...manifest.characters.map(c=>{
  const card=document.createElement('article');card.className='skin-card';card.dataset.rarity=c.rarity;
  const isOwned=owned.has(c.id),selected=c.id===previewSkin;
  card.classList.toggle('locked',!isOwned);card.classList.toggle('active',selected);
  const preview=document.createElement('button');preview.type='button';preview.className='skin-preview';preview.dataset.skin=c.id;preview.setAttribute('aria-label',`Preview ${c.name}`);preview.setAttribute('aria-pressed',String(selected));
  const picture=document.createElement('img');picture.src=`assets/characters/${c.rarity}/${c.id}/2d/preview_transparent.png`;picture.alt='';preview.append(picture);
  const label=document.createElement('b');label.textContent=c.name;const rarity=document.createElement('small');rarity.textContent=c.rarity.toUpperCase();preview.append(label,rarity);card.append(preview);
  const price=document.createElement('button');price.type='button';price.className='skin-price';price.dataset.unlockSkin=c.id;
  price.textContent=isOwned?(saved.skin===c.id?'✓ EQUIPPED':'✓ EQUIP'):`🔒 ${fmt(SKIN_PRICES[c.rarity]||0)} 🪙`;
  price.disabled=isOwned&&saved.skin===c.id;price.setAttribute('aria-label',isOwned?`Equip ${c.name}`:`Unlock ${c.name} for ${SKIN_PRICES[c.rarity]} coins`);
  card.append(price);return card;
 }));
 const c=currentSkin();$('#selected-skin-label').textContent=c?.name?.toUpperCase()||'DRAGON LAB';
 const unlock=$('#skin-unlock-button');unlock.hidden=true;
 document.querySelector('#creatures').dataset.rarity=c?.rarity||'common';
}
let secondaryKey='settings';
function renderSecondary(){
 $('#secondary-title').textContent=SECONDARY_TITLES[secondaryKey]||'DRAGON ARENA';
 $('#secondary-content').innerHTML=renderSecondaryPanel(secondaryKey,saved,secondaryTab,new Date(),manifest);
}
function showSecondary(key){secondaryKey=key;secondaryTab=key==='leaderboard'?'local':'all';setScreen('secondary');}
function claimAction(action){
 const [kind,id]=action.split(':');
 const result=kind==='claim-login'?claimLogin(saved):kind==='claim-mission'?claimMission(saved,id):kind==='claim-event'?claimEvent(saved,id):kind==='claim-milestone'?claimMilestone(saved,id):{ok:false,message:'Unknown claim'};
 if(result.ok){audio.play('reward');save();renderStats();renderSecondary();}
 toast(result.message);
}
function changeEnvironment(index){
 if(!Number.isInteger(index)||index<0||index>=ENVIRONMENTS.length)return;
 saved.arenaTheme=index;save();applyPreferences();renderSecondary();toast(ENVIRONMENTS[index].name+' equipped for next arena');
}
function changeSetting(kind,value){
 if(!['sound','glow','motion','graphics'].includes(kind))return;
 if(kind==='graphics'){if(!['battery','balanced','high'].includes(value))return;saved.settings.graphics=value;}
 else saved.settings[kind]=Boolean(value);
 save();applyPreferences();renderSecondary();
}
function editProfile(){const n=prompt('Choose a local pilot name (2–24 characters)',saved.name);if(n===null)return;const candidate=n.trim().replace(/[<>]/g,'');if(candidate.length<2||candidate.length>24){toast('Name must contain 2–24 characters');return;}saved.name=candidate;save();renderStats();renderSecondary();}
function toggleRef(){refOpen=!refOpen;$('#reference-view').classList.toggle('hidden',!refOpen);if(refOpen){const a=typeof refs[active]==='function'?refs[active]():refs[active];$('#reference-image').src='references/'+a+'.png';$('#reference-caption').textContent=`Approved source: ${a} • Reference-only image — the live game is behind this viewer.`;}}
async function doAction(action){switch(action){case 'start':setScreen(saved.consent?'home':'consent');break;case 'agree':if(!$('#notice-check').checked){toast('Please review and accept the preview notice');break}saved.consent=true;save();setScreen('home');break;
 case 'play':case 'practice':await startArena();break;case 'friends':toast('Online friend matches require a verified multiplayer server; unavailable offline. Practice or Quick Play works locally.');break;case 'home':paused=false;setScreen('home');$('#pause-layer').classList.add('hidden');break;case 'pause':paused=true;$('#pause-layer').classList.remove('hidden');break;case 'resume':paused=false;$('#pause-layer').classList.add('hidden');break;
 case 'boost':/* Hold-to-boost is handled on pointerdown/up to avoid sticky tap boost. */break;case 'magnet':case 'speed':case 'shield':usePower(action);break;
 case 'result':finalize();break;case 'revive-coins':revive();break;case 'share':try{await navigator.clipboard.writeText(`Dragon Arena demo: rank ${$('#final-rank').textContent}, collected ${$('#final-collected').textContent} mass!`);toast('Match summary copied')}catch{toast('Share needs clipboard permissions')}break;
 case 'shop':shopTab='offers';setScreen('shop');break;case 'shop-energy':shopTab='energy';setScreen('shop');break;case 'shop-coins':shopTab='coins';setScreen('shop');break;case 'shop-offers':shopTab='offers';setScreen('shop');break;
 case 'creatures':setScreen('creatures');break;case 'unlock-skin':unlockSkin();break;case 'rotate-dragon':renderer?.rotateShowcase(Math.PI/4);break;case 'reset-dragon':renderer?.resetShowcase();break;case 'reference':toggleRef();break;case 'close-ref':if(refOpen)toggleRef();break;
 case 'edit-profile':editProfile();break;case 'claim-login':claimAction(action);break;
 case 'notice':toast('Prototype use: local demo only; no commercial product terms are active.');break;case 'privacy':toast('Save state is stored in browser localStorage. This demo has no backend or analytics.');break;
 default:if(action.startsWith('claim-'))claimAction(action);else if(SECONDARY_TITLES[action])showSecondary(action);else toast('Feature not available in this offline preview');
}}
document.addEventListener('click',e=>{const env=e.target.closest('[data-environment]');if(env){changeEnvironment(Number(env.dataset.environment));return}const tab=e.target.closest('[data-panel-tab]');if(tab){secondaryTab=tab.dataset.panelTab;renderSecondary();return}const shop=e.target.closest('[data-shop]');if(shop){shopTab=shop.dataset.shop;updateShop();return}const unlockCard=e.target.closest('[data-unlock-skin]');if(unlockCard){if(previewSkin!==unlockCard.dataset.unlockSkin){changeSkin(unlockCard.dataset.unlockSkin).then(unlockSkin);return}unlockSkin();return}const skin=e.target.closest('[data-skin]');if(skin){changeSkin(skin.dataset.skin);return}const buyButton=e.target.closest('[data-purchase]');if(buyButton){buy(buyButton.dataset.purchase);return}const target=e.target.closest('[data-action]');if(target){audio.play('tap');doAction(target.dataset.action);}});
document.addEventListener('change',e=>{const setting=e.target.closest('[data-setting]');if(setting)changeSetting(setting.dataset.setting,setting.type==='checkbox'?setting.checked:setting.value);});
const keys=new Set();window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Escape'){if(refOpen)toggleRef();else if(active==='arena')doAction('pause');else if(!$('#pause-layer').classList.contains('hidden'))doAction('resume');else if(active!=='home')doAction('home')}});window.addEventListener('keyup',e=>keys.delete(e.code));
const joystick=$('#joystick');function moveAim(x,y){let p=arena?.players.find(p=>p.id==='you');if(!p||!p.alive)return;const norm=Math.hypot(x,y)||1;p.aimAngle=Math.atan2(y/norm,x/norm)}
function joystickMove(e){const rect=joystick.getBoundingClientRect(),dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;moveAim(dx,dy);const len=Math.hypot(dx,dy),scale=Math.min(.25,len/rect.width),x=dx/(len||1)*scale*100,y=dy/(len||1)*scale*100;$('#stick').style.transform=`translate(${x}%,${y}%)`;}
joystick.addEventListener('pointerdown',e=>{joystickHeld=true;joystick.setPointerCapture(e.pointerId);joystickMove(e)});joystick.addEventListener('pointermove',e=>{if(joystickHeld)joystickMove(e)});const joyStop=()=>{joystickHeld=false;$('#stick').style.transform='none'};joystick.addEventListener('pointerup',joyStop);joystick.addEventListener('pointercancel',joyStop);
const labGesture=$('#lab-gesture');let dragPointer=null,dragX=0;
labGesture?.addEventListener('pointerdown',e=>{dragPointer=e.pointerId;dragX=e.clientX;labGesture.setPointerCapture(e.pointerId)});
labGesture?.addEventListener('pointermove',e=>{if(e.pointerId!==dragPointer)return;renderer?.rotateShowcase((e.clientX-dragX)*.014);dragX=e.clientX});
for(const ev of ['pointerup','pointercancel'])labGesture?.addEventListener(ev,()=>{dragPointer=null});
labGesture?.addEventListener('wheel',e=>{if(active!=='creatures')return;e.preventDefault();renderer?.zoomShowcase(e.deltaY>0?-.12:.12)},{passive:false});
labGesture?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){renderer?.rotateShowcase(e.key==='ArrowLeft'?-0.2:0.2);e.preventDefault()}});
const boost=$('#boost-btn');boost.addEventListener('pointerdown',()=>currentlyBoost=true);boost.addEventListener('pointerup',()=>currentlyBoost=false);boost.addEventListener('pointercancel',()=>currentlyBoost=false);
$('#arena').addEventListener('pointermove',e=>{if(joystickHeld||e.target.closest('button')||e.pointerType==='touch')return;const x=e.clientX-innerWidth/2,y=e.clientY-innerHeight/2;moveAim(x,y)});
function frame(time){let dt=Math.min(.08,(time-lastRender)/1000||.016);lastRender=time;
 if(active==='arena'&&arena&&!paused){const p=arena.players.find(p=>p.id==='you');const dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);if(dx||dy)p.aimAngle=Math.atan2(dy,dx);p.boost=currentlyBoost||keys.has('Space')||(p.boostExpires||0)>time;acc+=dt;let ticks=0;while(acc>=RULES.fixedDt&&ticks<5){const massBefore=p.mass;arena.step(RULES.fixedDt);if(p.mass>massBefore)audio.play('pickup');for(const fx of arena.effects){if(fx.killerId==='you'&&!countedDeaths.has(fx.id)){countedDeaths.add(fx.id);kills++;}}acc-=RULES.fixedDt;ticks++;elapsed+=RULES.fixedDt;if(!p.alive){doDeath();break;}}if(ticks||Math.floor(time)%50===0)renderHUD();}
 if(active==='revive'){if(time-reviveTick>=1000){reviveLeft=Math.max(0,reviveLeft-1);reviveTick=time;$('#revive-clock').textContent=reviveLeft;if(!reviveLeft)finalize();}}
 if(renderer)try{renderer.render(dt)}catch(e){console.error('Renderer frame failure',e);$('#render-status').textContent='RENDER ERROR: '+e.message;renderer=null;}requestAnimationFrame(frame);
}
async function boot(){const messages=['Reading locked UI reference','Loading 24 3D character definitions','Compiling WebGL2 shaders','Preparing live 3D hero','Ready'];let pct=0;
 function step(index){pct=(index/(messages.length-1))*100;$('#loadpct').textContent=Math.floor(pct)+'%';$('#loadbar').style.width=pct+'%';$('.load-desc').firstChild.textContent=messages[index]+' '}
 try{step(0);manifest=await (await fetch('manifest/game_assets.json')).json();manifest.characters.forEach(c=>SKIN_NAMES[c.id]=c.name);step(1);
 renderer=new CrystalRenderer($('#scene3d'));renderer.setManifest(manifest);renderer.scene='splash';applyPreferences();step(2);await renderer.useSkin(saved.skin);await renderer.prime();step(3);$('#hero-name').textContent=currentSkin().name;step(4);$('#start-button').disabled=false;$('#start-button').textContent='▶ ENTER GAME';renderStats();}
 catch(e){console.error('Boot failed',e);$('#loadpct').textContent='ERROR';$('#start-button').textContent='3D ENGINE ERROR';$('#render-status').textContent=e.message;toast('3D initialization failed: '+e.message)}
 requestAnimationFrame(frame);
}
boot();window.__crystalDebug={get scene(){return active},get arena(){return arena},get selected(){return saved.skin},get renderer(){return renderer},open:setScreen,play:startArena};

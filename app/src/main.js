import {CrystalArena, RULES} from '../engine/arena.mjs';
import {CrystalRenderer} from './renderer.js';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const fmt=n=>Math.round(n).toLocaleString('en-US');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const STORAGE_KEY='dragon-arena-v4-demo';
const defaultSave={name:'DragonPilot',level:1,xp:0,coins:9750,gems:125,energy:20,skin:'neon_dragonling',ownedSkins:['pebble_wisp','leafling','bubbletail','rockcoil','neon_dragonling'],inventory:{magnet:3,speed:3,shield:2},played:0};
let saved;try{saved={...defaultSave,...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{saved={...defaultSave}};
const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saved))}catch{}};
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
 if(renderer)renderer.scene=({home:'home',creatures:'creatures',arena:'arena',revive:'revive'})[name]||'none';
 renderStats();if(name==='shop')updateShop();if(name==='creatures'){previewSkin=saved.skin;buildLab();}
 if(name==='home'){const owned=manifest?.characters?.find(c=>c.id===saved.skin);if(owned)$('#hero-name').textContent=owned.name;
  if(renderer&&renderer.skin!==saved.skin)renderer.useSkin(saved.skin).then(()=>renderer.prime()).catch(e=>console.error('Could not restore owned skin',e));}if(name==='secondary')renderSecondary();
 $('#render-status').textContent=renderer?`WEBGL2 · ${renderer.scene.toUpperCase()} · LOCAL DEMO`:'3D ENGINE UNAVAILABLE';
}
function currentSkin(){return manifest?.characters?.find(c=>c.id===(active==='creatures'?previewSkin:saved.skin))};
async function changeSkin(skin){if(skinLoading||!manifest.characters.some(c=>c.id===skin))return;skinLoading=true;previewSkin=skin;
 try{await renderer.useSkin(skin);await renderer.prime();
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
 if(!renderer){toast('WebGL2 is required. Use a supported browser.');return}
 try{
  arena=new CrystalArena((Math.random()*1e9)>>>0);arena.addPlayer({id:'you',skin:saved.skin,x:90,y:90,angle:0});
  for(let i=0;i<7;i++){let a=i*Math.PI*2/7,d=9+i*1.4;arena.addPlayer({id:'bot-'+i,skin:makeBot(i),x:90+Math.cos(a)*d,y:90+Math.sin(a)*d,angle:a+Math.PI,isBot:true})}
  arena.seedFood(160);for(let i=0;i<38;i++){let a=Math.random()*Math.PI*2,d=Math.random()*11+1;arena.addFood({x:90+Math.cos(a)*d,y:90+Math.sin(a)*d,type:i%6===0?'galaxy_orb':i%4===0?'crystal_shard':'energy_orb',mass:i%6===0?5:i%4===0?2:1})}
  renderer.arena=arena;await renderer.prime();for(let i=0;i<8;i++){let id=makeBot(i),m=manifest.characters.find(c=>c.id===id);if(!m)continue;for(let part of ['head','body','tail'])await renderer.ready(`assets/characters/${m.rarity}/${id}/3d/${part}.glb`);}
  elapsed=0;kills=0;countedDeaths.clear();paused=false;acc=0;currentlyBoost=false;setScreen('arena');renderHUD();
 }catch(e){console.error(e);toast('Could not start arena: '+e.message)}
}
function doDeath(){if(active!=='arena')return;const p=arena.players.find(p=>p.id==='you');deathPosition={x:p.x,y:p.y};reviveLeft=5;reviveTick=performance.now();let ranking=arena.players.filter(x=>x.alive||x.id==='you').sort((a,b)=>b.score-a.score);let rank=1+ranking.findIndex(x=>x.id==='you');if(rank<=0)rank=8;
 $('#death-rank').textContent='#'+rank;$('#death-mass').textContent=fmt(p.score);$('#revive-clock').textContent='5';setScreen('revive');}
function finalize(){if(!arena){setScreen('home');return}const p=arena.players.find(p=>p.id==='you');let rank=1+arena.players.filter(x=>x.score>p.score).length;
 let xp=Math.min(2000,Math.round(p.score*2+elapsed*1.6+kills*35));let earned=Math.min(1500,Math.floor(p.score/3)+kills*15);saved.coins+=earned;saved.xp+=xp;saved.played++;while(saved.xp>=saved.level*1000){saved.xp-=saved.level*1000;saved.level++}save();
 $('#final-rank').textContent='#'+rank;$('#final-collected').textContent=fmt(p.score);$('#final-kills').textContent=fmt(kills);$('#final-time').textContent=`${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s`;$('#final-xp').textContent='+'+fmt(xp);setScreen('result');toast(`Earned ${fmt(earned)} demo coins`);
}
function revive(){if(active!=='revive'||saved.coins<250){toast('Not enough demo coins');return}saved.coins-=250;save();let p=arena.players.find(p=>p.id==='you');const loc=arena.point(20);p.alive=true;p.x=loc.x;p.y=loc.y;p.angle=0;p.aimAngle=0;p.history=[];for(let i=0;i<250;i++)p.history.push({x:p.x-i*.62,y:p.y});p.body=arena.sampleBody(p);arena.effects=[];paused=false;setScreen('arena');toast('Rejoined locally — score and mass retained')}
function renderHUD(){if(!arena)return;const p=arena.players.find(p=>p.id==='you');$('#live-score').textContent=fmt(p.score);$('#live-length').textContent=p.segmentCount;$('#quest-progress').style.width=Math.min(100,p.mass/2200*100)+'%';$('#quest-text').textContent=fmt(p.mass)+' / 2,200';
 const rank=[...arena.players].sort((a,b)=>b.score-a.score);$('#arena-leaders').replaceChildren(...rank.slice(0,6).map(pl=>{const li=document.createElement('li');li.className=pl.id==='you'?'you':'';li.textContent=`${pl.id==='you'?saved.name:pl.id} — ${fmt(pl.score)}`;return li}));
 const posX=clamp(p.x/180,0,1)*100,posY=clamp(p.y/180,0,1)*100;$('#minidot').style.left=`calc(${posX}% - 4px)`;$('#minidot').style.top=`calc(${posY}% - 4px)`;
 for(let k of ['magnet','speed','shield'])$('#'+k+'-count').textContent=saved.inventory[k]||0;
}
function usePower(kind){if(active!=='arena')return;const n=saved.inventory[kind]||0;if(!n){toast(`${kind} not in inventory — visit Shop`);return}saved.inventory[kind]=n-1;save();if(kind==='speed'){const p=arena.players.find(p=>p.id==='you');p.boostExpires=performance.now()+4000;p.boost=true}else if(kind==='magnet'){const p=arena.players.find(p=>p.id==='you');let near=arena.food.filter(f=>Math.hypot(p.x-f.x,p.y-f.y)<6).slice(0,20);let ids=new Set(near.map(f=>f.id));p.mass+=near.reduce((s,f)=>s+f.mass,0);p.score+=near.reduce((s,f)=>s+f.mass,0);arena.food=arena.food.filter(f=>!ids.has(f.id));}else if(kind==='shield'){toast('Shield visual prototype only; collision protection is NOT implemented yet');saved.inventory[kind]++;save();return}
 toast(kind.toUpperCase()+' activated');renderHUD();}
const shopData={
 offers:[['FREE CHEST','Once per UTC day','🎁','FREE','daily'],['DRAGON STARTER','Featured preview','💠','PREVIEW','preview'],['NO ADS','Billing not integrated','🚫','COMING SOON','unavailable'],['DRAGON TREASURY','Premium art preview','🐉','PREVIEW','preview'],['WELCOME BONUS','Demo coins × 150','🪙','CLAIM','welcome'],['EVENT CRYSTAL','Coming soon','💎','LOCKED','unavailable']],
 energy:[['DAILY CHARGE','Restore 5 energy','⚡','FREE','energy'],['ENERGY ×20','Demo economy only','⚡','COMING SOON','unavailable'],['ENERGY ×100','Demo economy only','⚡','COMING SOON','unavailable'],['INFINITE ENERGY','Not enabled','♾','COMING SOON','unavailable'],['ARENA PASS','Never pay-to-win','🎟','INFO','info'],['BONUS ENERGY','Event system pending','✨','LOCKED','unavailable']],
 coins:[['COINS ×300','Earn by playing','🪙','PLAY TO EARN','play'],['COINS ×1,250','Real store not connected','🪙','COMING SOON','unavailable'],['COINS ×7,000','Real store not connected','🪙','COMING SOON','unavailable'],['COINS ×16,000','Real store not connected','💰','COMING SOON','unavailable'],['COINS ×50,000','Real store not connected','💰','COMING SOON','unavailable'],['COINS ×125,000','Real store not connected','💰','COMING SOON','unavailable']],
 powerups:[['MAGNET','Pull nearby food','🧲','300 COINS','magnet'],['SPEED BOOST','4s faster movement','⚡','300 COINS','speed'],['SHIELD','Requires collision integration','🛡','UNAVAILABLE','unavailable'],['MAGNET ×3','Bundle','🧲','850 COINS','magnet3'],['SPEED ×3','Bundle','⚡','850 COINS','speed3'],['TRAIL EFFECT','Visual cosmetics pending','🌌','PREVIEW','preview']]
};
function updateShop(){ $$('.shop-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.shop===shopTab));$('#shop-title').textContent=({offers:'SPECIAL OFFERS',energy:'ENERGY RESOURCES',coins:'COIN COLLECTION',powerups:'ARENA POWER-UPS'})[shopTab];
 const grid=$('#shop-items');grid.replaceChildren(...shopData[shopTab].map(([name,desc,emoji,label,action],i)=>{const card=document.createElement('article');card.className='shop-card';
 let graphic=i%3===0?'crystal_shard':i%3===1?'coin_core':'element_gem';let file=`assets/food/2d/${graphic}.png`;
 const title=document.createElement('strong');title.textContent=name;const pic=document.createElement('img');pic.src=file;pic.alt='';const sub=document.createElement('small');sub.textContent=desc;const b=document.createElement('button');b.className='btn '+(action==='unavailable'?'navy':'green');b.dataset.purchase=action;b.textContent=label;
 if((action==='daily'&&saved.dailyChestDay===new Date().toISOString().slice(0,10))||(action==='energy'&&saved.dailyEnergyDay===new Date().toISOString().slice(0,10))||(action==='welcome'&&saved.welcome)){b.textContent='CLAIMED';b.disabled=true;}
 card.append(title,pic,sub,b);return card}));
}
function buy(action){if(action==='play'){startArena();return}if(action==='daily'){const day=new Date().toISOString().slice(0,10);if(saved.dailyChestDay===day){toast('Daily chest already claimed today');return}saved.dailyChestDay=day;saved.coins+=50;toast('Demo chest: +50 coins');}else if(action==='welcome'){if(saved.welcome){toast('Welcome reward already claimed');return}saved.welcome=true;saved.coins+=150;toast('+150 demo coins');}
 else if(action==='energy'){const day=new Date().toISOString().slice(0,10);if(saved.dailyEnergyDay===day){toast('Free energy claimed today');return}saved.dailyEnergyDay=day;saved.energy=Math.min(20,saved.energy+5);toast('Energy restored up to cap');}else if(['magnet','speed','magnet3','speed3'].includes(action)){const count=action.endsWith('3')?3:1;const kind=action.replace('3','');let cost=count===3?850:300;if(saved.coins<cost){toast('Not enough coins');return}saved.coins-=cost;saved.inventory[kind]=(saved.inventory[kind]||0)+count;toast(`Bought ${count} ${kind} for ${cost} demo coins`)}else if(action==='preview'){toast('Concept preview only; paid storefront not integrated');return}else if(action==='info'){toast('Energy never grants competitive advantage in this local prototype');return}else{toast('Not available: no payments or rewarded ads are connected');return}save();renderStats();updateShop();}
function buildLab(){if(!manifest)return;const parent=$('#skin-picker');if(parent.childElementCount!==manifest.characters.length){parent.replaceChildren(...manifest.characters.map(c=>{const b=document.createElement('button');b.className='skin-card';b.dataset.skin=c.id;let pic=document.createElement('img');pic.src=`assets/characters/${c.rarity}/${c.id}/2d/preview_transparent.png`;pic.alt='Selection thumbnail — in-arena model is GLB 3D';b.append(pic);let t=document.createElement('b');t.textContent=c.name;b.append(t);let sub=document.createElement('small');sub.textContent=c.rarity.toUpperCase();b.append(sub);return b;}))}
 const owned=new Set(saved.ownedSkins||[]);
 $$('#skin-picker button').forEach(b=>{const active=b.dataset.skin===previewSkin;b.classList.toggle('active',active);b.classList.toggle('locked',!owned.has(b.dataset.skin));b.setAttribute('aria-pressed',String(active));});
 const c=currentSkin();$('#selected-skin-label').textContent=c?.name?.toUpperCase()||'';
 const unlock=$('#skin-unlock-button');if(unlock&&c){const isOwned=owned.has(c.id);unlock.textContent=isOwned?(saved.skin===c.id?'✓ EQUIPPED':'✓ EQUIP DRAGON'):`🔒 UNLOCK · ${fmt(SKIN_PRICES[c.rarity])} COINS`;unlock.disabled=isOwned&&saved.skin===c.id;}
}
const SECONDARY={settings:['SETTINGS','<h2>GAME SETTINGS</h2><div class="setting-row"><span>🔉 Sound effects</span><input id="setting-sound" type="checkbox" checked></div><div class="setting-row"><span>✨ Glow / visual effects</span><input id="setting-vfx" type="checkbox" checked></div><p>3D game renders with WebGL2. Texture/LOD/device performance acceptance is pending.</p>'],profile:['PROFILE','<h2>YOUR PILOT PROFILE</h2><p>Guest-first profile saved locally on this device.</p><div class="setting-row">Level <b id="local-level"></b></div><div class="setting-row">Matches <b id="local-matches"></b></div>'],friends:['FRIENDS','<h2>FRIENDS — FUTURE FEATURE</h2><p>Online invite, contacts, private rooms and presence need networking and privacy implementation.</p><button class="btn gold" data-action="play">PLAY LOCAL ARENA</button>'],missions:['MISSIONS','<h2>DAILY MISSIONS</h2><p>Collect 2,200 mass in a local arena. Mission server and reward persistence are not yet implemented.</p><button class="btn gold" data-action="play">PLAY NOW</button>'],leaderboard:['LEADERBOARD','<h2>ARENA RANKINGS</h2><p>The live match shows local bots only. Global ranks need an authoritative leaderboard service.</p><button class="btn gold" data-action="play">PRACTICE RANKING</button>'],rewards:['REWARDS','<h2>DAILY DEMO REWARDS</h2><p>Try the free Welcome Bonus inside Shop offers.</p><button class="btn gold" data-action="shop">OPEN SHOP</button>'],inventory:['WORKSHOP & INVENTORY','<h2>POWER-UP INVENTORY</h2><div class="setting-row">Magnet <b id="inv-magnet"></b></div><div class="setting-row">Speed Boost <b id="inv-speed"></b></div><div class="setting-row">Shield (not functional) <b id="inv-shield"></b></div><p>Character selection and 3D previews are in Creature Lab.</p><button class="btn blue" data-action="creatures">OPEN CREATURE LAB</button>'],events:['EVENTS','<h2>EVENTS — NOT LIVE</h2><p>Seasonal events require scheduling, backend state and rewards validation.</p>'],practice:['PRACTICE','<h2>3D LOCAL PRACTICE</h2><p>Move with your pointer, virtual joystick, arrow keys or WASD. Hold Space or BOOST to accelerate.</p><button class="btn gold" data-action="play">PLAY LOCAL PRACTICE</button>']};
let secondaryKey='settings';function renderSecondary(){const [title,body]=SECONDARY[secondaryKey]||SECONDARY.settings;$('#secondary-title').textContent=title;$('#secondary-content').innerHTML=body;
 if(secondaryKey==='profile'){$('#local-level').textContent=saved.level;$('#local-matches').textContent=saved.played}if(secondaryKey==='inventory'){for(let k of ['magnet','speed','shield'])$('#inv-'+k).textContent=saved.inventory[k]||0;}}
function showSecondary(key){secondaryKey=key;setScreen('secondary');}
function toggleRef(){refOpen=!refOpen;$('#reference-view').classList.toggle('hidden',!refOpen);if(refOpen){const a=typeof refs[active]==='function'?refs[active]():refs[active];$('#reference-image').src='references/'+a+'.png';$('#reference-caption').textContent=`Approved source: ${a} • Reference-only image — the live game is behind this viewer.`;}}
async function doAction(action){switch(action){case 'start':setScreen(saved.consent?'home':'consent');break;case 'agree':if(!$('#notice-check').checked){toast('Please review and accept the preview notice');break}saved.consent=true;save();setScreen('home');break;
 case 'play':await startArena();break;case 'home':paused=false;setScreen('home');$('#pause-layer').classList.add('hidden');break;case 'pause':paused=true;$('#pause-layer').classList.remove('hidden');break;case 'resume':paused=false;$('#pause-layer').classList.add('hidden');break;
 case 'boost':currentlyBoost=!currentlyBoost;toast('Boost '+(currentlyBoost?'ON':'OFF'));break;case 'magnet':case 'speed':case 'shield':usePower(action);break;
 case 'result':finalize();break;case 'revive-coins':revive();break;case 'share':try{await navigator.clipboard.writeText(`Dragon Arena demo: rank ${$('#final-rank').textContent}, collected ${$('#final-collected').textContent} mass!`);toast('Match summary copied')}catch{toast('Share needs clipboard permissions')}break;
 case 'shop':shopTab='offers';setScreen('shop');break;case 'shop-energy':shopTab='energy';setScreen('shop');break;case 'shop-coins':shopTab='coins';setScreen('shop');break;case 'shop-offers':shopTab='offers';setScreen('shop');break;
 case 'creatures':setScreen('creatures');break;case 'unlock-skin':unlockSkin();break;case 'reference':toggleRef();break;case 'close-ref':if(refOpen)toggleRef();break;
 case 'notice':toast('Prototype use: local demo only; no commercial product terms are active.');break;case 'privacy':toast('Save state is stored in browser localStorage. This demo has no backend or analytics.');break;
 default:if(SECONDARY[action])showSecondary(action);else toast('Feature not implemented');
}}
document.addEventListener('click',e=>{const shop=e.target.closest('[data-shop]');if(shop){shopTab=shop.dataset.shop;updateShop();return}const skin=e.target.closest('[data-skin]');if(skin){changeSkin(skin.dataset.skin);return}const buyButton=e.target.closest('[data-purchase]');if(buyButton){buy(buyButton.dataset.purchase);return}const target=e.target.closest('[data-action]');if(target){doAction(target.dataset.action);}});
const keys=new Set();window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Escape'){if(refOpen)toggleRef();else if(active==='arena')doAction('pause');else if(!$('#pause-layer').classList.contains('hidden'))doAction('resume');else if(active!=='home')doAction('home')}});window.addEventListener('keyup',e=>keys.delete(e.code));
const joystick=$('#joystick');function moveAim(x,y){let p=arena?.players.find(p=>p.id==='you');if(!p||!p.alive)return;const norm=Math.hypot(x,y)||1;p.aimAngle=Math.atan2(y/norm,x/norm)}
function joystickMove(e){const rect=joystick.getBoundingClientRect(),dx=e.clientX-rect.left-rect.width/2,dy=e.clientY-rect.top-rect.height/2;moveAim(dx,dy);const len=Math.hypot(dx,dy),scale=Math.min(.25,len/rect.width),x=dx/(len||1)*scale*100,y=dy/(len||1)*scale*100;$('#stick').style.transform=`translate(${x}%,${y}%)`;}
joystick.addEventListener('pointerdown',e=>{joystickHeld=true;joystick.setPointerCapture(e.pointerId);joystickMove(e)});joystick.addEventListener('pointermove',e=>{if(joystickHeld)joystickMove(e)});const joyStop=()=>{joystickHeld=false;$('#stick').style.transform='none'};joystick.addEventListener('pointerup',joyStop);joystick.addEventListener('pointercancel',joyStop);
const boost=$('#boost-btn');boost.addEventListener('pointerdown',()=>currentlyBoost=true);boost.addEventListener('pointerup',()=>currentlyBoost=false);boost.addEventListener('pointercancel',()=>currentlyBoost=false);
$('#arena').addEventListener('pointermove',e=>{if(joystickHeld||e.target.closest('button')||e.pointerType==='touch')return;const x=e.clientX-innerWidth/2,y=e.clientY-innerHeight/2;moveAim(x,y)});
function frame(time){let dt=Math.min(.08,(time-lastRender)/1000||.016);lastRender=time;
 if(active==='arena'&&arena&&!paused){const p=arena.players.find(p=>p.id==='you');const dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);if(dx||dy)p.aimAngle=Math.atan2(dy,dx);p.boost=currentlyBoost||keys.has('Space')||(p.boostExpires||0)>time;acc+=dt;let ticks=0;while(acc>=RULES.fixedDt&&ticks<5){arena.step(RULES.fixedDt);for(const fx of arena.effects){if(fx.killerId==='you'&&!countedDeaths.has(fx.id)){countedDeaths.add(fx.id);kills++;}}acc-=RULES.fixedDt;ticks++;elapsed+=RULES.fixedDt;if(!p.alive){doDeath();break;}}if(ticks||Math.floor(time)%50===0)renderHUD();}
 if(active==='revive'){if(time-reviveTick>=1000){reviveLeft=Math.max(0,reviveLeft-1);reviveTick=time;$('#revive-clock').textContent=reviveLeft;if(!reviveLeft)finalize();}}
 if(renderer)try{renderer.render(dt)}catch(e){console.error('Renderer frame failure',e);$('#render-status').textContent='RENDER ERROR: '+e.message;renderer=null;}requestAnimationFrame(frame);
}
async function boot(){const messages=['Reading locked UI reference','Loading 24 3D character definitions','Compiling WebGL2 shaders','Preparing live 3D hero','Ready'];let pct=0;
 function step(index){pct=(index/(messages.length-1))*100;$('#loadpct').textContent=Math.floor(pct)+'%';$('#loadbar').style.width=pct+'%';$('.load-desc').firstChild.textContent=messages[index]+' '}
 try{step(0);manifest=await (await fetch('manifest/game_assets.json')).json();manifest.characters.forEach(c=>SKIN_NAMES[c.id]=c.name);step(1);
 renderer=new CrystalRenderer($('#scene3d'));renderer.setManifest(manifest);step(2);await renderer.useSkin(saved.skin);await renderer.prime();step(3);$('#hero-name').textContent=currentSkin().name;step(4);$('#start-button').disabled=false;$('#start-button').textContent='▶ ENTER GAME';renderStats();}
 catch(e){console.error('Boot failed',e);$('#loadpct').textContent='ERROR';$('#start-button').textContent='3D ENGINE ERROR';$('#render-status').textContent=e.message;toast('3D initialization failed: '+e.message)}
 requestAnimationFrame(frame);
}
boot();window.__crystalDebug={get scene(){return active},get arena(){return arena},get selected(){return saved.skin},get renderer(){return renderer},open:setScreen,play:startArena};

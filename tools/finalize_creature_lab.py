from pathlib import Path
r=Path(__file__).resolve().parents[1]
p=r/'app/src/main.js';s=p.read_text()
s=s.replace("skin:'neon_dragonling',inventory", "skin:'neon_dragonling',ownedSkins:['pebble_wisp','leafling','bubbletail','rockcoil','neon_dragonling'],inventory")
s=s.replace("const SKIN_NAMES={};", "const SKIN_NAMES={};\nconst SKIN_PRICES={common:0,uncommon:400,rare:1600,epic:3900,legendary:10500,mythic:28000};\nlet previewSkin=saved.skin;")
s=s.replace("(saved.xp%1000)/10", "Math.min(100,saved.xp/(saved.level*1000)*100)")
s=s.replace("if(name==='creatures')buildLab();", "if(name==='creatures'){previewSkin=saved.skin;buildLab();}\n if(name==='home'&&renderer&&renderer.skin!==saved.skin)renderer.useSkin(saved.skin).then(()=>renderer.prime()).catch(e=>console.error('Could not restore owned skin',e));")
s=s.replace("function currentSkin(){return manifest?.characters?.find(c=>c.id===saved.skin)}", "function currentSkin(){return manifest?.characters?.find(c=>c.id===(active==='creatures'?previewSkin:saved.skin))}")
old='''async function changeSkin(skin){if(skinLoading||!manifest.characters.some(c=>c.id===skin))return;skinLoading=true;saved.skin=skin;save();
 try{await renderer.useSkin(skin);await renderer.prime();$('#hero-name').textContent=currentSkin().name;$('#selected-skin-label').textContent=currentSkin().name.toUpperCase();}
 catch(e){console.error(e);toast('3D model load failed: '+e.message)}
 finally{skinLoading=false;buildLab();}
}'''
new='''async function changeSkin(skin){if(skinLoading||!manifest.characters.some(c=>c.id===skin))return;skinLoading=true;previewSkin=skin;
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
}'''
assert old in s;s=s.replace(old,new)
s=s.replace("['FREE CHEST','Daily reward'", "['FREE CHEST','Once per UTC day'")
s=s.replace("function buy(action){if(action==='play'){startArena();return}if(action==='daily'){saved.coins+=50;toast('Demo chest: +50 coins');}", "function buy(action){if(action==='play'){startArena();return}if(action==='daily'){const day=new Date().toISOString().slice(0,10);if(saved.dailyChestDay===day){toast('Daily chest already claimed today');return}saved.dailyChestDay=day;saved.coins+=50;toast('Demo chest: +50 coins');}")
s=s.replace("else if(action==='energy'){saved.energy=Math.min(20,saved.energy+5);toast('Energy restored up to cap');}", "else if(action==='energy'){const day=new Date().toISOString().slice(0,10);if(saved.dailyEnergyDay===day){toast('Free energy claimed today');return}saved.dailyEnergyDay=day;saved.energy=Math.min(20,saved.energy+5);toast('Energy restored up to cap');}")
old=''' $$('#skin-picker button').forEach(b=>b.classList.toggle('active',b.dataset.skin===saved.skin));$('#selected-skin-label').textContent=currentSkin()?.name?.toUpperCase()||'';
}'''
new=''' const owned=new Set(saved.ownedSkins||[]);
 $$('#skin-picker button').forEach(b=>{const active=b.dataset.skin===previewSkin;b.classList.toggle('active',active);b.classList.toggle('locked',!owned.has(b.dataset.skin));b.setAttribute('aria-pressed',String(active));});
 const c=currentSkin();$('#selected-skin-label').textContent=c?.name?.toUpperCase()||'';
 const unlock=$('#skin-unlock-button');if(unlock&&c){const isOwned=owned.has(c.id);unlock.textContent=isOwned?(saved.skin===c.id?'✓ EQUIPPED':'✓ EQUIP DRAGON'):`🔒 UNLOCK · ${fmt(SKIN_PRICES[c.rarity])} COINS`;unlock.disabled=isOwned&&saved.skin===c.id;}
}'''
assert old in s;s=s.replace(old,new)
s=s.replace("case 'creatures':setScreen('creatures');break;", "case 'creatures':setScreen('creatures');break;case 'unlock-skin':unlockSkin();break;")
s=s.replace("name:'DragonPilot',level:1", "name:'DragonPilot',level:1")
# Store is a preview, not transactional storefront; avoid misleading claim.
s=s.replace("'CRYSTAL STARTER'", "'DRAGON STARTER'")
p.write_text(s)
h=r/'app/index.html';t=h.read_text();old='<div class="lab-selector" id="skin-picker"></div></div>';new='<div class="lab-selector" id="skin-picker"></div><button id="skin-unlock-button" class="btn gold lab-unlock" data-action="unlock-skin">CHECKING DRAGON...</button></div>';assert old in t;t=t.replace(old,new);h.write_text(t)
c=r/'app/src/styles.css';u=c.read_text();u+='''\n/* Creature Lab: active 3D preview with clearly separated cosmetic ownership. */
.skin-card.locked{filter:saturate(.64)}.skin-card.locked:after{content:'◆';position:absolute;top:5px;right:6px;color:#ffd86b;text-shadow:0 0 9px #ff9f21}
.lab-unlock{position:absolute;right:4.2%;bottom:5%;min-width:min(250px,31vw);z-index:5;min-height:44px}
''';c.write_text(u)
print('Creature Lab ownership, cosmetic unlock, daily chest caps done')

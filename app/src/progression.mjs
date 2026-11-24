/* Offline-first progression: no invented multiplayer data, payments, or remote rankings. */
export const UTC_DAY = (when=new Date())=>new Date(when).toISOString().slice(0,10);
export const MISSION_DEFS = Object.freeze([
  {id:'matches', title:'Arena Challenger', desc:'Finish 3 local arena matches', icon:'⚔️', target:3, reward:{coins:100}},
  {id:'mass', title:'Crystal Harvester', desc:'Collect 2,200 mass in matches today', icon:'💎', target:2200, reward:{coins:150}},
  {id:'kills', title:'Dragon Hunter', desc:'Defeat 2 opponents today', icon:'🐉', target:2, reward:{gems:5}},
  {id:'lab', title:'Creature Explorer', desc:'Visit the Dragon Lab today', icon:'✨', target:1, reward:{coins:50}}
]);
export const EVENT_DEFS = Object.freeze([
  {id:'ascent',title:'Crystal Ascent',desc:'Collect 4,000 mass during this UTC week',icon:'🐉', target:4000,kind:'mass',reward:{gems:20}},
  {id:'harvest',title:'Mass Harvest Rush',desc:'Complete 5 local matches during this UTC week',icon:'💎', target:5,kind:'matches',reward:{coins:500}},
  {id:'evolution',title:'Dragon Evolution Fest',desc:'Defeat 8 bots during this UTC week',icon:'🔮',target:8,kind:'kills',reward:{gems:30}}
]);
export const MILESTONES=Object.freeze([
 {id:'first_match', label:'First Battle',icon:'🎁',kind:'matches',target:1,reward:{coins:100}},
 {id:'five_matches',label:'Arena Explorer',icon:'💠',kind:'matches',target:5,reward:{gems:10}},
 {id:'ten_kills',label:'Dragon Slayer',icon:'👑',kind:'kills',target:10,reward:{gems:25}},
 {id:'crystal_5k',label:'Crystal Guardian',icon:'🏆',kind:'mass',target:5000,reward:{coins:1200}}
]);
const safeInt=x=>Math.max(0,Math.min(999999999,Number.isFinite(Number(x))?Math.floor(Number(x)):0));
const yesterdayUTC=day=>UTC_DAY(new Date(`${day}T00:00:00.000Z`).getTime()-86400000);
export function weekUTC(when=new Date()){
 const t=new Date(when);t.setUTCHours(0,0,0,0);t.setUTCDate(t.getUTCDate() - (t.getUTCDay()+6)%7);
 return {id:UTC_DAY(t), endsAt:new Date(t.getTime()+7*86400000).toISOString()};
}
export function initProgress(save, when=new Date()){
 const day=UTC_DAY(when),week=weekUTC(when).id;
 if(!save.career||typeof save.career!=='object')save.career={matches:safeInt(save.played),kills:0,mass:0,wins:0,best:0,playSeconds:0};
 if(!Array.isArray(save.history))save.history=[];
 if(!save.daily||save.daily.day!==day)save.daily={day,values:{matches:0,mass:0,kills:0,lab:0},claimed:[]};
 if(!save.weekly||save.weekly.id!==week)save.weekly={id:week,values:{matches:0,mass:0,kills:0},claimed:[]};
 if(!Array.isArray(save.milestonesClaimed))save.milestonesClaimed=[];
 if(!save.login||typeof save.login!=='object')save.login={lastDay:null,streak:0};
 if(!save.settings||typeof save.settings!=='object')save.settings={sound:true,glow:true,motion:true,graphics:'balanced'};
 if(!Number.isInteger(save.arenaTheme)||save.arenaTheme<0||save.arenaTheme>5)save.arenaTheme=0;
 return save;
}
export function recordMatch(save, result, when=new Date()){
 initProgress(save,when);
 const score=safeInt(result.mass),kills=safeInt(result.kills),duration=safeInt(result.seconds),rank=Math.max(1,safeInt(result.rank));
 const match={id:`${new Date(when).getTime()}-${save.career.matches+1}`,date:new Date(when).toISOString(),rank,mass:score,kills,seconds:duration,skin:String(result.skin||save.skin||'pebble_wisp'),players:Array.isArray(result.players)?result.players.slice(0,12).map(p=>({name:String(p.name||'Bot').slice(0,24),score:safeInt(p.score),isYou:!!p.isYou})):[]};
 save.career.matches++;save.career.mass+=score;save.career.kills+=kills;save.career.playSeconds+=duration;save.career.best=Math.max(save.career.best,score);
 if(rank===1)save.career.wins++;
 for(const target of [save.daily.values,save.weekly.values]){target.matches++;target.mass+=score;target.kills+=kills;}
 save.history.unshift(match);save.history=save.history.slice(0,30);
 return match;
}
export function visitLab(save,when=new Date()){initProgress(save,when);save.daily.values.lab=1;}
function award(save,reward){for(const [kind,value] of Object.entries(reward)){if(!['coins','gems','energy'].includes(kind))continue;save[kind]=safeInt(save[kind])+safeInt(value);}}
export function claimMission(save,id,when=new Date()){
 initProgress(save,when);const m=MISSION_DEFS.find(x=>x.id===id);
 if(!m)return {ok:false,message:'Unknown mission'};
 if(save.daily.claimed.includes(id))return {ok:false,message:'Mission reward already claimed'};
 if((save.daily.values[id]||0)<m.target)return {ok:false,message:'Mission not yet complete'};
 save.daily.claimed.push(id);award(save,m.reward);return {ok:true,message:`${m.title} claimed`,reward:m.reward};
}
export function claimEvent(save,id,when=new Date()){
 initProgress(save,when);const m=EVENT_DEFS.find(x=>x.id===id);if(!m)return {ok:false,message:'Unknown event'};
 if(save.weekly.claimed.includes(id))return {ok:false,message:'Event already claimed'};
 if((save.weekly.values[m.kind]||0)<m.target)return {ok:false,message:'Event goal not yet reached'};
 save.weekly.claimed.push(id);award(save,m.reward);return {ok:true,message:`${m.title} reward claimed`,reward:m.reward};
}
export function claimMilestone(save,id,when=new Date()){
 initProgress(save,when);const m=MILESTONES.find(x=>x.id===id);if(!m)return {ok:false,message:'Unknown milestone'};
 if(save.milestonesClaimed.includes(id))return {ok:false,message:'Milestone already claimed'};
 if((save.career[m.kind]||0)<m.target)return {ok:false,message:'Milestone locked'};
 save.milestonesClaimed.push(id);award(save,m.reward);return {ok:true,message:`${m.label} claimed`,reward:m.reward};
}
const DAILY_PRIZES=[{coins:100},{gems:5},{coins:250},{gems:10},{coins:400},{gems:20},{coins:750,gems:15}];
export {DAILY_PRIZES};
export function claimLogin(save,when=new Date()){
 initProgress(save,when);const today=UTC_DAY(when);
 if(save.login.lastDay===today)return {ok:false,message:'Today’s login reward already claimed'};
 const streak=save.login.lastDay===yesterdayUTC(today)?safeInt(save.login.streak)+1:1;
 const reward=DAILY_PRIZES[(streak-1)%DAILY_PRIZES.length];save.login={lastDay:today,streak};award(save,reward);
 return {ok:true,message:`Day ${streak} reward collected`,reward};
}
export function progressWidth(value,target){return Math.max(0,Math.min(100,Math.floor(100*(Number(value)||0)/(target||1))))}
export function rewardLabel(r){return Object.entries(r).map(([k,v])=>`+${safeInt(v)} ${k==='coins'?'🪙':k==='gems'?'💎':'⚡'}`).join(' · ')}

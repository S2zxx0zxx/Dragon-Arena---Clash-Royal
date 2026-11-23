/* Original 2D/3D-agnostic arena simulation starter; deterministic fixed step.
 * A production multiplayer game must move this simulation to an authoritative server.
 * This is NOT an anti-cheat implementation or a 20-player performance guarantee.
 */
export const RULES=Object.freeze({
  worldSize:180, startSegments:8, minSegments:6, maxSegments:220,
  bodySpacing:0.62, massPerSegment:3, headRadius:.46, bodyRadius:.38,
  speed:6.25, boostSpeed:9.75, turnRate:4.5, deathDropFraction:.65,
  fixedDt:1/60, foodCap:180, foodTarget:165, foodRespawnInterval:6, botThinkInterval:10, botRespawnTicks:210, magnetRadius:8, magnetPullSpeed:17, headWinMassRatio:1.24,
});
const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
const distance2=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy};
const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const segmentCount=mass=>Math.min(RULES.maxSegments,RULES.startSegments+Math.floor(Math.max(0,mass)/RULES.massPerSegment));
export {segmentCount};
export const FOOD_TYPES=Object.freeze([['energy_orb',1,32],['crystal_shard',2,18],['star_dust',3,12],['heart_core',1,6],['coin_core',1,5],['galaxy_orb',5,5],['element_gem',3,7],['xp_crystal',2,6],['event_star',3,5],['mystic_cube',5,4]].map(([id,mass,weight])=>({id,mass,weight})));

export class CrystalArena {
  constructor(seed=20261123){this.seed=seed>>>0||1;this.players=[];this.food=[];this.effects=[];this.tick=0;this.nextFoodId=1;}
  random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
  point(padding=5){return {x:padding+this.random()*(RULES.worldSize-2*padding),y:padding+this.random()*(RULES.worldSize-2*padding)};}
  addPlayer({id,skin='pebble_wisp',x=90,y=90,angle=0,isBot=false,displayName=null,difficulty=.5,personality='harvester',initialMass=0}){
    if(this.players.some(p=>p.id===id))throw new Error('Duplicate player id');
    const p={id,displayName:displayName||id,skin,x,y,angle,aimAngle:angle,isBot,alive:true,mass:Math.max(0,initialMass),score:Math.max(0,initialMass),boost:false,
      segmentCount:segmentCount(initialMass),history:[],body:[],lastDeath:null,shieldUntilTick:0,speedUntilTick:0,magnetUntilTick:0,
      personality,difficulty:clamp(difficulty,0,1),aiDecisionTick:0,respawns:0};
    // Path points are correctly spaced behind the forward heading.
    for(let i=0;i<32;i++)p.history.push({x:x-i*RULES.bodySpacing*Math.cos(angle),y:y-i*RULES.bodySpacing*Math.sin(angle)});
    p.body=this.sampleBody(p);
    this.players.push(p);return p;
  }
  addFood({x,y,type='energy_orb',mass=1,source='normal'}){
    const f={id:this.nextFoodId++,x,y,type,mass,source};this.food.push(f);return f;
  }
  rollFood(){let r=this.random()*FOOD_TYPES.reduce((n,f)=>n+f.weight,0);for(const f of FOOD_TYPES){r-=f.weight;if(r<0)return f;}return FOOD_TYPES[0];}
  spawnFood(source='normal'){for(let i=0;i<12;i++){const pos=this.point(3);if(this.players.some(p=>p.alive&&distance2(p,pos)<8))continue;const f=this.rollFood();this.addFood({...pos,type:f.id,mass:f.mass,source});return true;}return false;}
  seedFood(n=120){for(let i=0;i<Math.min(n,RULES.foodCap-this.food.length);i++)this.spawnFood();}
  sampleBody(player){
    const nodes=[];const hist=player.history;if(!hist.length)return nodes;
    let i=0;let distanceAlong=0;
    for(let k=0;k<player.segmentCount;k++){
      const want=k*RULES.bodySpacing;
      while(i<hist.length-1){
        const a=hist[i],b=hist[i+1],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(distanceAlong+d>=want-1e-9)break;
        distanceAlong+=d;i++;
      }
      const a=hist[i],b=hist[Math.min(i+1,hist.length-1)];
      const seg=Math.hypot(a.x-b.x,a.y-b.y);
      const t=seg?clamp((want-distanceAlong)/seg,0,1):0;
      nodes.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    }
    return nodes;
  }
  kill(player,cause='collision',killerId=null){
    if(!player.alive)return false;
    player.alive=false;player.lastDeath={tick:this.tick,cause,killerId,x:player.x,y:player.y,skin:player.skin};
    this.effects.push({...player.lastDeath,age:0,id:'death-'+player.id+'-'+this.tick});
    // Fair drop: produce up to 50 pellets but conserve mass represented by pellets.
    let remaining=Math.floor(player.mass*RULES.deathDropFraction);if(!remaining)remaining=4;
    const num=Math.min(50,Math.max(0,remaining));
    for(let i=0;i<num;i++){
      const piecesLeft=num-i;
      const mass=Math.max(1,Math.ceil(remaining/piecesLeft));
      const loc=player.body.length?player.body[Math.floor(i*player.body.length/num)]:player;
      let type=mass>=5?'galaxy_orb':mass>=3?'star_dust':mass===2?'crystal_shard':'energy_orb';
      this.addFood({x:clamp(loc.x+(this.random()-.5)*1.0,1,179),y:clamp(loc.y+(this.random()-.5)*1.0,1,179),type,mass,source:'death'});
      remaining-=mass;
    }
    return true;
  }
  steerBots(){
    for(const p of this.players){if(!p.isBot||!p.alive||this.tick<p.aiDecisionTick)continue;
      p.aiDecisionTick=this.tick+RULES.botThinkInterval+(p.id.length%3);
      const others=this.players.filter(q=>q!==p&&q.alive);
      let target=null,priority=-Infinity;
      for(const f of this.food){const distance=Math.hypot(f.x-p.x,f.y-p.y);const value=(f.mass+1.3)/(distance+3);if(value>priority){target=f;priority=value;}}
      if(!target)target={x:90,y:90};
      if(p.personality==='hunter'&&p.mass>=15){const prey=others.filter(q=>q.mass<p.mass*.7).sort((a,b)=>distance2(a,p)-distance2(b,p))[0];if(prey&&distance2(prey,p)<400)target=prey;}
      let heading=p.angle,highest=-Infinity;
      for(let n=-5;n<=5;n++){const a=p.angle+n*.24,dx=Math.cos(a),dy=Math.sin(a),look={x:p.x+dx*5.5,y:p.y+dy*5.5};
        const dist=Math.hypot(target.x-p.x,target.y-p.y);
        let value=(dx*(target.x-p.x)+dy*(target.y-p.y))/(dist+.1)*2.3-Math.abs(n)*.065;
        const edge=Math.min(look.x,look.y,180-look.x,180-look.y);if(edge<8)value-=Math.max(0,8-edge)*2.3;
        for(const q of others){const near=Math.hypot(look.x-q.x,look.y-q.y),ratio=(p.mass+24)/(q.mass+24);
          if(near<5)value-=(5-near)*(ratio<1.3?2.5:.55);
          const stride=Math.max(1,Math.floor(q.body.length/32));
          for(let k=2;k<q.body.length;k+=stride){const seg=q.body[k],d=Math.hypot(look.x-seg.x,look.y-seg.y);if(d<3.4)value-=(3.4-d)*3.2;}
        }
        if(value>highest){highest=value;heading=a;}
      }
      p.aimAngle=normalizeAngle(heading);
      const danger=Math.min(p.x,p.y,180-p.x,180-p.y)<8;
      p.boost=!danger&&p.difficulty>.45&&p.personality!=='cautious'&&distance2(p,target)>100&&highest>1;
    }
  }
  respawnBot(p){
    let loc=this.point(22);
    for(let i=0;i<20;i++){const trial=this.point(22);if(this.players.every(other=>!other.alive||distance2(other,trial)>144)){loc=trial;break;}}
    p.x=loc.x;p.y=loc.y;p.angle=this.random()*Math.PI*2;p.aimAngle=p.angle;p.mass=Math.floor(3+p.difficulty*16+this.random()*9);
    p.score=p.mass;p.segmentCount=segmentCount(p.mass);p.alive=true;p.respawns++;p.lastDeath=null;p.shieldUntilTick=this.tick+120;
    p.boost=false;p.speedUntilTick=0;p.magnetUntilTick=0;p.aiDecisionTick=this.tick;
    p.history=[];for(let i=0;i<Math.max(32,p.segmentCount+2);i++)p.history.push({x:p.x-i*RULES.bodySpacing*Math.cos(p.angle),y:p.y-i*RULES.bodySpacing*Math.sin(p.angle)});p.body=this.sampleBody(p);
  }
  step(dt=RULES.fixedDt){
    if(Math.abs(dt-RULES.fixedDt)>1e-6)throw new Error('Use fixed 1/60 s tick for deterministic updates');
    this.tick++;for(const p of this.players)if(p.isBot&&!p.alive&&p.lastDeath&&this.tick-p.lastDeath.tick>=RULES.botRespawnTicks)this.respawnBot(p);this.steerBots();
    // movement, and path history crop
    for(const p of this.players){if(!p.alive)continue;
      const turn=RULES.turnRate*(p.isBot?.82+p.difficulty*.26:1);
      const delta=clamp(normalizeAngle(p.aimAngle-p.angle),-turn*dt,turn*dt);
      p.angle=normalizeAngle(p.angle+delta);
      const velocity=p.boost||p.speedUntilTick>this.tick?RULES.boostSpeed:RULES.speed;
      const nx=p.x+Math.cos(p.angle)*velocity*dt,ny=p.y+Math.sin(p.angle)*velocity*dt;
      if(nx<RULES.headRadius||nx>RULES.worldSize-RULES.headRadius||ny<RULES.headRadius||ny>RULES.worldSize-RULES.headRadius){
        // Lethal perimeter: player never visually walks outside the visible world.
        this.kill(p,'boundary');continue;
      }
      p.x=nx;p.y=ny;
      p.history.unshift({x:p.x,y:p.y});
      p.segmentCount=segmentCount(p.mass);
      // trail length is bounded even at maximum body size
      const needed=RULES.maxSegments*RULES.bodySpacing+3;
      let length=0,cut=p.history.length;
      for(let j=1;j<p.history.length;j++){
        length+=Math.hypot(p.history[j].x-p.history[j-1].x,p.history[j].y-p.history[j-1].y);
        if(length>needed){cut=j+1;break;}
      }
      if(cut<p.history.length)p.history.length=cut;
      p.body=this.sampleBody(p);
    }
    // simultaneous head-to-head kills handled without loop-order advantage
    const dead=new Set(), killers=new Map();const alive=this.players.filter(p=>p.alive);const shielded=p=>p.shieldUntilTick>this.tick;
    for(let i=0;i<alive.length;i++){
      const a=alive[i];if(a.x<.5||a.x>179.5||a.y<.5||a.y>179.5){dead.add(a);continue;}
      for(let j=i+1;j<alive.length;j++){
        const b=alive[j];if(distance2(a,b)<(RULES.headRadius*2)**2){
          if(shielded(a)&&shielded(b))continue;
          if(shielded(a)){dead.add(b);killers.set(b.id,a.id);continue;}
          if(shielded(b)){dead.add(a);killers.set(a.id,b.id);continue;}
          const pa=a.mass+RULES.startSegments*RULES.massPerSegment,pb=b.mass+RULES.startSegments*RULES.massPerSegment;
          if(pa>=pb*RULES.headWinMassRatio){dead.add(b);killers.set(b.id,a.id);}
          else if(pb>=pa*RULES.headWinMassRatio){dead.add(a);killers.set(a.id,b.id);}
          else{dead.add(a);dead.add(b);}
        }
      }
      for(const b of alive){if(a===b)continue;
        for(let k=1;k<b.body.length;k++){
          if(distance2(a,b.body[k])<(RULES.headRadius+RULES.bodyRadius)**2){if(!shielded(a)){dead.add(a);killers.set(a.id,b.id);}break;}
        }
        if(dead.has(a))break;
      }
    }
    for(const p of dead)this.kill(p,'collision',killers.get(p.id)||null);
    // Tick-based magnet attraction. No instantaneous teleporting pellets.
    for(const p of this.players){if(!p.alive||p.magnetUntilTick<=this.tick)continue;
      for(const f of this.food){const dx=p.x-f.x,dy=p.y-f.y,ds=dx*dx+dy*dy;if(ds>RULES.magnetRadius**2||ds<.01)continue;
        const distance=Math.sqrt(ds),move=Math.min(distance,RULES.magnetPullSpeed*dt);f.x+=dx/distance*move;f.y+=dy/distance*move;}}
    // Collect food; one pickup per food; player-order fairness requires authoritative arbitration in MP
    const consumed=new Set();
    for(const p of this.players){if(!p.alive)continue;
      for(const f of this.food){if(consumed.has(f.id))continue;
        if(distance2(p,f)<(RULES.headRadius+.42)**2){
          consumed.add(f.id);p.mass+=f.mass;p.score+=f.mass;
        }
      }
      p.segmentCount=segmentCount(p.mass);p.body=this.sampleBody(p);
    }
    if(consumed.size)this.food=this.food.filter(f=>!consumed.has(f.id));
    if(this.tick%RULES.foodRespawnInterval===0&&this.food.length<RULES.foodTarget){
      const deficit=RULES.foodTarget-this.food.length,batch=Math.min(deficit,deficit>=30?4:deficit>=12?2:1);
      for(let i=0;i<batch;i++)this.spawnFood('respawn');
    }
    for(const effect of this.effects)effect.age+=dt;
    this.effects=this.effects.filter(effect=>effect.age<1.3);
  }
}

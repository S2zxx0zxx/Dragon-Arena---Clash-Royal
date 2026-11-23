/* Original 2D/3D-agnostic arena simulation starter; deterministic fixed step.
 * A production multiplayer game must move this simulation to an authoritative server.
 * This is NOT an anti-cheat implementation or a 20-player performance guarantee.
 */
export const RULES=Object.freeze({
  worldSize:180, startSegments:8, minSegments:6, maxSegments:220,
  bodySpacing:0.62, massPerSegment:3, headRadius:.46, bodyRadius:.38,
  speed:4.9, boostSpeed:7.3, turnRate:3.7, deathDropFraction:.65,
  fixedDt:1/60, foodCap:180,
});
const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
const distance2=(a,b)=>{const dx=a.x-b.x,dy=a.y-b.y;return dx*dx+dy*dy};
const normalizeAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const segmentCount=mass=>Math.min(RULES.maxSegments,RULES.startSegments+Math.floor(Math.max(0,mass)/RULES.massPerSegment));
export {segmentCount};
export class CrystalArena {
  constructor(seed=20261123){this.seed=seed>>>0||1;this.players=[];this.food=[];this.effects=[];this.tick=0;this.nextFoodId=1;}
  random(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
  point(padding=5){return {x:padding+this.random()*(RULES.worldSize-2*padding),y:padding+this.random()*(RULES.worldSize-2*padding)};}
  addPlayer({id,skin='pebble_wisp',x=90,y=90,angle=0,isBot=false}){
    if(this.players.some(p=>p.id===id))throw new Error('Duplicate player id');
    const p={id,skin,x,y,angle,aimAngle:angle,isBot,alive:true,mass:0,score:0,boost:false,
      segmentCount:RULES.startSegments,history:[],body:[],lastDeath:null,shieldUntilTick:0};
    // Path points are correctly spaced behind the forward heading.
    for(let i=0;i<32;i++)p.history.push({x:x-i*RULES.bodySpacing*Math.cos(angle),y:y-i*RULES.bodySpacing*Math.sin(angle)});
    p.body=this.sampleBody(p);
    this.players.push(p);return p;
  }
  addFood({x,y,type='energy_orb',mass=1,source='normal'}){
    const f={id:this.nextFoodId++,x,y,type,mass,source};this.food.push(f);return f;
  }
  seedFood(n=120){for(let i=0;i<n;i++){
    const p=this.point(3),r=this.random();const type=r<.65?'energy_orb':r<.87?'crystal_shard':r<.97?'star_dust':'galaxy_orb';
    const mass={energy_orb:1,crystal_shard:2,star_dust:3,galaxy_orb:5}[type];this.addFood({...p,type,mass});
  }}
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
    let remaining=Math.floor(player.mass*RULES.deathDropFraction);
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
    for(const p of this.players){if(!p.isBot||!p.alive)continue;
      let best=null,bestDist=Infinity;
      for(const food of this.food){const d=distance2(p,food);if(d<bestDist){best=food;bestDist=d;}}
      const target=best||{x:90,y:90};let heading=Math.atan2(target.y-p.y,target.x-p.x);
      const edge=12;
      if(p.x<edge||p.y<edge||p.x>180-edge||p.y>180-edge)heading=Math.atan2(90-p.y,90-p.x);
      p.aimAngle=heading;
      p.boost=false;
    }
  }
  step(dt=RULES.fixedDt){
    if(Math.abs(dt-RULES.fixedDt)>1e-6)throw new Error('Use fixed 1/60 s tick for deterministic updates');
    this.tick++;this.steerBots();
    // movement, and path history crop
    for(const p of this.players){if(!p.alive)continue;
      const delta=clamp(normalizeAngle(p.aimAngle-p.angle),-RULES.turnRate*dt,RULES.turnRate*dt);
      p.angle=normalizeAngle(p.angle+delta);
      const velocity=p.boost?RULES.boostSpeed:RULES.speed;
      p.x+=Math.cos(p.angle)*velocity*dt;p.y+=Math.sin(p.angle)*velocity*dt;
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
        const b=alive[j];if(distance2(a,b)<(RULES.headRadius*2)**2){if(!shielded(a))dead.add(a);if(!shielded(b))dead.add(b);}
      }
      for(const b of alive){if(a===b)continue;
        for(let k=1;k<b.body.length;k++){
          if(distance2(a,b.body[k])<(RULES.headRadius+RULES.bodyRadius)**2){if(!shielded(a)){dead.add(a);killers.set(a.id,b.id);}break;}
        }
        if(dead.has(a))break;
      }
    }
    for(const p of dead)this.kill(p,'collision',killers.get(p.id)||null);
    // Collect food; one pickup per food; player-order fairness requires authoritative arbitration in MP
    const consumed=new Set();
    for(const p of this.players){if(!p.alive)continue;
      for(const f of this.food){if(consumed.has(f.id))continue;
        if(distance2(p,f)<(.46+.28)**2){
          consumed.add(f.id);p.mass+=f.mass;p.score+=f.mass;
        }
      }
      p.segmentCount=segmentCount(p.mass);p.body=this.sampleBody(p);
    }
    if(consumed.size)this.food=this.food.filter(f=>!consumed.has(f.id));
    if(this.tick%30===0 && this.food.length<RULES.foodCap){
      const loc=this.point();this.addFood({...loc,type:'energy_orb',mass:1});
    }
    for(const effect of this.effects)effect.age+=dt;
    this.effects=this.effects.filter(effect=>effect.age<1.3);
  }
}

/** Device-local energy regeneration. Does NOT claim secure server time. */
export const MAX_ENERGY=20;
export const REGEN_MS=15*60*1000;
export function syncEnergy(save,now=Date.now()){
 if(!Number.isFinite(now))throw Error('Invalid clock');
 save.energy=Math.max(0,Math.min(MAX_ENERGY,Number.isFinite(save.energy)?Math.floor(save.energy):MAX_ENERGY));
 if(!Number.isFinite(save.energyUpdatedAt))save.energyUpdatedAt=now;
 if(now<save.energyUpdatedAt)return save.energy;
 if(save.energy>=MAX_ENERGY){save.energyUpdatedAt=now;return save.energy;}
 const cycles=Math.floor((now-save.energyUpdatedAt)/REGEN_MS);
 if(cycles>0){save.energy=Math.min(MAX_ENERGY,save.energy+cycles);save.energyUpdatedAt=save.energy===MAX_ENERGY?now:save.energyUpdatedAt+cycles*REGEN_MS;}
 return save.energy;
}
export function spendEnergy(save,amount=1,now=Date.now()){
 syncEnergy(save,now);if(!Number.isInteger(amount)||amount<1)throw Error('Invalid price');
 if(save.energy<amount)return false;
 const full=save.energy===MAX_ENERGY;save.energy-=amount;if(full)save.energyUpdatedAt=now;return true;
}
export function grantEnergy(save,amount=5,now=Date.now()){
 syncEnergy(save,now);if(!Number.isInteger(amount)||amount<1)throw Error('Invalid grant');
 const previous=save.energy;save.energy=Math.min(MAX_ENERGY,save.energy+amount);
 if(save.energy===MAX_ENERGY)save.energyUpdatedAt=now;
 return save.energy-previous;
}

export const WORLD_BOUNDARY = 109;
export const SAVE_KEY = 'aetherfall-save-v1';
export const BEACON_IDS = ['grove', 'tide', 'crown'];
export function freshState() {
  return { version:1, x:0, z:44, hp:100, xp:0, shards:0, totalShards:0, potions:3, sword:0, vitality:0, beacons:[], collected:[], defeated:[], discovered:[], metKeeper:false, won:false, playTime:0 };
}
export const levelOf = s => Math.min(10,1+Math.floor(s.xp/120));
export const maxHealth = s => 100+(levelOf(s)-1)*15+s.vitality*25;
export const swordDamage = s => 25+(levelOf(s)-1)*4+s.sword*10;
export const upgradeCost = rank => 15+rank*15;
export function validateSave(raw) {
  if (!raw || raw.version!==1) return null;
  const s=freshState();
  for(const key of ['xp','shards','totalShards','playTime']) if(Number.isFinite(raw[key])) s[key]=Math.max(0,Math.min(raw[key],1000000));
  for(const key of ['sword','vitality','potions']) if(Number.isFinite(raw[key])) s[key]=Math.max(0,Math.min(3,Math.floor(raw[key])));
  for(const key of ['metKeeper','won']) s[key]=raw[key]===true;
  s.beacons=[...new Set(Array.isArray(raw.beacons)?raw.beacons.filter(b=>BEACON_IDS.includes(b)):[])];
  for(const key of ['collected','defeated','discovered']) s[key]=[...new Set(Array.isArray(raw[key])?raw[key].filter(v=>(typeof v==='string'&&v.length<64)||(Number.isInteger(v)&&v>=0&&v<1000)):[])].slice(0,1000);
  if(Number.isFinite(raw.x)&&Number.isFinite(raw.z)&&Math.hypot(raw.x,raw.z)<=WORLD_BOUNDARY+.001){s.x=raw.x;s.z=raw.z;}
  s.hp=Number.isFinite(raw.hp)?Math.max(1,Math.min(maxHealth(s),raw.hp)):maxHealth(s);
  s.won=s.won&&s.beacons.length===3&&s.defeated.includes('warden');
  if(Number.isFinite(raw.hp)&&raw.hp<=0)respawn(s);
  return s;
}
export function collectShard(s,id){if(s.collected.includes(id))return false;s.collected.push(id);s.shards++;s.totalShards++;return true;}
export function reward(s,xp,shards){const before=levelOf(s);s.xp+=xp;s.shards+=shards;s.totalShards+=shards;if(levelOf(s)>before)s.hp=maxHealth(s);return levelOf(s)>before;}
export function restoreBeacon(s,id,guardiansRemain){if(!BEACON_IDS.includes(id)||s.beacons.includes(id)||guardiansRemain)return false;s.beacons.push(id);reward(s,75,15);s.hp=maxHealth(s);s.potions=3;return true;}
export function buyUpgrade(s,kind){if(!['sword','vitality'].includes(kind)||s[kind]>=3||s.shards<upgradeCost(s[kind]))return false;s.shards-=upgradeCost(s[kind]);s[kind]++;s.hp=Math.min(maxHealth(s),s.hp+(kind==='vitality'?25:0));return true;}
export function usePotion(s){if(s.potions<=0||s.hp>=maxHealth(s))return false;s.potions--;s.hp=Math.min(maxHealth(s),s.hp+65);return true;}
export function respawn(s){s.x=0;s.z=44;s.hp=maxHealth(s);s.potions=3;return s;}

import {maxHealth,swordDamage} from './state.js';
export const SHOP={arrows:{name:'20 arrows',cost:6},sword:{name:'Starforged sword · +20 damage',cost:35},flasks:{name:'Refill all healing flasks',cost:5}};
export function travel(s,chapter){
  if(![1,2].includes(chapter)||chapter===s.chapter||s.beacons.length!==3)return false;
  s.chapter=chapter;s.x=0;s.z=44;s.hp=maxHealth(s);s.potions=3;
  if(chapter===2&&!s.bow){s.bow=true;s.arrows+=30;}
  return true;
}
export function purchase(s,item){
  if(!Object.hasOwn(SHOP,item)||s.shards<SHOP[item].cost)return false;
  if(item==='sword'&&s.starSword||item==='arrows'&&(!s.bow||s.arrows>179)||item==='flasks'&&s.potions>=3)return false;
  s.shards-=SHOP[item].cost;
  if(item==='arrows')s.arrows+=20;if(item==='sword')s.starSword=true;if(item==='flasks')s.potions=3;
  return true;
}
export function useArrow(s){if(!s.bow||s.arrows<1)return false;s.arrows--;return true;}
export const bowDamage=s=>32+Math.floor(swordDamage(s)*.35);

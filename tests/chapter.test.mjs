import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,validateSave,swordDamage,respawn} from '../src/state.js';
import {travel,purchase,useArrow} from '../src/chapter.js';
test('three beacons unlock travel without requiring the old boss',()=>{
 const s=freshState();assert.equal(travel(s,2),false);s.beacons=['grove','tide'];assert.equal(travel(s,2),false);s.beacons.push('crown');assert.ok(travel(s,2));assert.equal(s.chapter,2);assert.equal(s.bow,true);assert.equal(s.arrows,30);assert.equal(s.z,44);
 useArrow(s);assert.ok(travel(s,1));assert.ok(travel(s,2));assert.equal(s.arrows,29);
});
test('shop charges exactly once, caps ammo, and stacks sword upgrades',()=>{
 const s=freshState();s.bow=true;s.shards=100;s.sword=2;const old=swordDamage(s);assert.ok(purchase(s,'sword'));assert.equal(swordDamage(s),old+20);assert.equal(s.shards,65);assert.equal(purchase(s,'sword'),false);assert.ok(purchase(s,'arrows'));assert.equal(s.arrows,20);assert.equal(s.shards,59);s.arrows=190;assert.equal(purchase(s,'arrows'),false);assert.equal(purchase(s,'__proto__'),false);s.shards=0;assert.equal(purchase(s,'arrows'),false);
});
test('old saves migrate and chapter gear survives death and reload',()=>{
 const old=validateSave({version:1,hp:100});assert.equal(old.chapter,1);assert.equal(old.bow,false);assert.equal(old.arrows,0);
 const s=freshState();s.beacons=['grove','tide','crown'];travel(s,2);s.starSword=true;s.defeated.push('storm-regent');s.hp=0;const loaded=validateSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.chapter,2);assert.equal(loaded.bow,true);assert.equal(loaded.starSword,true);assert.equal(loaded.chapterTwoWon,true);assert.equal(loaded.arrows,30);respawn(loaded);assert.equal(loaded.chapter,2);assert.equal(loaded.z,44);
});
test('no arrows can be fired from an empty or locked bow',()=>{const s=freshState();s.arrows=3;assert.equal(useArrow(s),false);s.bow=true;assert.ok(useArrow(s));assert.equal(s.arrows,2);s.arrows=0;assert.equal(useArrow(s),false);});

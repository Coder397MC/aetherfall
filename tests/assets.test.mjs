import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
test('detailed hero is bundled with required locomotion clips and local decoder',async()=>{
 const bytes=await readFile(new URL('../assets/wayfarer.glb',import.meta.url));assert.equal(bytes.readUInt32LE(0),0x46546c67);const count=bytes.readUInt32LE(12);const gltf=JSON.parse(bytes.subarray(20,20+count));
 for(const name of ['idle','walk_loop','sprint_loop','punch_jab'])assert.ok(gltf.animations.some(a=>a.name===name),name);
 assert.ok(gltf.skins.length);for(const file of ['vendor/addons/libs/draco/draco_decoder.wasm','vendor/addons/libs/draco/draco_wasm_wrapper.js','assets/forest-ground.jpg','assets/forest-normal.jpg'])await access(new URL('../'+file,import.meta.url));
 assert.ok(bytes.length<1000000,'hero stays below 1 MB');
});

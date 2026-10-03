import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {heightAt,terrainSurfaceAt,walkSurfaceAt,TERRAIN_RINGS as rings,TERRAIN_SECTORS as sectors,TERRAIN_RADIUS as radius} from '../src/terrain.js';
test('low dry ground has no invisible water-height floor',()=>{
 for(const [x,z] of [[-55,60],[-60,65],[-65,70]]){assert.ok(terrainSurfaceAt(x,z)<1);assert.equal(walkSurfaceAt(x,z),terrainSurfaceAt(x,z));}
 assert.equal(walkSurfaceAt(37,24),1.65);assert.equal(walkSurfaceAt(-55,60,2),3);
});
test('walking uses the rendered terrain triangles at slopes and seams',()=>{
 const vertices=[],indices=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<=sectors;i++){const a=i/sectors*Math.PI*2,r=j/rings*radius,x=Math.sin(a)*r,z=Math.cos(a)*r;vertices.push(x,heightAt(x,z),z);if(j<rings&&i<sectors){const n=j*(sectors+1)+i,b=n+sectors+1;indices.push(n,b,n+1,n+1,b,b+1);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
 const ray=new THREE.Raycaster();
 for(const [x,z] of [[-55,60],[0,44],[.01,90],[-.01,90],[65,-30],[-72,-25],[0,0],[20,20]]){ray.set(new THREE.Vector3(x,100,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(mesh)[0];assert.ok(hit);assert.ok(Math.abs(terrainSurfaceAt(x,z)-hit.point.y)<1e-5);}
 geo.dispose();mesh.material.dispose();
});
test('platform rims use their own heights instead of the taller inner tier',()=>{
 assert.equal(walkSurfaceAt(12,-18),Math.max(terrainSurfaceAt(12,-18),heightAt(0,-18)+.8));
 assert.equal(walkSurfaceAt(0,-18),Math.max(terrainSurfaceAt(0,-18),heightAt(0,-18)+1.175));
 const x=19,z=17+5*1.6;assert.equal(walkSurfaceAt(x,z),Math.max(terrainSurfaceAt(x,z),heightAt(19,17)+1.04+Math.sin(5/12*Math.PI)*1.3));
});

import {ruggedMaterial} from './materials.js';
import * as THREE from '../vendor/three.module.js';
import {createCharacter,random} from './world.js';
export const frostHeight=()=>3;
export function createFrostWorld(scene){
 const rng=random(92),colliders=[],pickups=[],crystals=[];
 const material=(color,extra={})=>ruggedMaterial(color,'stone',{roughness:.55,...extra});
 const ice=material(0x85c5d9),rock=material(0x263a64),gold=material(0xd8bd82,{metalness:.6}),glow=material(0x8ceeff,{emissive:0x41bfe8,emissiveIntensity:2});
 const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
 scene.background=new THREE.Color(0x132241);scene.fog.color.set(0x31496e);scene.fog.density=.006;
 add(new THREE.CylinderGeometry(112,105,9,96),ice,0,-1.5,0);
 const arena=add(new THREE.CylinderGeometry(22,24,.35,48),rock,0,2.82,-55);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const m=add(new THREE.BoxGeometry(.3,.08,6),glow,Math.sin(a)*19,3.3,-55+Math.cos(a)*19);m.rotation.y=a;}
 for(let i=0;i<130;i++){const a=rng()*6.283,r=25+rng()*79,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(x)<13||Math.hypot(x,z+55)<28||Math.hypot(x+9,z-38)<12)continue;const h=3+rng()*10;const m=add(new THREE.ConeGeometry(1+rng()*2,h,5),i%3?rock:ice,x,3+h/2,z);m.rotation.z=(rng()-.5)*.25;colliders.push({x,z,r:1.6});if(i%4===0)crystals.push(add(new THREE.OctahedronGeometry(1.3),glow,x,4+h,z));}
 // Frost-paved approach, glowing lanterns, and the Regent's broken colonnade.
 const pathMat=material(0x5d8fae),snowMat=material(0xd5eef2);
 for(let i=0;i<23;i++){const z=40-i*4;const slab=add(new THREE.BoxGeometry(5,.08,2.8),pathMat,Math.sin(i*.45)*1.4,3.04,z);slab.rotation.y=Math.sin(i)*.07;if(i%3===0)for(const side of [-1,1]){add(new THREE.CylinderGeometry(.35,.5,1.6,6),rock,side*5,3.8,z);add(new THREE.OctahedronGeometry(.4),glow,side*5,4.8,z);}}
 for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2,x=Math.sin(a)*25,z=-55+Math.cos(a)*25;if(z>-35)continue;add(new THREE.CylinderGeometry(1,1.4,8,7),rock,x,7,z);add(new THREE.CylinderGeometry(1.8,1.8,.4,7),gold,x,11,z);add(new THREE.OctahedronGeometry(.8),glow,x,12,z);}
 for(let i=0;i<45;i++){const x=(rng()-.5)*190,z=(rng()-.5)*180;if(Math.abs(x)<16||Math.hypot(x,z+55)<29||Math.hypot(x+9,z-38)<15)continue;const h=3+rng()*4;add(new THREE.CylinderGeometry(.18,.3,h,6),rock,x,3+h/2,z);for(let j=0;j<3;j++)add(new THREE.ConeGeometry(2-j*.5,2.8,7),j%2?ice:snowMat,x,4+j*1.3+h*.35,z);colliders.push({x,z,r:.7});}
 // A sheltered trading post and the return arch.
 const npc=createCharacter(0x673e79,0xe9c87c);npc.position.set(-7,3,35);scene.add(npc);
 add(new THREE.BoxGeometry(5,1.4,2),rock,-7,3.7,32);
 add(new THREE.BoxGeometry(8,.4,5),gold,-7,7,34);
 for(const x of [-10.5,-3.5])add(new THREE.CylinderGeometry(.16,.16,4,8),gold,x,5,34);
 const gate=add(new THREE.TorusGeometry(4,.4,8,48),gold,0,7,51);
 const gateCore=add(new THREE.CircleGeometry(3.6,48),new THREE.MeshBasicMaterial({color:0x8fe7ff,transparent:true,opacity:.4,side:THREE.DoubleSide}),0,7,51);
 for(let i=0;i<36;i++){const x=(rng()-.5)*155,z=(rng()-.5)*150;const m=add(new THREE.OctahedronGeometry(.4),glow,x,4,z);pickups.push({id:`frost-${i}`,x,z,object:m});}
 // Aurora curtains, moons, and floating fragments frame the new realm.
 for(let i=0;i<7;i++){const m=add(new THREE.PlaneGeometry(180,12),new THREE.MeshBasicMaterial({color:i%2?0x70ffd5:0x9182ff,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}),0,45+i*4,-100-i*8);m.rotation.z=Math.sin(i)*.15;}
 add(new THREE.SphereGeometry(12,24,16),new THREE.MeshBasicMaterial({color:0xc6dcff}),-90,70,-150);
 for(let i=0;i<24;i++){const a=i*6.283/24;const m=add(new THREE.IcosahedronGeometry(12+rng()*12,0),rock,Math.sin(a)*160,-6+rng()*18,Math.cos(a)*160);m.scale.y=.5;}
 const positions=new Float32Array(450*3);for(let i=0;i<450;i++){positions[i*3]=(rng()-.5)*220;positions[i*3+1]=4+rng()*40;positions[i*3+2]=(rng()-.5)*220;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));const snow=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xbcecff,size:.18,transparent:true,opacity:.8}));scene.add(snow);
 return {npc,colliders,pickups,beaconObjects:[],gate,gateCore,update(t){crystals.forEach((c,i)=>{c.rotation.y=t*.4;c.position.y+=Math.sin(t+i)*.002;});pickups.forEach(p=>p.object.rotation.y=t);gateCore.material.opacity=.32+Math.sin(t)*.1;snow.rotation.y=t*.008;}};
}

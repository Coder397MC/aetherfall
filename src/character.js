import * as THREE from '../vendor/three.module.js';
import {ruggedMaterial,contactShadow} from './materials.js';
export function createDetailedCharacter(cloakColor=0x304c48,trimColor=0xb69b67){
 const g=new THREE.Group(),torso=new THREE.Group();g.add(torso);g.add(contactShadow(.65));
 const cloth=ruggedMaterial(cloakColor,'cloth'),leather=ruggedMaterial(0x514033,'cloth'),boot=ruggedMaterial(0x302a26),skin=new THREE.MeshStandardMaterial({color:0xc59572,roughness:.86}),hair=ruggedMaterial(0x332922),metal=new THREE.MeshStandardMaterial({color:trimColor,metalness:.72,roughness:.38}),steel=new THREE.MeshStandardMaterial({color:0xa9b7b8,metalness:.85,roughness:.27});
 const add=(parent,geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(p,w,h,d,m,x,y,z)=>add(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const ellipsoid=(p,r,m,x,y,z,sx,sy,sz)=>{const o=add(p,new THREE.SphereGeometry(r,12,10),m,x,y,z);o.scale.set(sx,sy,sz);return o;};
 // Narrow waist, longer legs, a smaller head, and shoulder articulation.
 const chest=add(torso,new THREE.CylinderGeometry(.29,.24,.62,12),cloth,0,1.37,0);chest.scale.z=.7;
 const skirt=add(torso,new THREE.CylinderGeometry(.25,.34,.32,12),cloth,0,.99,0);skirt.scale.z=.8;
 const vest=add(torso,new THREE.CylinderGeometry(.305,.255,.43,12,1,true),leather,0,1.37,0);vest.scale.z=.73;
 const belt=add(torso,new THREE.CylinderGeometry(.27,.27,.105,12),leather,0,1.12,0);belt.scale.z=.86;box(torso,.12,.09,.035,metal,0,1.12,.243);
 const strap=box(torso,.09,.65,.045,leather,0,1.45,.215);strap.rotation.z=-.48;
 for(let i=0;i<6;i++)add(torso,new THREE.SphereGeometry(.016,5,4),metal,-.13+i*.052,1.7-i*.102,.246);
 // Neck, cheekbones, nose, brows, eyes, hairline, ears, and a short beard.
 add(torso,new THREE.CylinderGeometry(.085,.105,.19,10),skin,0,1.78,0);
 ellipsoid(torso,.22,skin,0,1.98,.015,.77,1.13,.84);
 for(const side of [-1,1]){
  ellipsoid(torso,.048,skin,side*.174,1.97,0,.65,1,.7);
  ellipsoid(torso,.019,boot,side*.066,2.015,.18,1,.58,.4);
  const brow=box(torso,.068,.021,.021,hair,side*.067,2.055,.172);brow.rotation.z=side*.13;
  ellipsoid(torso,.053,skin,side*.09,1.955,.145,1,.65,.45);
 }
 ellipsoid(torso,.046,skin,0,1.978,.188,.55,1.05,1.05);
 const beard=ellipsoid(torso,.16,hair,0,1.86,.09,.8,.58,.76);
 box(torso,.072,.012,.016,skin,0,1.905,.19);
 const hood=add(torso,new THREE.SphereGeometry(.226,12,10,0,Math.PI*2,0,Math.PI*.54),hair,0,2.005,-.012);hood.scale.set(.82,1.04,.91);
 ellipsoid(torso,.16,hair,0,1.975,-.115,.95,1,.52);
 // Fur collar is made of overlapping tufts rather than a solid ring.
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ellipsoid(torso,.08,ruggedMaterial(i%2?0x8b8977:0xaaa48d,'cloth'),Math.sin(a)*.26,1.68,Math.cos(a)*.18,1.2,.7,1);}
 const arms=[],legs=[],knees=[],elbows=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.34,1.62,0);torso.add(arm);arms.push(arm);
  ellipsoid(arm,.15,leather,0,-.03,0,1,.6,1.1);
  add(arm,new THREE.CylinderGeometry(.105,.09,.32,10),cloth,0,-.19,0);
  const bracer=add(arm,new THREE.CylinderGeometry(.095,.08,.26,10),leather,0,-.45,0);
  for(const y of [-.35,-.54])add(arm,new THREE.CylinderGeometry(.099,.099,.025,10),metal,0,y,0);
  ellipsoid(arm,.087,skin,0,-.63,.016,.8,1.18,.73);
  ellipsoid(arm,.033,skin,-side*.065,-.60,.05,.8,1.2,.8);
  const elbow=new THREE.Group();elbow.position.y=-.32;arm.add(elbow);elbows.push(elbow);
  for(const child of [...arm.children])if(child!==elbow&&child.position.y<-.3){arm.remove(child);child.position.y+=.32;elbow.add(child);}
  const leg=new THREE.Group();leg.position.set(side*.15,.952,0);g.add(leg);legs.push(leg);
  add(leg,new THREE.CylinderGeometry(.13,.105,.42,10),leather,0,-.21,0);
  const knee=new THREE.Group();knee.position.y=-.42;leg.add(knee);knees.push(knee);
  add(knee,new THREE.CylinderGeometry(.106,.087,.34,10),cloth,0,-.15,0);
  add(knee,new THREE.CylinderGeometry(.115,.12,.30,10),boot,0,-.33,0);
  ellipsoid(knee,.14,boot,0,-.455,.055,.88,.55,1.4);
  for(const y of [-.22,-.30])box(knee,.225,.024,.035,leather,0,y,.1);
 }
 const capeGeo=new THREE.PlaneGeometry(.83,1.15,8,10);capeGeo.translate(0,-.55,0);const cp=capeGeo.attributes.position;
 for(let i=0;i<cp.count;i++){const y=cp.getY(i);cp.setZ(i,Math.sin(cp.getX(i)*20)*.018-y*.13);cp.setX(i,cp.getX(i)*(1-y*.18));}capeGeo.computeVertexNormals();
 const cape=add(torso,capeGeo,ruggedMaterial(cloakColor,'cloth',{side:THREE.DoubleSide}),0,1.67,-.22);cape.rotation.x=.12;
 const pouch=ellipsoid(torso,.15,leather,-.29,1.02,.08,.8,1.05,.55);box(torso,.13,.055,.035,metal,-.29,1.1,.18);
 const sheath=box(torso,.13,.75,.10,leather,.29,1.12,-.2);sheath.rotation.z=-.22;
 const sword=new THREE.Group();sword.position.set(0,-.63,.1);arms[1].add(sword);
 box(sword,.08,.055,.97,steel,0,0,.61);const tip=add(sword,new THREE.ConeGeometry(.056,.22,4),steel,0,0,1.20);tip.rotation.x=Math.PI/2;
 box(sword,.31,.07,.07,metal,0,0,.13);box(sword,.075,.075,.21,leather,0,0,-.02);add(sword,new THREE.SphereGeometry(.06,8,6),metal,0,0,-.16);
 g.userData={arms,legs,knees,elbows,cape,hood,sword,torso};return g;
}

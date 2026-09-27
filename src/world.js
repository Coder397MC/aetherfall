import * as THREE from '../vendor/three.module.js';
export const BEACONS = [
  { id: 'grove', name: 'The Whispering Grove', x: -57, z: -13, color: 0x75ffc5 },
  { id: 'tide', name: 'The Sunken Observatory', x: 51, z: -38, color: 0x7fe2ff },
  { id: 'crown', name: 'The Crown of Dawn', x: 0, z: -78, color: 0xffd98c },
];
export const CAMP = { x: -9, z: 38 };
export const GATE = { x: 0, z: -18 };
export function random(seed = 7) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function heightAt(x, z) {
  const h = 3.2 + Math.sin(x * .047) * 2.3 + Math.cos(z * .045) * 2.5 + Math.sin(x * .11 + z * .06) * .8;
  const hill = 10 * Math.exp(-((x + 65) ** 2 + (z + 24) ** 2) / 900) + 11 * Math.exp(-(x * x + (z + 85) ** 2) / 1000);
  const lake = 8 * Math.exp(-((x - 37) ** 2 / 310 + (z - 24) ** 2 / 220));
  return h + hill - lake;
}
const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: .88, ...opts });
export function createWorld(scene) {
  const rng = random(3483), colliders = [], animated = [], beaconObjects = [], pickups = [], wisps = [];
  const stone = mat(0x969c8a), lightStone = mat(0xc8c5a5), darkStone = mat(0x536b63), gold = mat(0xcba660, { metalness: .6, roughness: .3 });
  const grass = mat(0xffffff, { vertexColors: true });
  const mesh = (geo, material, x = 0, y = 0, z = 0, parent = scene) => {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const cylinder = (r1, r2, h, material, x, y, z, parent = scene, sides = 8) => mesh(new THREE.CylinderGeometry(r1, r2, h, sides), material, x, y, z, parent);
  const box = (w, h, d, material, x, y, z, parent = scene) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  // A softly lit sky dome follows the horizon, with no image downloads.
  const sky = mesh(new THREE.SphereGeometry(900, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x64a9bf) }, bottom: { value: new THREE.Color(0xe8ead0) } },
    vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 top;uniform vec3 bottom;varying vec3 p;void main(){float h=clamp(normalize(p).y*1.8,0.,1.);gl_FragColor=vec4(mix(bottom,top,pow(h,.65)),1.);}'
  })); sky.castShadow = false; sky.receiveShadow = false;
  // Continuous, vertex-colored terrain.
  const vertices = [], colors = [], indices = []; const rings = 62, sectors = 192, radius = 113;
  const c = new THREE.Color();
  for (let j = 0; j <= rings; j++) for (let i = 0; i <= sectors; i++) {
    const angle = i / sectors * Math.PI * 2, r = j / rings * radius;
    const x = Math.sin(angle) * r, z = Math.cos(angle) * r, y = heightAt(x, z);
    vertices.push(x, y, z);
    const n = Math.sin(x * .18) * Math.cos(z * .2) * .5 + .5;
    c.setHSL(.285 + n * .022, .42 + n * .09, .225 + n * .060 + (y > 12 ? .06 : 0));
    if ((x - 37) ** 2 / 470 + (z - 24) ** 2 / 320 < 1.25) c.set(0xa6ae7c);
    colors.push(c.r, c.g, c.b);
    if (j < rings && i < sectors) { const a = j * (sectors + 1) + i, b = a + sectors + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const groundGeo = new THREE.BufferGeometry(); groundGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); groundGeo.setIndex(indices); groundGeo.computeVertexNormals();
  mesh(groundGeo, grass);
  // Island's fractured underside.
  const cliffPos = [], cliffCol = [], cliffIndices = [];
  for (let row = 0; row <= 7; row++) for (let i = 0; i <= 128; i++) {
    const a = i / 128 * Math.PI * 2, r = row === 0 ? radius : radius * (1 - Math.pow(row / 8, 1.5)) + Math.sin(a * 17 + row) * 4;
    const x = Math.sin(a) * r, z = Math.cos(a) * r, y = row === 0 ? heightAt(x, z) - .1 : -row * 6 - Math.sin(a * 11) * 3;
    cliffPos.push(x, y, z); c.setHSL(.42, .13, .22 + rng() * .08); cliffCol.push(c.r,c.g,c.b);
    if (row < 7 && i < 128) { const p = row * 129 + i; cliffIndices.push(p,p+129,p+1,p+1,p+129,p+130); }
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position',new THREE.Float32BufferAttribute(cliffPos,3)); cg.setAttribute('color',new THREE.Float32BufferAttribute(cliffCol,3)); cg.setIndex(cliffIndices); cg.computeVertexNormals(); mesh(cg, mat(0xffffff,{vertexColors:true,flatShading:true,side:THREE.DoubleSide}));
  // Meandering old pilgrim paths.
  function path(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x,z]) => new THREE.Vector3(x,0,z))); const p=[], uv=[], ids=[];
    for(let i=0;i<=160;i++){const t=i/160, v=curve.getPoint(t), tan=curve.getTangent(t); for(const s of [-1,1]){const x=v.x+tan.z*width*s/2,z=v.z-tan.x*width*s/2; p.push(x,heightAt(x,z)+.045,z);uv.push(t,s);} if(i<160){const n=i*2;ids.push(n,n+2,n+1,n+1,n+2,n+3);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ids);g.computeVertexNormals();mesh(g,mat(0xb5b58a,{side:THREE.DoubleSide}));
  }
  path([[0,70],[1,44],[-4,25],[0,5],[0,-18],[1,-45],[0,-78]],3.6);
  path([[0,22],[-21,17],[-32,-2],[-57,-13]],2.7);
  path([[0,5],[19,-7],[34,-15],[51,-38]],2.7);
  const waterMat = new THREE.MeshPhongMaterial({color:0x55b8ae,transparent:true,opacity:.87,shininess:100,specular:0xc7ffe2,side:THREE.DoubleSide});
  const lake = mesh(new THREE.CircleGeometry(1,80), waterMat,37,1.65,24);lake.rotation.x=-Math.PI/2;lake.scale.set(22,16,1);lake.castShadow=false;
  // Water ripples catch the sunlight.
  for(let i=0;i<17;i++){const ripple=mesh(new THREE.RingGeometry(1,1.055,48),new THREE.MeshBasicMaterial({color:0xccf9d7,transparent:true,opacity:.18,side:THREE.DoubleSide}),37+(rng()-.5)*29,1.68,24+(rng()-.5)*18);ripple.rotation.x=-Math.PI/2;ripple.scale.setScalar(1+rng()*3);animated.push({type:'ripple',object:ripple,phase:rng()*6});}
  // Stone bridge over the lake's western inlet.
  for(let i=0;i<13;i++){const z=17+i*1.6;box(5.3,.48,1.56,lightStone,19,heightAt(19,17)+.8+Math.sin(i/12*Math.PI)*1.3,z);}
  // Instancing keeps dense foliage inexpensive.
  const trees=[];
  for(let i=0;i<310;i++){
    const x=(rng()-.5)*210,z=(rng()-.5)*210;
    if(Math.hypot(x,z)>105 || Math.abs(x)<12 || Math.hypot(x-CAMP.x,z-CAMP.z)<13 || BEACONS.some(b=>Math.hypot(x-b.x,z-b.z)<12) || ((x-37)**2/750+(z-24)**2/500<1) || Math.hypot(x,z+18)<23)continue;
    if(Math.abs(x+z*.7+22)<5&&z>-15&&z<24)continue;
    if(Math.abs(x+z*.85-10)<5&&x>0&&z<8)continue;
    trees.push({x,z,y:heightAt(x,z),s: .7+rng()*.8,gold:x<-43&&z<5});
  }
  const dummy=new THREE.Object3D();
  function instances(geo,material,entries){const m=new THREE.InstancedMesh(geo,material,entries.length);entries.forEach((e,i)=>{dummy.position.set(...e.pos);dummy.rotation.set(...(e.rot||[0,0,0]));dummy.scale.set(...e.scale);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);if(e.color)m.setColorAt(i,new THREE.Color(e.color));});m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  instances(new THREE.CylinderGeometry(.21,.46,1,7),mat(0x665b3e),trees.map(t=>({pos:[t.x,t.y+3.1*t.s,t.z],scale:[t.s,6.2*t.s,t.s]})));
  const leaves=[];
  for(const t of trees){colliders.push({x:t.x,z:t.z,r:.75*t.s});for(let k=0;k<5;k++){const a=k*2.4;leaves.push({pos:[t.x+Math.sin(a)*1.7*t.s,t.y+(6+(k%3)*1.1)*t.s,t.z+Math.cos(a)*1.6*t.s],scale:[(2.7+rng())*t.s,(2.2+rng())*t.s,(2.6+rng())*t.s],rot:[rng(),rng(),rng()],color:t.gold?[0xc2c368,0xd6c76d,0xa8b765][k%3]:[0x397968,0x4c896b,0x639571,0x749d70,0x447d65][k%5]});}}
  instances(new THREE.IcosahedronGeometry(1,1),mat(0xffffff,{flatShading:true}),leaves);
  const rocks=[];
  for(let i=0;i<185;i++){const a=rng()*Math.PI*2,r=20+rng()*90,x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(x)<9||BEACONS.some(b=>Math.hypot(x-b.x,z-b.z)<10)||Math.hypot(x-CAMP.x,z-CAMP.z)<11)continue;const s=.6+rng()*2.1;rocks.push({pos:[x,heightAt(x,z)+s*.35,z],scale:[s,s*.65,s*.85],rot:[rng(),rng()*6,rng()],color:[0x828e7d,0xa3aa8c,0x637e70][i%3]});colliders.push({x,z,r:s*.65});}
  instances(new THREE.DodecahedronGeometry(1,0),mat(0xffffff,{flatShading:true}),rocks);
  // Thousands of grass blades and wildflowers.
  const blades=[],flowers=[];
  for(let i=0;i<22000;i++){const x=(rng()-.5)*216,z=(rng()-.5)*216;if(Math.hypot(x,z)>108||Math.abs(x)<4||heightAt(x,z)<2||BEACONS.some(b=>Math.hypot(x-b.x,z-b.z)<7))continue;const h=.22+rng()*.48;blades.push({pos:[x,heightAt(x,z)+h/2,z],scale:[.30,h,.30],rot:[0,rng()*6,(rng()-.5)*.3],color:[0x6c9357,0x96ac6c,0x527d55][i%3]});if(i%8===0)flowers.push({pos:[x,heightAt(x,z)+h,z],scale:[.14,.11,.14],color:[0xf0d496,0xc1b2dc,0xe7ebbe][i%3]});}
  const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.3,-.5,0,.05,.5,.06,.3,-.5,0,0,-.5,-.3,.06,.38,.1,0,-.5,.3,-.2,-.5,-.2,-.08,.32,.1,.18,-.5,.2],3));bladeGeo.computeVertexNormals();
  const grassMesh=instances(bladeGeo,mat(0xffffff,{flatShading:true,side:THREE.DoubleSide}),blades);grassMesh.castShadow=false;
  const flowerMesh=instances(new THREE.IcosahedronGeometry(1,0),mat(0xffffff),flowers);flowerMesh.castShadow=false;
  // The broken Aether gate: monumental stone and gilded rings.
  const gate = new THREE.Group();gate.position.set(0,heightAt(0,-18),-18);scene.add(gate);
  cylinder(12.6,13,1.2,darkStone,0,.2,0,gate,64);cylinder(11.6,12.1,.45,lightStone,0,.95,0,gate,64);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,x=Math.sin(a)*10,z=Math.cos(a)*10;if(z>5&&Math.abs(x)<7)continue;const h=i===3||i===8?5.6:12;
    cylinder(1.25,1.5,.8,lightStone,x,1.5,z,gate);cylinder(.85,1,h,stone,x,2+h/2,z,gate);cylinder(1.35,1.2,.7,lightStone,x,h+2,z,gate);colliders.push({x,z:z-18,r:1.5});
    for(let k=0;k<3;k++)box(.1,.2,.7,gold,x+.87,3+k*2.5,z,gate);
    if(h>10){const block=box(6.9,1.35,2.5,lightStone,x,14,z,gate);block.rotation.y=a+Math.PI/2;}
  }
  const gateRing=mesh(new THREE.TorusGeometry(5,.27,8,80),gold,0,7.1,0,gate);gateRing.rotation.y=.05;
  const gateRing2=mesh(new THREE.TorusGeometry(4.15,.10,6,80),gold,0,7.1,0,gate);gateRing2.rotation.y=.05;animated.push({type:'ring',object:gateRing2});
  const coreMaterial=mat(0xb1ffdc,{emissive:0x51dfb1,emissiveIntensity:1.4,metalness:.2,roughness:.15});
  const gateCore=mesh(new THREE.OctahedronGeometry(1.2),coreMaterial,0,7.1,0,gate);animated.push({type:'crystal',object:gateCore,baseY:7.1,phase:0});
  const gateGlow = new THREE.PointLight(0x71ffd1,30,24);gateGlow.position.set(0,7,-18);scene.add(gateGlow);
  // Small abandoned archways, deliberately broken silhouettes.
  for(const [x,z,rot] of [[-23,11,.4],[25,-13,-.55],[1,-52,.1],[-72,32,-.5]]){const group=new THREE.Group();group.position.set(x,heightAt(x,z),z);group.rotation.y=rot;scene.add(group);for(const s of [-1,1]){box(1.1,5,1.4,stone,s*2.9,2.5,0,group);box(1.6,.6,1.8,lightStone,s*2.9,5,0,group);}const arch=mesh(new THREE.TorusGeometry(2.9,.65,4,16,Math.PI),lightStone,0,5,0,group);arch.rotation.z=0;}
  // Beacon sanctuaries.
  for(const b of BEACONS){const g=new THREE.Group(),y=heightAt(b.x,b.z);g.position.set(b.x,y,b.z);scene.add(g);
    cylinder(5.5,6,.5,darkStone,0,.1,0,g,48);cylinder(4.8,5,.3,lightStone,0,.5,0,g,48);
    for(let i=0;i<7;i++){const a=i/7*6.283;const x=Math.sin(a)*4,z=Math.cos(a)*4;cylinder(.38,.5,3+i%2,stone,x,2,z,g,6);}
    cylinder(1.6,2,1.6,stone,0,1.2,0,g);cylinder(1.9,1.6,.3,gold,0,2.1,0,g,12);
    const crystal=mesh(new THREE.OctahedronGeometry(1.25),mat(b.color,{emissive:b.color,emissiveIntensity:.45,metalness:.3,roughness:.2}),0,3.8,0,g);crystal.scale.y=1.8;animated.push({type:'crystal',object:crystal,baseY:3.8,phase:rng()*6});
    const beam=mesh(new THREE.CylinderGeometry(.18,1.2,90,20,1,true),new THREE.MeshBasicMaterial({color:b.color,transparent:true,opacity:.045,side:THREE.DoubleSide,depthWrite:false}),0,48,0,g);beam.castShadow=false;
    const ring=mesh(new THREE.TorusGeometry(2.6,.06,6,64),gold,0,3.8,0,g);ring.rotation.x=Math.PI/2;animated.push({type:'ring',object:ring});
    const light=new THREE.PointLight(b.color,0,20);light.position.set(0,5,0);g.add(light);
    beaconObjects.push({...b,group:g,crystal,beam,light});colliders.push({x:b.x,z:b.z,r:2});
  }
  // Wayfarer's camp, canvas tent and an inviting fire.
  const camp = new THREE.Group();camp.position.set(CAMP.x,heightAt(CAMP.x,CAMP.z),CAMP.z);scene.add(camp);
  const tentGeo=new THREE.ConeGeometry(3.7,5,4,1,true);const tent=mesh(tentGeo,mat(0xd9be83,{side:THREE.DoubleSide}),-5,2.5,-2,camp);tent.rotation.y=Math.PI/4;
  box(.13,5.5,.13,darkStone,-5,2.8,-2,camp);colliders.push({x:CAMP.x-5,z:CAMP.z-2,r:2.9});
  cylinder(1.6,1.8,.2,darkStone,1,.1,0,camp,10);
  for(let i=0;i<6;i++){const log=cylinder(.19,.21,2.3,mat(0x564437),1,.35,0,camp,6);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/3;}
  const fire=mesh(new THREE.IcosahedronGeometry(.65,1),mat(0xffdd87,{emissive:0xffa53b,emissiveIntensity:2}),1,.85,0,camp);fire.scale.y=1.8;animated.push({type:'fire',object:fire});
  const fireLight=new THREE.PointLight(0xffb856,15,12);fireLight.position.set(1,2,0);camp.add(fireLight);
  box(1.8,1.1,1.1,mat(0x8a704b),-3,.6,3,camp);
  const npc=createCharacter(0x385e64,0xd7c797);npc.position.set(CAMP.x+2,heightAt(CAMP.x+2,CAMP.z-3),CAMP.z-3);npc.rotation.y=.3;scene.add(npc);colliders.push({x:npc.position.x,z:npc.position.z,r:.65});
  // Gatherable aether shards; every reward has a stable save identifier.
  for(let i=0;i<45;i++){
    let x,z; if(i<6){x=4+Math.sin(i)*4;z=35-i*4;}else{const a=rng()*6.283,r=15+rng()*79;x=Math.sin(a)*r;z=Math.cos(a)*r;}
    if(heightAt(x,z)<2){x=-x;z=-z;}
    const crystal=mesh(new THREE.OctahedronGeometry(.36),mat(0xa5ffe0,{emissive:0x43c79c,emissiveIntensity:.9,metalness:.3}),x,heightAt(x,z)+1,z);crystal.scale.y=1.7;
    pickups.push({id:i,x,z,object:crystal});animated.push({type:'crystal',object:crystal,baseY:crystal.position.y,phase:rng()*6});
  }
  // Distant floating isles and cloud banks give the world its scale.
  for(let i=0;i<15;i++){const a=i/15*6.283,r=175+rng()*145,x=Math.sin(a)*r,z=Math.cos(a)*r,y=-15+rng()*65,s=12+rng()*24;
    const island=mesh(new THREE.IcosahedronGeometry(1,1),mat(i%2?0x829e95:0x88aa9b,{flatShading:true}),x,y,z);island.scale.set(s,s*.55,s*.7);
    const cap=cylinder(s*.75,s*.82,3,mat(0x809c79),x,y+s*.25,z,scene,8);
    if(i%3===0){cylinder(2.5,3,17,lightStone,x,y+s*.25+10,z);cylinder(4.2,3,.8,gold,x,y+s*.25+18,z);}
  }
  const clouds=[];for(let i=0;i<140;i++){const a=rng()*6.283,r=115+rng()*290,s=15+rng()*40;clouds.push({pos:[Math.sin(a)*r,-20+rng()*7,Math.cos(a)*r],scale:[s,4+rng()*7,s*.6],color:i%2?0xd8e3d8:0xe9ecdd});}
  const cloudMesh=instances(new THREE.IcosahedronGeometry(1,2),mat(0xffffff,{flatShading:false}),clouds);cloudMesh.castShadow=false;
  // Falling ribbons of water spill from the floating island.
  for(const [x,z] of [[99,51],[-89,68],[60,-96]]){const fall=mesh(new THREE.PlaneGeometry(4,50),new THREE.MeshBasicMaterial({color:0xa6e3da,transparent:true,opacity:.48,side:THREE.DoubleSide}),x,-18,z);fall.rotation.y=Math.atan2(x,z);}
  const dustPositions=new Float32Array(650*3);for(let i=0;i<650;i++){dustPositions[i*3]=(rng()-.5)*195;dustPositions[i*3+1]=3+rng()*22;dustPositions[i*3+2]=(rng()-.5)*195;}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xffedb7,size:.14,transparent:true,opacity:.65,depthWrite:false}));scene.add(dust);
  for(let i=0;i<7;i++){const g=new THREE.Group();for(const s of [-1,1]){const wing=mesh(new THREE.ConeGeometry(.3,2,3),mat(0x3b6261),s*.6,0,0,g);wing.rotation.z=s*1.2;}scene.add(g);wisps.push({object:g,phase:i*.9,radius:25+i*5});}
  return {colliders,beaconObjects,pickups,npc,gate,gateCore,waterMat,
    update(t,dt){
      for(const a of animated){if(a.type==='crystal'){a.object.rotation.y=t*.55+a.phase;a.object.position.y=a.baseY+Math.sin(t*1.7+a.phase)*.18;}else if(a.type==='ring'){a.object.rotation.z=t*.13;}else if(a.type==='fire'){a.object.scale.set(.9+Math.sin(t*13)*.12,1.8+Math.sin(t*9)*.3,.9);}else if(a.type==='ripple'){a.object.material.opacity=.10+Math.sin(t+a.phase)*.07;}}
      dust.rotation.y=t*.002;
      for(const w of wisps){const a=t*.045+w.phase;w.object.position.set(Math.sin(a)*w.radius,30+Math.sin(a*3)*4,Math.cos(a)*w.radius-30);w.object.rotation.y=a;w.object.rotation.z=Math.sin(t*3+w.phase)*.13;}
    }
  };
}
export function createCharacter(cloakColor = 0x275962, trimColor = 0xd9b974) {
  const g=new THREE.Group();const add=(geo,color,x,y,z)=>{const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const body=add(new THREE.CylinderGeometry(.36,.45,.85,8),cloakColor,0,1.24,0);
  add(new THREE.CylinderGeometry(.46,.53,.18,8),trimColor,0,.98,0);
  add(new THREE.SphereGeometry(.28,10,8),0xdebb8a,0,1.94,.04);
  const hood=add(new THREE.SphereGeometry(.36,10,8,0,Math.PI*2,0,Math.PI*.7),cloakColor,0,2.02,-.05);
  const cape=add(new THREE.ConeGeometry(.7,1.3,4,1,true),cloakColor,0,1.03,-.24);cape.rotation.y=Math.PI/4;cape.scale.z=.56;
  add(new THREE.BoxGeometry(.14,.14,.08),trimColor,0,1.6,.34);
  add(new THREE.CylinderGeometry(.39,.39,.15,10),trimColor,0,1.72,0);
  add(new THREE.BoxGeometry(.33,.68,.36),0x765b3b,-.12,1.28,-.40);
  add(new THREE.BoxGeometry(.05,.73,.40),trimColor,-.20,1.30,-.41);
  for(const side of [-1,1]){const shoulder=add(new THREE.SphereGeometry(.26,8,5),trimColor,side*.42,1.56,0);shoulder.scale.set(1,.5,1.1);}
  const scarf=add(new THREE.BoxGeometry(.15,.75,.035),trimColor,.27,1.23,-.58);scarf.rotation.z=-.15;
  const legs=[];for(const s of [-1,1]){const leg=add(new THREE.CylinderGeometry(.13,.14,.73,6),0x344748,s*.2,.46,0);legs.push(leg);add(new THREE.BoxGeometry(.27,.26,.42),0x4c443b,s*.2,.15,.08);}
  const arms=[];for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.43,1.53,0);g.add(arm);const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.15,.12,.62,6),mat(cloakColor));sleeve.position.y=-.27;sleeve.castShadow=true;arm.add(sleeve);const hand=new THREE.Mesh(new THREE.SphereGeometry(.12,6,6),mat(0xdebb8a));hand.position.y=-.63;arm.add(hand);arms.push(arm);}
  const sword=new THREE.Group();sword.position.set(0,-.6,.12);arms[1].add(sword);
  const blade=new THREE.Mesh(new THREE.BoxGeometry(.12,.05,1.3),mat(0xd6eddf,{metalness:.75,roughness:.2}));blade.position.z=.75;sword.add(blade);
  const guard=new THREE.Mesh(new THREE.BoxGeometry(.5,.12,.12),mat(trimColor,{metalness:.6}));guard.position.z=.14;sword.add(guard);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.085,.25,4),mat(0xf5ffff,{metalness:.7}));tip.rotation.x=Math.PI/2;tip.position.z=1.52;sword.add(tip);
  g.userData={legs,arms,cape,hood,sword};return g;
}
export function createEnemy(scene,x,z,tier=1) {
  const g=new THREE.Group();const stone=mat(tier===3?0x524955:0x546461,{flatShading:true}),dark=mat(0x343d41),glow=mat(0xffa283,{emissive:0xff543b,emissiveIntensity:1.4});
  const add=(geo,m,px,py,pz)=>{const o=new THREE.Mesh(geo,m);o.position.set(px,py,pz);o.castShadow=true;g.add(o);return o;};
  add(new THREE.DodecahedronGeometry(.7,0),stone,0,1.4,0).scale.set(1,1.1,.65);
  add(new THREE.DodecahedronGeometry(.4,0),stone,0,2.35,0);
  add(new THREE.BoxGeometry(.48,.13,.15),glow,0,2.36,.32);
  add(new THREE.OctahedronGeometry(.24),glow,0,1.55,.48);
  const arms=[];for(const s of [-1,1]){add(new THREE.DodecahedronGeometry(.37),stone,s*.82,1.8,0);const a=add(new THREE.BoxGeometry(.36,.85,.4),dark,s*.89,1.13,0);arms.push(a);add(new THREE.DodecahedronGeometry(.31),stone,s*.9,.72,.05);add(new THREE.BoxGeometry(.4,.65,.45),dark,s*.32,.44,0);}
  const s=tier===3?2.1:tier===2?1.25:1;g.scale.setScalar(s);g.position.set(x,heightAt(x,z),z);scene.add(g);
  const telegraph=new THREE.Mesh(new THREE.RingGeometry(.1,3.3*s,48),new THREE.MeshBasicMaterial({color:0xff6b44,transparent:true,opacity:.3,side:THREE.DoubleSide,depthWrite:false}));telegraph.rotation.x=-Math.PI/2;telegraph.visible=false;scene.add(telegraph);
  return {object:g,telegraph,arms,x,z,homeX:x,homeZ:z,tier,hp: tier===3?380:tier===2?95:60,maxHp:tier===3?380:tier===2?95:60,cooldown:1,windup:0,hit:false,dead:false,scale:s,attackRadius:3.3*s};
}

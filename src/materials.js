import * as THREE from '../vendor/three.module.js';
// Small, deterministic surface textures, generated locally without external assets.
const textures=new Map();
export function surfaceTexture(kind='stone'){
 if(textures.has(kind))return textures.get(kind);
 const size=128,data=new Uint8Array(size*size*4);let seed=731;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)|0;const n=(seed>>>0)/4294967296;
  let v=kind==='cloth'?125+(x%4<2?17:-17)+(y%4<2?12:-12)+n*14:kind==='wood'?128+Math.sin(x*.42+Math.sin(y*.08)*2)*35+n*35:125+n*65+Math.sin(x*.2)*Math.sin(y*.27)*20;
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.repeat.set(kind==='cloth'?3:2,kind==='cloth'?3:2);t.needsUpdate=true;textures.set(kind,t);return t;
}
export function ruggedMaterial(color,kind='stone',opts={}){
 return new THREE.MeshStandardMaterial({color,roughness:kind==='cloth'?.96:.83,map:surfaceTexture(kind),bumpMap:surfaceTexture(kind),bumpScale:kind==='cloth'?.022:.08,...opts});
}

export function contactShadow(radius=.65){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const r=Math.hypot((x-size/2)/(size/2),(y-size/2)/(size/2));data[(y*size+x)*4+3]=Math.round(Math.pow(Math.max(0,1-r),1.7)*150);}
 const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.025;return mesh;
}

const scanned=new Map();
export function forestMaterial(variant='forest'){
 if(typeof document==='undefined')return ruggedMaterial(0x8a8170);
 const loader=new THREE.TextureLoader();
 function load(name,color=false){if(scanned.has(name))return scanned.get(name);const t=loader.load(new URL(`../assets/${name}.jpg`,import.meta.url).href);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;scanned.set(name,t);return t;}
 return new THREE.MeshStandardMaterial({color:0xffffff,map:load(`${variant}-ground`,true),normalMap:load(`${variant}-normal`),normalScale:new THREE.Vector2(.6,.6),roughness:.94,vertexColors:true});
}

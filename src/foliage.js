import * as THREE from '../vendor/three.module.js';
// Branch cards give trees a fine, irregular silhouette without thousands of draws.
export function createFoliageMaterial(pine=false){
 if(typeof document==='undefined')return new THREE.MeshStandardMaterial({color:0x697154,side:THREE.DoubleSide});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');let seed=pine?29:41;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;};
 c.strokeStyle='#584c39';c.lineWidth=3;c.beginPath();c.moveTo(125,252);c.quadraticCurveTo(105,120,145,12);c.stroke();
 for(let i=0;i<100;i++){const y=20+rand()*215,spread=Math.sin(y/256*Math.PI)*100,x=128+(rand()-.5)*spread*2;c.strokeStyle='#65583d';c.lineWidth=1.1;c.beginPath();c.moveTo(128,y+20);c.lineTo(x,y);c.stroke();c.fillStyle=['#a4a081','#818c68','#c0b893','#65734e'][i%4];c.save();c.translate(x,y);c.rotate(rand()*6.28);c.beginPath();c.ellipse(0,0,pine?3:6+rand()*7,pine?15:4+rand()*4,0,0,6.283);c.fill();c.restore();}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
 return new THREE.MeshStandardMaterial({color:0xffffff,map:t,alphaTest:.45,side:THREE.DoubleSide,roughness:.95});
}
export function branchGeometry(){
 const positions=[],uvs=[];for(let i=0;i<3;i++){const angle=i*Math.PI/3;for(const [x,y,u,v] of [[-1,-1,0,0],[1,-1,1,0],[-1,1,0,1],[-1,1,0,1],[1,-1,1,0],[1,1,1,1]]){positions.push(x*Math.cos(angle),y,x*Math.sin(angle));uvs.push(u,v);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
}

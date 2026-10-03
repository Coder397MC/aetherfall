export function heightAt(x, z) {
  const h = 3.2 + Math.sin(x * .047) * 2.3 + Math.cos(z * .045) * 2.5 + Math.sin(x * .11 + z * .06) * .8;
  const hill = 10 * Math.exp(-((x + 65) ** 2 + (z + 24) ** 2) / 900) + 11 * Math.exp(-(x * x + (z + 85) ** 2) / 1000);
  const lake = 8 * Math.exp(-((x - 37) ** 2 / 310 + (z - 24) ** 2 / 220));
  return h + hill - lake;
}
export const TERRAIN_RINGS=62, TERRAIN_SECTORS=192, TERRAIN_RADIUS=113;
// Interpolate the actual triangle under the feet, rather than the smooth function
// from which the rendered terrain's vertices were sampled.
export function terrainSurfaceAt(x,z){
 const radius=Math.hypot(x,z),step=TERRAIN_RADIUS/TERRAIN_RINGS,sector=2*Math.PI/TERRAIN_SECTORS;
 if(radius<1e-7||radius>TERRAIN_RADIUS)return heightAt(x,z);
 const angle=(Math.atan2(x,z)+Math.PI*2)%(Math.PI*2),i=Math.floor(angle/sector),ring=Math.floor(radius/step);
 const vertex=(r,a)=>{const px=Math.sin(a*sector)*r*step,pz=Math.cos(a*sector)*r*step;return {x:px,z:pz,y:heightAt(px,pz)};};
 const sample=(a,b,c)=>{
  const d=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(d)<1e-12)return null;
  const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/d;
  const v=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/d,w=1-u-v;
  return Math.min(u,v,w)>=-1e-7?u*a.y+v*b.y+w*c.y:null;
 };
 for(let j=Math.max(0,ring-1);j<=Math.min(TERRAIN_RINGS-1,ring+1);j++){
  const a=vertex(j,i),b=vertex(j+1,i),c=vertex(j,i+1),d=vertex(j+1,i+1);
  const first=sample(a,b,c);if(first!==null)return first;
  const second=sample(c,b,d);if(second!==null)return second;
 }
 return heightAt(x,z);
}
export function walkSurfaceAt(x,z,chapter=1){
 if(chapter===2)return 3;
 let y=terrainSurfaceAt(x,z);
 const gateDistance=Math.hypot(x,z+18),gateBase=heightAt(0,-18);
 if(gateDistance<12.6)y=Math.max(y,gateBase+.8);
 if(gateDistance<11.6)y=Math.max(y,gateBase+1.175);
 for(const b of [{x:-57,z:-13},{x:51,z:-38},{x:0,z:-78}]){
  const d=Math.hypot(x-b.x,z-b.z),base=heightAt(b.x,b.z);
  if(d<5.5)y=Math.max(y,base+.35);
  if(d<4.8)y=Math.max(y,base+.65);
 }
 if(Math.abs(x-19)<=2.65){
  for(let i=0;i<13;i++)if(Math.abs(z-(17+i*1.6))<=.78)y=Math.max(y,heightAt(19,17)+1.04+Math.sin(i/12*Math.PI)*1.3);
 }
 // Water support exists only inside the visible lake, never on low dry ground.
 if((x-37)**2/(22*22)+(z-24)**2/(16*16)<=1)y=Math.max(y,1.65);
 return y;
}

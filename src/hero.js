import * as THREE from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from '../vendor/addons/loaders/DRACOLoader.js';
// Keep the procedural character as a loading/error fallback; gameplay never waits
// on an asset fetch. The new model is CC0; provenance is in ASSETS.md.
export async function loadHero(player){
 const decoder=new DRACOLoader();decoder.setDecoderPath(new URL('../vendor/addons/libs/draco/',import.meta.url).href);decoder.setDecoderConfig({type:'wasm'});decoder.setWorkerLimit(1);
 const loader=new GLTFLoader();loader.setDRACOLoader(decoder);
 try{
  const gltf=await loader.loadAsync(new URL('../assets/wayfarer.glb',import.meta.url).href);
  const model=gltf.scene;model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
  const scale=2.22/size.y;model.scale.setScalar(scale);model.position.y=-bounds.min.y*scale;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.envMapIntensity=.45;m.roughness=Math.max(.65,m.roughness??.8);if(m.emissiveIntensity)m.emissiveIntensity=.12;m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
 float blueCloth=smoothstep(.01,.05,diffuseColor.b-max(diffuseColor.r,diffuseColor.g));
 float luminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.68,.50,.32)*max(luminance,.08),blueCloth);
 diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.72);`);};}}});
  const fallback=[...player.children];for(const child of fallback)child.visible=false;player.add(model);
  const mixer=new THREE.AnimationMixer(model),clips=Object.fromEntries(gltf.animations.map(clip=>[clip.name,mixer.clipAction(clip)]));
  let current=null,attackWasActive=false,bowTime=0;
  const right=model.getObjectByName('mixamorigRightHand')||model.getObjectByName('mixamorig:RightHand');
  const left=model.getObjectByName('mixamorigLeftHand')||model.getObjectByName('mixamorig:LeftHand');
  let sword=null,bow=null;
  if(right){sword=player.userData.sword.clone();sword.visible=true;sword.position.set(0,0,0);sword.scale.setScalar(1/scale);right.add(sword);}
  if(left&&player.userData.bowModel){bow=player.userData.bowModel.clone();bow.position.set(0,0,0);bow.scale.setScalar(1/scale);bow.visible=false;left.add(bow);}

  const transition=name=>{const next=clips[name]||clips.idle;if(!next||current===next)return;if(current)current.fadeOut(.18);next.reset().fadeIn(.18).play();current=next;};
  transition('idle');
  // Attach gameplay equipment to the loaded rig; retain it during animation.
  player.userData.hero={model,mixer,shoot(){bowTime=.8;},update(dt,{moving=false,sprinting=false,attacking=false,dodging=false}={}){
    if(attacking&&!attackWasActive&&clips.punch_jab){clips.punch_jab.setLoop(THREE.LoopOnce,1);clips.punch_jab.clampWhenFinished=true;transition('punch_jab');}
    else if(!attacking)transition(moving?(sprinting||dodging?'sprint_loop':'walk_loop'):'idle');
    bowTime=Math.max(0,bowTime-dt);if(bow)bow.visible=bowTime>0;if(sword)sword.visible=bowTime<=0;attackWasActive=attacking;mixer.update(dt);
  }};
 }catch(error){console.warn('Detailed character unavailable; using built-in character.',error);}
 finally{decoder.dispose();}
}

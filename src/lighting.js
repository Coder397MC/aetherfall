import * as THREE from '../vendor/three.module.js';
export function addEnvironmentLight(renderer,scene){
 const env=new THREE.Scene();env.background=new THREE.Color(0xb1b7bf);
 const dome=new THREE.Mesh(new THREE.SphereGeometry(100,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){float t=normalize(p).y;vec3 ground=vec3(.16,.145,.12);vec3 sky=vec3(.65,.72,.8);vec3 horizon=vec3(.85,.78,.65);gl_FragColor=vec4(t>0.?mix(horizon,sky,sqrt(t)):mix(horizon,ground,sqrt(-t)),1.);}' }));env.add(dome);
 const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.04,.1,200);scene.environment=target.texture;scene.environmentIntensity=.35;pmrem.dispose();dome.geometry.dispose();dome.material.dispose();return target;
}

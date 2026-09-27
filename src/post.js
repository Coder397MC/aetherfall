import * as THREE from '../vendor/three.module.js';
// A compact HDR compositor: soft highlights, subtle film grain, and edge falloff.
export function createPost(renderer){
  const size=new THREE.Vector2();renderer.getDrawingBufferSize(size);
  const target=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:target.texture},resolution:{value:size},clock:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D image;uniform vec2 resolution;uniform float clock;varying vec2 vUv;
    vec3 bright(vec2 uv){vec3 c=texture2D(image,uv).rgb;return max(c-vec3(1.4),vec3(0.));}
    void main(){vec3 color=texture2D(image,vUv).rgb;vec2 p=1.0/resolution;vec3 glow=vec3(0.);
      for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 d=vec2(cos(a),sin(a));glow+=bright(vUv+d*p*4.)*.045;glow+=bright(vUv+d*p*12.)*.024;glow+=bright(vUv+d*p*25.)*.012;}
      color+=glow;float edge=dot(vUv-.5,vUv-.5);color*=1.-edge*.24;
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      float grain=fract(sin(dot(vUv*resolution+clock,vec2(12.9898,78.233)))*43758.5453)-.5;
      gl_FragColor.rgb+=grain*.006;
    }`});
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  return {render(world,camera3d,time,enabled=true){if(!enabled){renderer.setRenderTarget(null);renderer.render(world,camera3d);return;}renderer.getDrawingBufferSize(size);if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);material.uniforms.clock.value=time;renderer.setRenderTarget(target);renderer.render(world,camera3d);renderer.setRenderTarget(null);renderer.render(scene,camera);}};
}

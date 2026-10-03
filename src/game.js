import {loadHero} from './hero.js';
import {addEnvironmentLight} from './lighting.js';
import {walkSurfaceAt} from './terrain.js';
import {createFrostWorld,frostHeight} from './frost-world.js';
import {travel,purchase,SHOP,useArrow,bowDamage} from './chapter.js';
import {quoteQuestion,consultGuide} from './oracle.js';
import * as THREE from '../vendor/three.module.js';
import {createPost} from './post.js';
import {createWorld,createCharacter,createEnemy,heightAt as firstHeight,BEACONS,CAMP,GATE} from './world.js';
import {WORLD_BOUNDARY,SAVE_KEY,freshState,validateSave,levelOf,maxHealth,swordDamage,upgradeCost,collectShard,reward,restoreBeacon,buyUpgrade,usePotion,respawn} from './state.js';
const $=id=>document.getElementById(id), show=(id,yes=true)=>$(id).classList.toggle('hidden',!yes);
let saved=null, storageAvailable=true;
try{const raw=localStorage.getItem(SAVE_KEY);try{saved=validateSave(JSON.parse(raw));}catch{saved=null;}}catch{storageAvailable=false;}
let state=saved||freshState();
const second=state.chapter===2;
const heightAt=(x,z)=>second?frostHeight(x,z):firstHeight(x,z);

function init(){
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0xc4bbae,.004);
  const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  const post=createPost(renderer);addEnvironmentLight(renderer,scene);
  const camera=new THREE.PerspectiveCamera(51,innerWidth/innerHeight,.1,1100);
  scene.add(new THREE.HemisphereLight(0xc1ced9,0x4a4238,1.15));
  const sun=new THREE.DirectionalLight(0xffe4c2,2.7);sun.position.set(-35,75,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:200});sun.shadow.bias=-.00035;sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);
  const world=second?createFrostWorld(scene):createWorld(scene),player=createCharacter();scene.add(player);
  const keys=new Set(), enemies=[],particles=[],floaters=[];let playing=false,modalOpen=false,modalKind='',last=performance.now(),time=0,saveTime=0,mapTime=0,yaw=0,pitch=.26,zoom=10.5,stamina=100,attackTimer=0,attackCooldown=0,dodgeTimer=0,dodgeCooldown=0,invincible=0,vertical=0,jumpY=0,movePhase=0,shake=0,nearby=null,toastTimeout,discoveryTimeout,activeRegion='',lastFocus=null,bossSpawned=false,drag=null,quality='high',waypoint=null;
  const moveVector=new THREE.Vector3(),cameraTarget=new THREE.Vector3(),cameraPosition=new THREE.Vector3(),dodgeVector=new THREE.Vector3(0,0,-1);
  const trail=new THREE.Mesh(new THREE.RingGeometry(1.3,2.8,32,1,0,Math.PI*1.35),new THREE.MeshBasicMaterial({color:0xffe5ac,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));trail.rotation.x=-Math.PI/2;scene.add(trail);
  const audio=new Soundscape();
  function spawnEnemy(id,x,z,tier,beacon=null){const e=createEnemy(scene,x,z,tier);e.id=id;e.beacon=beacon;if(state.defeated.includes(id)){e.dead=true;e.object.visible=false;}enemies.push(e);return e;}
  if(!second)BEACONS.forEach((b,i)=>{spawnEnemy(`${b.id}-keeper`,b.x+4,b.z+7,2,b.id);spawnEnemy(`${b.id}-sentinel`,b.x-5,b.z+8,1,b.id);spawnEnemy(`${b.id}-watcher`,b.x+6,b.z-5,1,b.id);});
  if(!second)[[-22,15],[-34,-1],[23,-6],[38,-20],[-7,-48],[8,-61],[-78,47],[75,7]].forEach(([x,z],i)=>spawnEnemy(`roamer-${i}`,x,z,1));
  if(second){
    for(const [id,x,z,kind] of [['ice-1',-20,6,'prowler'],['ice-2',18,-4,'prowler'],['ice-3',-30,-28,'caster'],['ice-4',30,-32,'caster'],['ice-5',-15,-52,'prowler'],['ice-6',18,-70,'caster'],['storm-regent',0,-55,'boss']]){
      const e=spawnEnemy(id,x,z,kind==='boss'?3:kind==='caster'?2:1);e.kind=kind;e.name=kind==='boss'?'THE STORM REGENT':kind==='caster'?'FROSTCASTER':'GLASS PROWLER';e.hp=e.maxHp=kind==='boss'?650:kind==='caster'?110:85;
      e.object.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.set(kind==='boss'?0x8972bf:kind==='caster'?0x79dbe9:0x507aad);if(o.material.emissive)o.material.emissive.set(0x163955);}});
      const crown=new THREE.Mesh(new THREE.ConeGeometry(kind==='boss'?1.2:.55,kind==='boss'?2:1,5),new THREE.MeshStandardMaterial({color:0xb4f5ff,emissive:0x3a9cab,emissiveIntensity:.8}));crown.position.y=3;e.object.add(crown);
      if(kind==='prowler')e.object.scale.set(1.2,.72,1.5);
    }
  }
  const shots=[];
  const bow=new THREE.Group();const bowArc=new THREE.Mesh(new THREE.TorusGeometry(.55,.055,6,20,Math.PI),new THREE.MeshStandardMaterial({color:0xe2c17e}));bow.add(bowArc);const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.55,0,0),new THREE.Vector3(-.55,0,0)]),new THREE.LineBasicMaterial({color:0xd6fcff}));bow.add(string);bow.rotation.z=Math.PI/2;bow.position.set(-.58,1.3,.25);player.add(bow);bow.visible=state.bow;
  player.userData.bowModel=bow;loadHero(player);loadHero(world.npc);
  let bowCooldown=0;
  function surfaceAt(x,z){return walkSurfaceAt(x,z,state.chapter);}
  function resetPosition(){player.position.set(state.x,surfaceAt(state.x,state.z),state.z);player.rotation.y=Math.PI;camera.position.set(state.x,state.hp?player.position.y+8:12,state.z+13);jumpY=0;vertical=0;}
  function applyWorldState(){world.pickups.forEach(p=>p.object.visible=!state.collected.includes(p.id));for(const b of world.beaconObjects){const lit=state.beacons.includes(b.id);b.crystal.material.emissiveIntensity=lit?2.1:.45;b.beam.material.opacity=lit?.2:.045;b.light.intensity=lit?35:0;}if(!second&&state.beacons.length===3&&!bossSpawned){bossSpawned=true;spawnEnemy('warden',0,-21,3);}world.gateCore.material.emissiveIntensity=state.beacons.length===3?3:1.4;}
  const guideKey='aetherfall-guide-visible';
  let guideVisible=true;
  try{guideVisible=localStorage.getItem(guideKey)!=='false';}catch{}
  function renderGuide(){
    show('guide-content',guideVisible);
    $('guide-toggle').setAttribute('aria-expanded',String(guideVisible));
    $('guide-toggle').innerHTML=`✧ Guide: ${guideVisible?'on':'off'} <kbd>H</kbd>`;
  }
  function toggleGuide(){guideVisible=!guideVisible;renderGuide();try{localStorage.setItem(guideKey,String(guideVisible));}catch{}}
  $('guide-toggle').onclick=toggleGuide;
  renderGuide();
  resetPosition();applyWorldState();updateHUD();
  if(second){document.querySelector('.title-bottom').firstElementChild.textContent='AETHERFALL / CHAPTER II';document.querySelector('.map-caption').firstChild.textContent='FROSTGLASS REACH ';}
  $('start').disabled=false;$('start').querySelector('span').textContent=saved?'Continue your journey':'Begin your journey';show('new-game',!!saved);
  $('start').onclick=()=>start();$('new-game').onclick=()=>{openModal('new',`<div class="modal-eyebrow">A FRESH BEGINNING</div><h2 id="modal-title">Begin again?</h2><p>This replaces the journey saved in this browser. Your current beacon, upgrade, and exploration progress will be lost.</p><button class="primary" id="confirm-new">Begin a new journey <b>↗</b></button><button class="secondary" id="cancel-new">Keep my journey</button>`);$('confirm-new').onclick=()=>{try{localStorage.removeItem(SAVE_KEY);}catch{}location.reload();};$('cancel-new').onclick=closeModal;};
  function start(){playing=true;show('title-screen',false);show('hud');resetPosition();audio.start();if(second)toast('Frostglass Reach · R fires your bow. Visit the camp trader for arrows.');else if(!state.metKeeper)toast('Welcome, Wayfarer. The keeper waits beside the campfire.');else toast('Your journey continues.');save();}
  function save(){if(!playing)return;state.x=player.position.x;state.z=player.position.z;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{if(storageAvailable){storageAvailable=false;toast('Saving is unavailable. This journey will last for this session.');}}}
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('show'),4200);}
  function discover(name,id){activeRegion=name;$('region').textContent=name.toUpperCase();if(state.discovered.includes(id))return;state.discovered.push(id);const banner=$('location-banner');banner.querySelector('h2').textContent=name;show('location-banner',false);void banner.offsetWidth;show('location-banner');clearTimeout(discoveryTimeout);discoveryTimeout=setTimeout(()=>show('location-banner',false),4500);audio.chime();}
  function updateHUD(){const max=maxHealth(state),level=levelOf(state);$('health-fill').style.width=`${state.hp/max*100}%`;$('stamina-fill').style.width=`${stamina}%`;$('health-text').textContent=`${Math.ceil(state.hp)} / ${max}`;$('shards').textContent=`◇ ${state.shards}`;$('level-badge').textContent=level;$('level-text').textContent=`LV. ${level}`;$('potion-count').textContent=state.potions;$('quest-count').innerHTML=`<span>◇</span> ${state.beacons.length} / 3 BEACONS AWAKENED`;
    $('quest-title').textContent=state.won?'The sky remembers':state.beacons.length===3?'The last guardian':state.metKeeper?'Embers of a lost world':'A light in the silence';
    $('quest-description').textContent=state.won?'The island is awake. Its untold stories are yours to find.':state.defeated.includes('warden')?'Return to Elowen beside the campfire. Get close and use E to finish your journey.':state.beacons.length===3?'Find the Hollow Warden at the ancient gate. Strike up close and dodge out of its red attack circle.':state.metKeeper?'Open the map and choose an unlit beacon. Defeat its three guardians, then get close and use E to rekindle it.':'Find Elowen beside the campfire. Get close and use E to speak with her.';
    show('bow-button',state.bow);$('arrow-count').textContent=state.arrows;bow.visible=state.bow&&!player.userData.hero;player.userData.sword.scale.setScalar(state.starSword?1.3:1);
    if(state.beacons.length===3&&!second){$('quest-title').textContent='Beyond the Aether Gate';$('quest-description').textContent='The next world is unlocked. Enter the great ring near the starting area and use E. The Hollow Warden is an optional challenge.';}
    if(second){$('quest-title').textContent=state.chapterTwoWon?'The storm is still':'The Frostglass Reach';$('quest-description').textContent=state.chapterTwoWon?'The Storm Regent has fallen. Explore or use the southern portal to return.':'Visit the trader at camp. Press R or Bow to shoot the nearest enemy. Face the Storm Regent in the northern arena.';$('quest-count').textContent=`◇ CHAPTER II · ${state.arrows} ARROWS`;}

  }
  function openModal(kind,html){modalOpen=true;modalKind=kind;keys.clear();touchMove.x=0;touchMove.y=0;lastFocus=document.activeElement;$('modal-content').innerHTML=html;show('modal-backdrop');$('modal').focus();show('close-modal',kind!=='death');}
  function closeModal(){if(modalKind==='death')return;modalOpen=false;modalKind='';show('modal-backdrop',false);keys.clear();lastFocus?.focus?.();last=performance.now();}
  $('close-modal').onclick=closeModal;$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};
  function keeper(){if(second){shop();return;}state.metKeeper=true;updateHUD();save();if(state.defeated.includes('warden')&&!state.won){state.won=true;save();applyWorldState();victory();return;}
    const text=state.won?'The wind has a voice again. You gave this place a tomorrow, Wayfarer. Stay awhile. There are still quiet corners the sky has kept for you.':state.beacons.length===3?'Three lights, one last shadow. The Hollow Warden waits at the great ring. Watch for the red circle beneath its feet, then dodge before the blow lands.':state.beacons.length?'I felt it. The island is breathing again. Rest here, and let me strengthen your blade for the road ahead.':'Once, three beacons held these islands together. Their guardians have forgotten us. Free them, then touch each beacon to return its light. You can follow any path. The sky will wait.';
    openModal('keeper',`<div class="dialog-speaker"><div class="dialog-avatar">✧</div><div><small>KEEPER OF THE FIRST LIGHT</small><h2 id="modal-title">Elowen</h2></div></div><p>“${text}”</p><div class="modal-eyebrow" style="margin-top:25px">YOUR AETHER SHARDS &nbsp; ◇ ${state.shards}</div><button class="secondary" id="upgrade-sword" ${state.sword>=3||state.shards<upgradeCost(state.sword)?'disabled':''}>Temper blade · ${state.sword}/3 <span>${state.sword>=3?'MASTERED':`◇ ${upgradeCost(state.sword)} · +10 damage`}</span></button><button class="secondary" id="upgrade-vitality" ${state.vitality>=3||state.shards<upgradeCost(state.vitality)?'disabled':''}>Strengthen spirit · ${state.vitality}/3 <span>${state.vitality>=3?'MASTERED':`◇ ${upgradeCost(state.vitality)} · +25 health`}</span></button><button class="primary" id="rest-camp">Rest & refill flasks <b>✧</b></button><button class="secondary" id="leave-camp">The road is calling <span>↗</span></button>`);
    for(const type of ['sword','vitality'])$(`upgrade-${type}`).onclick=()=>{if(buyUpgrade(state,type)){audio.chime();save();updateHUD();keeper();}};
    $('rest-camp').onclick=()=>{state.hp=maxHealth(state);state.potions=3;closeModal();updateHUD();save();audio.chime();toast('A moment of peace. Health and flasks restored.');};$('leave-camp').onclick=closeModal;
  }
  function victory(){audio.chime();updateHUD();openModal('victory',`<div class="modal-eyebrow">CHAPTER I · COMPLETE</div><h2 id="modal-title">The sky remembers.</h2><p>The last shadow falls silent. Across the horizon, three lights answer one another — and for the first time in an age, the islands begin to sing.</p><div class="stats-grid"><div><strong>3 / 3</strong><small>BEACONS AWAKENED</small></div><div><strong>${state.totalShards}</strong><small>SHARDS FOUND</small></div><div><strong>${Math.max(1,Math.round(state.playTime/60))}m</strong><small>YOUR JOURNEY</small></div></div><p>Thank you for finding the light, Wayfarer.</p><button id="keep-exploring" class="primary">Keep exploring <b>↗</b></button>`);$('keep-exploring').onclick=closeModal;}
  function journal(){if(second){openModal('journal',`<div class="modal-eyebrow">CHAPTER II</div><h2 id="modal-title">Frostglass Reach</h2><p>${state.chapterTwoWon?'The Storm Regent is defeated. Explore or return through the southern arch.':'Visit the trader at the southern camp. Use your bow against frostcasters, dodge the prowlers, then face the Storm Regent in the northern arena.'}</p><p>Bow: R or the Bow button · ${state.arrows} arrows. Shots aim at the nearest enemy within 32 metres. The boss unleashes faster volleys below half health.</p>`);return;}openModal('journal',`<div class="modal-eyebrow">THE WAYFARER'S JOURNAL</div><h2 id="modal-title">Embers of a lost world</h2><p>Rekindle the beacons. Bring the sky back to life.</p>${BEACONS.map(b=>`<div class="journal-row"><b>${state.beacons.includes(b.id)?'✧':'◇'}</b><div><h3>${b.name}</h3><p>${state.beacons.includes(b.id)?'Awakened. Its light has returned.':`${enemies.filter(e=>e.beacon===b.id&&!e.dead).length} guardians remain · defeat them, then press E at the beacon.`}</p></div></div>`).join('')}<div class="stats-grid"><div><strong>${levelOf(state)}</strong><small>WAYFARER LEVEL</small></div><div><strong>${swordDamage(state)}</strong><small>SWORD DAMAGE</small></div><div><strong>${state.collected.length}/45</strong><small>WILD SHARDS</small></div></div><p class="save-note">Next level: ${120-state.xp%120} experience · Guardians and beacons grant experience. Leveling up restores health.</p><button class="secondary" id="journal-map">Open the island map <span>M</span></button>`);$('journal-map').onclick=openMap;}
  function pause(){if(!playing)return;openModal('pause',`<div class="modal-eyebrow">A MOMENT BETWEEN ADVENTURES</div><h2 id="modal-title">Take a breath.</h2><p>Your journey is safe here.</p><div class="controls-grid"><span><kbd>W A S D</kbd> Move</span><span><kbd>DRAG</kbd> Look around</span><span><kbd>J / CLICK</kbd> Sword strike</span><span><kbd>SPACE</kbd> Dodge</span><span><kbd>SHIFT</kbd> Sprint</span><span><kbd>F</kbd> Jump</span><span><kbd>E</kbd> Interact</span><span><kbd>Q</kbd> Healing flask</span><span><kbd>M</kbd> Map</span><span><kbd>TAB</kbd> Journal</span><span><kbd>H</kbd> Toggle guide</span><span><kbd>R</kbd> Fire bow</span></div><label class="setting-row">Visual quality<select id="quality-select"><option value="high" ${quality==='high'?'selected':''}>High</option><option value="low" ${quality==='low'?'selected':''}>Performance</option></select></label><button class="primary" id="resume">Return to the world <b>↗</b></button><button class="secondary" id="return-camp">Return to camp <span>Keep all progress</span></button><button class="secondary" id="title-return">Save & return to title <span>↗</span></button><p class="save-note">${storageAvailable?'Progress saves automatically on this browser.':'Browser storage is unavailable. Progress will not survive reloading.'}</p>`);
    $('quality-select').onchange=e=>{quality=e.target.value;renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=quality==='high';};$('resume').onclick=closeModal;$('return-camp').onclick=()=>{state.x=0;state.z=44;state.hp=maxHealth(state);state.potions=3;resetPosition();enemies.forEach(resetEnemy);closeModal();save();updateHUD();toast('The keeper welcomes you home.');};$('title-return').onclick=()=>{save();closeModal();playing=false;show('hud',false);show('title-screen');$('start').querySelector('span').textContent='Continue your journey';show('new-game');};
  }
  function openMap(){openModal('map',`<div class="modal-eyebrow">AN ATLAS OF FORGOTTEN PLACES</div><h2 id="modal-title">${second?'Frostglass Reach':'The Shattered Isles'}</h2><canvas id="large-map" width="700" height="700" aria-label="Island map showing your position, camp, and beacons"></canvas><div class="map-legend"><span>▲ You</span><span>⌂ Camp</span><span>◇ Beacon</span><span>✧ Gate</span></div><p class="save-note">Select a point to mark your destination. The marker appears on your compass and minimap.</p>`);drawMap($('large-map'),true);$('large-map').onclick=e=>{const r=e.target.getBoundingClientRect();waypoint={x:((e.clientX-r.left)/r.width-.5)*244,z:((e.clientY-r.top)/r.height-.5)*244};if(Math.hypot(waypoint.x,waypoint.z)>109)waypoint=null;drawMap($('large-map'),true);};}
  function openOracle(){
    openModal('oracle',`<div class="modal-eyebrow">THE SKY GUIDE</div><h2 id="modal-title">A little light for the road.</h2><p class="oracle-intro">Ask about the island and your journey. This built-in guide uses game knowledge, not a connected AI service. The world pauses while you ask.</p><div class="oracle-balance" id="oracle-balance"></div><div class="oracle-answer" id="oracle-answer" role="status" aria-live="polite" tabindex="-1"></div><form class="oracle-form" id="oracle-form"><label for="oracle-question">What would you like to know?</label><textarea id="oracle-question" maxlength="400" placeholder="How do I awaken a beacon?" required></textarea><div class="oracle-suggestions"><button type="button" data-question="What should I do next?">My next step</button><button type="button" data-question="What are beacons?">Beacons</button><button type="button" data-question="How do I earn shards?">Find materials</button></div><label for="oracle-depth">How much should the guide reveal?</label><select id="oracle-depth"><option value="hint">Hint · 1 shard base · a small nudge</option><option value="explanation">Explanation · 3 shards base · how it works</option><option value="walkthrough">Walkthrough · 5 shards base · full details & spoilers</option></select><div class="oracle-quote" id="oracle-quote" aria-live="polite"></div><button class="primary" id="oracle-submit" type="submit" disabled>Ask the guide</button><p class="save-note">+1 shard per additional 80 characters. Unsupported questions are free. Shards are only spent when an answer is given.</p></form>`);
    const question=$('oracle-question'),depth=$('oracle-depth'),submit=$('oracle-submit');
    function refreshQuote(){
      const cost=quoteQuestion(question.value,depth.value);
      $('oracle-balance').textContent=`Your materials: ◇ ${state.shards} Aether shards`;
      $('oracle-quote').textContent=cost===null?'Type a question to see the price.':`${question.value.trim().length}/400 characters · Cost: ◇ ${cost}${state.shards<cost?' · Not enough shards':''}`;
      submit.textContent=cost===null?'Ask the guide':`Ask for ${cost} shard${cost===1?'':'s'}`;
      submit.disabled=cost===null||state.shards<cost;
    }
    question.oninput=depth.onchange=refreshQuote;
    $('oracle-form').querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>{question.value=button.dataset.question;refreshQuote();question.focus();});
    $('oracle-form').onsubmit=e=>{
      e.preventDefault();if(submit.disabled)return;
      const result=consultGuide(state,question.value,depth.value);
      $('oracle-answer').textContent=result.ok?`${result.answer}\n\n◇ ${result.cost} shard${result.cost===1?'':'s'} spent.`:result.message;
      if(result.ok){updateHUD();save();question.value='';}
      refreshQuote();
      $('oracle-answer').focus();
    };
    refreshQuote();
  }
  $('oracle-button').onclick=openOracle;
  $('pause-button').onclick=pause;$('map-button').onclick=openMap;$('journal-button').onclick=journal;
  $('sound-button').onclick=()=>{audio.muted=!audio.muted;audio.apply();$('sound-button').textContent=audio.muted?'♩':'♪';$('sound-button').setAttribute('aria-label',audio.muted?'Enable sound':'Mute sound');toast(audio.muted?'Sound muted':'Sound on');};
  function resetEnemy(e){if(e.dead)return;e.x=e.homeX;e.z=e.homeZ;e.hp=e.maxHp;e.windup=0;e.cooldown=1;e.telegraph.visible=false;e.object.position.set(e.x,surfaceAt(e.x,e.z),e.z);}
  function die(){state.hp=0;updateHUD();audio.note(90,.5,.1);openModal('death',`<div class="modal-eyebrow">EVEN STARS NEED REST</div><h2 id="modal-title">The light carries you.</h2><p>The keeper's fire still burns. Return to camp with your discoveries, shards, and awakened beacons intact.</p><button class="primary" id="revive">Wake at the campfire <b>✧</b></button>`);$('revive').onclick=()=>{respawn(state);resetPosition();enemies.forEach(resetEnemy);invincible=3;modalKind='';closeModal();save();updateHUD();};}
  function hurt(amount){if(invincible>0||dodgeTimer>0||state.hp<=0)return;state.hp=Math.max(0,state.hp-amount);invincible=.9;shake=.22;audio.note(100,.16,.1);$('damage-flash').style.opacity='.6';setTimeout(()=>$('damage-flash').style.opacity='0',200);updateHUD();if(state.hp<=0)die();}
  function burst(position,color,count=18){for(let i=0;i<count;i++){const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.07+Math.random()*.08),new THREE.MeshBasicMaterial({color,transparent:true}));mesh.position.copy(position);scene.add(mesh);particles.push({mesh,life:.65+Math.random()*.5,max:1.1,velocity:new THREE.Vector3((Math.random()-.5)*7,2+Math.random()*5,(Math.random()-.5)*7)});}}
  function floater(text,position,color='#f4deb1'){const el=document.createElement('div');el.textContent=text;Object.assign(el.style,{position:'fixed',pointerEvents:'none',fontFamily:'Georgia,serif',fontSize:'23px',color,textShadow:'0 2px 8px #183127',zIndex:5});$('game').appendChild(el);floaters.push({el,position:position.clone(),life:1});}
  function attack(){if(!playing||modalOpen||attackCooldown>0||dodgeTimer>0)return;attackTimer=.36;attackCooldown=.48;audio.note(210,.07,.035,'triangle');
    const targets=enemies.filter(e=>!e.dead&&Math.hypot(e.x-player.position.x,e.z-player.position.z)<3.9+e.scale*.35);targets.sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
    if(targets.length)player.rotation.y=Math.atan2(targets[0].x-player.position.x,targets[0].z-player.position.z);
    for(const e of targets){const angle=Math.atan2(e.x-player.position.x,e.z-player.position.z);if(Math.cos(angle-player.rotation.y)<-.1)continue;e.hp-=swordDamage(state);burst(e.object.position.clone().add(new THREE.Vector3(0,1.7,0)),0xffd28d,9);floater(String(swordDamage(state)),e.object.position.clone().add(new THREE.Vector3(0,2.8*e.scale,0)));shake=.06;audio.note(340,.12,.05,'triangle');e.x+=Math.sin(angle)*.5;e.z+=Math.cos(angle)*.5;
      finishEnemy(e);
    }updateHUD();
  }
  function finishEnemy(e){
    if(e.dead||e.hp>0)return;
e.dead=true;e.object.visible=false;e.telegraph.visible=false;state.defeated.push(e.id);const leveled=reward(state,e.tier===3?160:e.tier===2?60:30,e.tier===3?40:e.tier===2?10:3);burst(e.object.position.clone().add(new THREE.Vector3(0,1.4,0)),0xa4edcc,22);if(e.id==='warden'){toast('The Hollow Warden is at peace. Return to Elowen.');audio.chime();}else if(leveled){toast(`Level ${levelOf(state)} · Your spirit grows stronger.`);audio.chime();}else toast(`Guardian released · +${e.tier===2?60:30} XP · +${e.tier===2?10:3} shards`);save();
    if(second&&e.id!=='storm-regent'){state.arrows=Math.min(199,state.arrows+4);toast(`${e.name} defeated · +4 arrows`);}
    if(e.id==='storm-regent'){state.chapterTwoWon=true;audio.chime();openModal('victory',`<div class="modal-eyebrow">CHAPTER II · COMPLETE</div><h2 id="modal-title">The storm is still.</h2><p>Your last strike breaks the Regent’s crown. Beneath the aurora, the Frostglass Reach is free.</p><p>+40 crystals · Keep exploring, visit the trader, or return through the southern arch.</p><button class="primary" id="frost-continue">Keep exploring</button>`);$('frost-continue').onclick=closeModal;}
    updateHUD();save();
  }
  function shoot(){
    if(!playing||modalOpen||bowCooldown>0||!state.bow)return;
    const targets=enemies.filter(e=>!e.dead&&Math.hypot(e.x-player.position.x,e.z-player.position.z)<32).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z));
    if(!targets.length){toast('No enemy within bow range. Move closer.');return;}
    if(!useArrow(state)){toast('Out of arrows. Buy more at the camp shop, or use your sword.');return;}
    const target=targets[0];player.rotation.y=Math.atan2(target.x-player.position.x,target.z-player.position.z);
    makeShot(player.position.clone().add(new THREE.Vector3(0,1.5,0)),target.object.position.clone().add(new THREE.Vector3(0,1.5,0)),false,bowDamage(state),24);
    player.userData.hero?.shoot();bowCooldown=.65;audio.note(560,.1,.045);updateHUD();save();
  }
  function makeShot(from,to,hostile,damage,speed){
    const mesh=new THREE.Mesh(hostile?new THREE.OctahedronGeometry(.33):new THREE.ConeGeometry(.1,1.2,5),new THREE.MeshBasicMaterial({color:hostile?0xb080ff:0xf4e4ab}));mesh.position.copy(from);
    const velocity=to.clone().sub(from).normalize();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),velocity);scene.add(mesh);shots.push({mesh,velocity:velocity.multiplyScalar(speed),hostile,damage,life:3});
  }
  function updateShots(dt){
    bowCooldown=Math.max(0,bowCooldown-dt);
    for(let i=shots.length-1;i>=0;i--){const shot=shots[i];shot.life-=dt;const old=shot.mesh.position.clone();shot.mesh.position.addScaledVector(shot.velocity,dt);const segment=new THREE.Line3(old,shot.mesh.position),point=new THREE.Vector3();
      if(shot.hostile){segment.closestPointToPoint(player.position.clone().add(new THREE.Vector3(0,1.2,0)),true,point);if(point.distanceTo(player.position.clone().add(new THREE.Vector3(0,1.2,0)))<1){hurt(shot.damage);shot.life=0;}}
      else for(const e of enemies){if(e.dead)continue;const center=e.object.position.clone().add(new THREE.Vector3(0,1.5,0));segment.closestPointToPoint(center,true,point);if(point.distanceTo(center)<1.1*e.scale){e.hp-=shot.damage;floater(String(shot.damage),center);burst(center,0x8fe7ff,6);finishEnemy(e);shot.life=0;break;}}
      if(shot.life<=0){scene.remove(shot.mesh);shot.mesh.geometry.dispose();shot.mesh.material.dispose();shots.splice(i,1);}
    }
  }
  function shop(){
    openModal('shop',`<div class="modal-eyebrow">CRYSTAL EXCHANGE · ${second?'FROSTGLASS TRADER':'ELOWEN’S SUPPLIES'}</div><h2 id="modal-title">Supplies for the road</h2><p>Spend the Aether crystals you collect. Balance: ◇ ${state.shards}</p>${Object.entries(SHOP).map(([id,item])=>`<button class="secondary" data-buy="${id}" ${state.shards<item.cost||id==='sword'&&state.starSword||id==='arrows'&&(!state.bow||state.arrows>179)||id==='flasks'&&state.potions>=3?'disabled':''}>${item.name}<span>${id==='sword'&&state.starSword?'OWNED':`◇ ${item.cost}`}</span></button>`).join('')}<p>Arrows: ${state.arrows}/199 · Bow ${state.bow?'unlocked':'awaits you in Chapter II'}. Sword upgrades from Elowen still stack with the Starforged sword.</p><button class="primary" id="shop-rest">Rest & refill health and flasks · Free</button>`);
    $('modal-content').querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(purchase(state,b.dataset.buy)){updateHUD();save();audio.chime();shop();}});
    $('shop-rest').onclick=()=>{state.hp=maxHealth(state);state.potions=3;updateHUD();save();closeModal();toast('Rested. Health and flasks restored.');};
  }
  function portal(){
    if(state.beacons.length!==3){toast('Awaken all three beacons to open the Aether Gate.');return;}
    openModal('portal',`<div class="modal-eyebrow">THE AETHER GATE</div><h2 id="modal-title">${second?'Return to the Sunlit Reach?':'Enter the Frostglass Reach?'}</h2><p>${second?'Your equipment and progress travel with you.':'Beyond the ring lies a frozen realm. Receive a bow and 30 arrows on your first crossing. Visit the trader, fight new creatures, and challenge the Storm Regent.'}</p><button class="primary" id="cross-gate">Travel to Chapter ${second?'I':'II'} →</button>`);
    $('cross-gate').onclick=()=>{
      save();const next=structuredClone(state);if(!travel(next,second?1:2))return;
      try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));}catch{toast('Travel needs browser storage. Enable it to keep your journey safe.');return;}
      playing=false;location.reload();
    };
  }
  $('bow-button').onclick=shoot;$('shop-button').onclick=()=>{if(Math.hypot(player.position.x-world.npc.position.x,player.position.z-world.npc.position.z)>9){toast('Visit the trader beside the camp to shop.');return;}shop();};
  function dodge(){if(!playing||modalOpen||dodgeCooldown>0||stamina<25)return;stamina-=25;dodgeTimer=.36;dodgeCooldown=.65;invincible=.46;dodgeVector.copy(moveVector.lengthSq()>.01?moveVector:new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y))).normalize();audio.note(130,.12,.025,'triangle');}
  function heal(){if(!playing||modalOpen)return;if(usePotion(state)){burst(player.position.clone().add(new THREE.Vector3(0,1,0)),0xaffecc,22);audio.chime();toast('The light mends you. +65 health');updateHUD();save();}else toast(state.hp>=maxHealth(state)?'Your spirit is already whole.':'Your flasks are empty. Rest at camp or awaken a beacon.');}
  function interact(){if(!playing||modalOpen)return;if(nearby?.type==='portal'){portal();return;}if(!nearby){toast('Move closer to the keeper or a beacon to interact.');return;}if(nearby.type==='keeper'){keeper();return;}if(nearby.type==='beacon'){const b=nearby.beacon;if(state.beacons.includes(b.id)){toast('This beacon already sings with light.');return;}const guardians=enemies.some(e=>e.beacon===b.id&&!e.dead);if(guardians){toast('The beacon is bound. Release its three guardians first.');return;}if(restoreBeacon(state,b.id,false)){applyWorldState();burst(b.group.position.clone().add(new THREE.Vector3(0,5,0)),b.color,65);audio.chime();updateHUD();save();toast(state.beacons.length===3?'All three beacons sing. The Aether Gate is open! Use E inside the great ring to travel.':`${b.name} awakened · +15 shards · Flasks refilled`);}}}
  $('attack-button').onclick=attack;$('dodge-button').onclick=dodge;$('heal-button').onclick=heal;$('touch-interact').onclick=interact;
  const touchMove={x:0,y:0};
  addEventListener('keydown',e=>{
    if(modalOpen){if(e.code==='Escape'){e.preventDefault();closeModal();return;}if(e.code==='Tab'){const list=[...$('modal').querySelectorAll('button:not(:disabled),select,textarea,input,[tabindex="0"]')].filter(el=>!el.classList.contains('hidden'));if(!list.length)return;const current=list.indexOf(document.activeElement),next=e.shiftKey?(current<=0?list.length-1:current-1):(current+1)%list.length;e.preventDefault();list[next].focus();}return;}
    if(e.target===$('guide-toggle')&&(e.code==='Space'||e.code==='Enter'))return;
    if(['Space','Tab','KeyM','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!playing)return;keys.add(e.code);if(e.repeat)return;
    if(e.code==='KeyR')shoot();if(e.code==='KeyH')toggleGuide();if(e.code==='Escape')pause();if(e.code==='Tab')journal();if(e.code==='KeyM')openMap();if(e.code==='KeyE')interact();if(e.code==='KeyQ')heal();if(e.code==='KeyJ')attack();if(e.code==='Space')dodge();if(e.code==='KeyF'&&jumpY===0){vertical=7.2;audio.note(260,.05,.02);}
  });addEventListener('keyup',e=>keys.delete(e.code));
  function clearInput(){keys.clear();drag=null;touchMove.x=0;touchMove.y=0;$('joystick').firstElementChild.style.transform='';}
  addEventListener('blur',()=>{clearInput();save();if(playing&&!modalOpen)pause();});document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden){save();if(playing&&!modalOpen)pause();}last=performance.now();});addEventListener('pagehide',save);
  $('world').addEventListener('contextmenu',e=>e.preventDefault());
  $('world').addEventListener('pointerdown',e=>{if(!playing||modalOpen)return;drag={x:e.clientX,y:e.clientY,distance:0,button:e.button};$('world').setPointerCapture(e.pointerId);});
  $('world').addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);yaw-=dx*.005;pitch=THREE.MathUtils.clamp(pitch+dy*.003,.18,1.15);drag.x=e.clientX;drag.y=e.clientY;});
  $('world').addEventListener('pointerup',e=>{if(drag?.distance<7&&drag.button===0)attack();drag=null;});$('world').addEventListener('pointercancel',()=>drag=null);
  $('world').addEventListener('wheel',e=>{if(!playing)return;e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.01,6,23);},{passive:false});
  const stick=$('joystick');function stickMove(e){const r=stick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/35,y=(e.clientY-r.top-r.height/2)/35;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}touchMove.x=x;touchMove.y=y;stick.firstElementChild.style.transform=`translate(${x*29}px,${y*29}px)`;}
  stick.onpointerdown=e=>{stick.setPointerCapture(e.pointerId);stickMove(e);};stick.onpointermove=e=>{if(stick.hasPointerCapture(e.pointerId))stickMove(e);};stick.onpointerup=stick.onpointercancel=()=>{touchMove.x=0;touchMove.y=0;stick.firstElementChild.style.transform='';};
  function movePlayer(dt){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x,z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touchMove.y;const l=Math.hypot(x,z);if(l>1){x/=l;z/=l;}moveVector.set(x*Math.cos(yaw)+z*Math.sin(yaw),0,z*Math.cos(yaw)-x*Math.sin(yaw));const moving=l>.05,sprinting=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>2&&moving;let speed=sprinting?12:7;
    if(sprinting)stamina=Math.max(0,stamina-dt*14);else stamina=Math.min(100,stamina+dt*19);
    const d=dodgeTimer>0?dodgeVector:moveVector;if(dodgeTimer>0)speed=21;
    let nx=player.position.x+d.x*speed*dt,nz=player.position.z+d.z*speed*dt;
    for(const c of world.colliders){const dx=nx-c.x,dz=nz-c.z,dist=Math.hypot(dx,dz),r=c.r+.42;if(dist<r&&dist>.001){nx=c.x+dx/dist*r;nz=c.z+dz/dist*r;}}
    if(Math.hypot(nx,nz)>WORLD_BOUNDARY){const a=Math.atan2(nx,nz);nx=Math.sin(a)*WORLD_BOUNDARY;nz=Math.cos(a)*WORLD_BOUNDARY;if(time-saveTime>1)toast('The wind turns you back from the edge.');}
    player.position.x=nx;player.position.z=nz;
    vertical-=dt*21;jumpY=Math.max(0,jumpY+vertical*dt);if(jumpY===0)vertical=0;
    player.position.y=surfaceAt(nx,nz)+jumpY;
    if(moving&&attackTimer<=0){const target=Math.atan2(moveVector.x,moveVector.z);player.rotation.y+=Math.atan2(Math.sin(target-player.rotation.y),Math.cos(target-player.rotation.y))*Math.min(1,dt*15);}movePhase+=dt*(sprinting?15:11)*(moving?1:0);
    const data=player.userData;data.hero?.update(dt,{moving,sprinting,attacking:attackTimer>0,dodging:dodgeTimer>0});for(let i=0;i<2;i++){data.legs[i].rotation.x=moving?Math.sin(movePhase+i*Math.PI)*.65:0;data.arms[i].rotation.x=moving?Math.sin(movePhase+i*Math.PI)*.5:0;data.arms[i].rotation.z=0;}
    if(attackTimer>0){data.arms[1].rotation.x=-.9;data.arms[1].rotation.y=Math.sin((.36-attackTimer)/.36*Math.PI)*2.3-1.1;trail.position.set(nx,player.position.y+1.05,nz);trail.rotation.z=-player.rotation.y+attackTimer*9;trail.material.opacity=Math.sin(attackTimer/.36*Math.PI)*.65;}else{data.arms[1].rotation.y=0;trail.material.opacity=0;}
    data.cape.rotation.x=(moving?.28:.1)+Math.sin(time*2)*.035;if(data.elbows)data.elbows.forEach((e,i)=>e.rotation.x=attackTimer>0&&i===1?-.45:moving?-.12-Math.max(0,Math.sin(movePhase+i*Math.PI))*.25:-.08);if(data.knees)data.knees.forEach((k,i)=>k.rotation.x=moving?Math.max(0,-Math.sin(movePhase+i*Math.PI))*.7:0);if(data.torso){data.torso.position.y=Math.sin(time*2)*.009+(moving?Math.abs(Math.sin(movePhase))*.025:0);data.torso.rotation.z=moving?Math.sin(movePhase)*.025:0;}player.rotation.z=dodgeTimer>0?Math.sin(dodgeTimer/.36*Math.PI)*.65:0;
    if(Math.hypot(nx-37,nz-24)<18&&heightAt(nx,nz)<1.7&&moving&&Math.random()<.08)burst(new THREE.Vector3(nx,1.8,nz),0xbdeadc,2);
    if(!Number.isFinite(nx+nz)){respawn(state);resetPosition();}
  }
  function updateEnemies(dt){let closest=null,closestDist=Infinity;
    for(const e of enemies){if(e.dead)continue;const dx=player.position.x-e.x,dz=player.position.z-e.z,d=Math.hypot(dx,dz),home=Math.hypot(e.x-e.homeX,e.z-e.homeZ);if(d<closestDist&&d<17){closest=e;closestDist=d;}
      e.cooldown-=dt;
      if(e.kind==='caster'||e.kind==='boss'){
        if(d<32&&Math.hypot(player.position.x,player.position.z-42)>17){
          e.object.rotation.y=Math.atan2(dx,dz);
          if(e.cooldown<=0&&e.windup<=0){e.windup=.85;e.telegraph.visible=true;}
          if(e.windup>0){e.windup-=dt;e.telegraph.position.set(e.x,3.1,e.z);if(e.windup<=0){e.telegraph.visible=false;const from=e.object.position.clone().add(new THREE.Vector3(0,1.5,0));const to=player.position.clone().add(new THREE.Vector3(0,1.2,0));const count=e.kind==='boss'?(e.hp<e.maxHp/2?7:3):1;for(let j=0;j<count;j++){const direction=to.clone().sub(from).applyAxisAngle(new THREE.Vector3(0,1,0),(j-(count-1)/2)*.18);makeShot(from,from.clone().add(direction),true,e.kind==='boss'?24:15,e.kind==='boss'?13:10);}if(d<7&&e.kind==='boss')hurt(30);e.cooldown=e.kind==='boss'?(e.hp<e.maxHp/2?1:1.9):2.2;}}
          if(e.kind==='caster'&&d<8&&d>.01){e.x-=dx/d*dt*2;e.z-=dz/d*dt*2;}
        }else{e.windup=0;e.telegraph.visible=false;}
        e.object.position.set(e.x,3,e.z);continue;
      }
      if(e.windup>0){e.windup-=dt;e.telegraph.position.set(e.x,surfaceAt(e.x,e.z)+.1,e.z);e.telegraph.material.opacity=.13+(1-e.windup/(e.tier===3?1.05:.8))*.5;e.arms.forEach(a=>a.rotation.x=-1.8);if(e.windup<=0){e.telegraph.visible=false;e.cooldown=e.tier===3?1.3:1.65;if(d<e.attackRadius)hurt(e.tier===3?32:e.tier===2?21:14);burst(e.object.position.clone().add(new THREE.Vector3(0,.4,0)),0xd5af7c,8);}}
      else if(d<20&&home<28&&Math.hypot(player.position.x,player.position.z-42)>17){if(d<2.6*e.scale&&e.cooldown<=0){e.windup=e.tier===3?1.05:.8;e.telegraph.visible=true;}else if(d>2*e.scale){const speed=e.kind==='prowler'?6:e.tier===3?3.2:3.4;e.x+=dx/d*dt*speed;e.z+=dz/d*dt*speed;}e.object.rotation.y=Math.atan2(dx,dz);e.arms.forEach((a,i)=>a.rotation.x=Math.sin(time*6+i*Math.PI)*.3);}
      else if(home>1){e.x+=(e.homeX-e.x)/home*dt*2.3;e.z+=(e.homeZ-e.z)/home*dt*2.3;}
      e.object.position.set(e.x,surfaceAt(e.x,e.z)+Math.sin(time*3+e.homeX)*.025,e.z);
    }
    show('enemy-status',!!closest);if(closest){$('enemy-status').querySelector('span').textContent=closest.name||(closest.tier===3?'THE HOLLOW WARDEN':closest.tier===2?'BEACON GUARDIAN':'HOLLOW SENTINEL');$('enemy-status').querySelector('.bar>div').style.width=`${Math.max(0,closest.hp/closest.maxHp*100)}%`;}
  }
  function checkWorld(){nearby=null;const p=player.position;let best=6;
    const npcDistance=Math.hypot(p.x-world.npc.position.x,p.z-world.npc.position.z);if(npcDistance<best){nearby={type:'keeper'};best=npcDistance;}
    for(const b of world.beaconObjects){const d=Math.hypot(p.x-b.x,p.z-b.z);if(d<best){nearby={type:'beacon',beacon:b};best=d;}}
    const portalZ=second?51:-18;if(Math.hypot(p.x,p.z-portalZ)<5){nearby={type:'portal'};}
    show('interact',!!nearby);if(nearby)$('interact').querySelector('span').textContent=nearby.type==='portal'?(state.beacons.length===3?'Enter the Aether Gate · next world':'Gate sealed · awaken 3 beacons'):nearby.type==='keeper'?(second?'Trade with the Frostglass merchant':'Speak with Elowen'):state.beacons.includes(nearby.beacon.id)?'The beacon is awakened':'Awaken the beacon';
    for(const shard of world.pickups)if(shard.object.visible&&Math.hypot(p.x-shard.x,p.z-shard.z)<1.6){if(collectShard(state,shard.id)){shard.object.visible=false;audio.note(620+Math.random()*300,.2,.025,'sine');burst(shard.object.position,0xc4ffe0,5);updateHUD();save();}}
    let region='The Sunlit Reach',id='reach';for(const b of BEACONS)if(Math.hypot(p.x-b.x,p.z-b.z)<28){region=b.name;id=b.id;}if(Math.hypot(p.x,p.z+18)<20){region='The Aether Gate';id='gate';}if(second){region=p.z<-30?'The Regent’s Court':'Frostglass Reach';id=p.z<-30?'frost-court':'frost-reach';}if(region!==activeRegion)discover(region,id);
    const angle=((-yaw*180/Math.PI)%360+360)%360;const dirs=['N','NE','E','SE','S','SW','W','NW'];const heading=dirs[Math.round(angle/45)%8];$('compass-strip').innerHTML=`<span>· · ·</span> ${heading} <span>· · ·</span>`;
    if(waypoint){const distance=Math.round(Math.hypot(p.x-waypoint.x,p.z-waypoint.z));$('waypoint-bearing').textContent=`◇ ${distance}m`;const bearing=Math.atan2(waypoint.x-p.x,p.z-waypoint.z)+yaw;const offset=Math.atan2(Math.sin(bearing),Math.cos(bearing));$('waypoint-bearing').style.transform=`translateX(${THREE.MathUtils.clamp(offset,-1.6,1.6)*55-20}px)`;show('waypoint-bearing');$('ambient-label').innerHTML=`Your marked destination · ${distance}m<small>Open the map to choose another path.</small>`;}else {show('waypoint-bearing',false);$('ambient-label').innerHTML=`${state.beacons.length?'The island stirs. Keep following the light.':'A quiet wind. An unfamiliar sky.'}<small>${storageAvailable?'Your journey is saved automatically.':'Session only · saving unavailable'}</small>`;}
  }
  function drawMap(canvas,large=false){const ctx=canvas.getContext('2d'),w=canvas.width,scale=w/244;ctx.clearRect(0,0,w,w);ctx.fillStyle='#223f3a';ctx.fillRect(0,0,w,w);ctx.save();ctx.translate(w/2,w/2);ctx.scale(scale,scale);
    const g=ctx.createRadialGradient(-25,-40,10,0,0,116);g.addColorStop(0,'#65755b');g.addColorStop(.65,'#425f4e');g.addColorStop(1,'#74917a');ctx.fillStyle=g;ctx.beginPath();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=110+Math.sin(a*9)*2+Math.cos(a*13)*2;ctx.lineTo(Math.sin(a)*r,Math.cos(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle='#a3b59266';ctx.lineWidth=.6;ctx.stroke();
    if(!second){ctx.strokeStyle='#c5c09355';ctx.lineWidth=2;for(const points of [[[0,70],[0,20],[0,-18],[0,-78]],[[0,20],[-27,9],[-57,-13]],[[0,5],[25,-13],[51,-38]]]){ctx.beginPath();points.forEach(([x,z])=>ctx.lineTo(x,z));ctx.stroke();}
    ctx.fillStyle='#679c91';ctx.beginPath();ctx.ellipse(37,24,22,16,0,0,7);ctx.fill();
    }else{ctx.strokeStyle='#9edfff66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,51);ctx.lineTo(0,-55);ctx.stroke();ctx.beginPath();ctx.arc(0,-55,22,0,7);ctx.stroke();}
    ctx.strokeStyle='#b8c6a51a';ctx.lineWidth=.5;for(let r=30;r<110;r+=20){ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();}
    const fontSize=large?5:8;ctx.textAlign='center';ctx.textBaseline='middle';
    function marker(x,z,text,color){ctx.font=`${large?9:12}px Georgia`;ctx.fillStyle=color;ctx.fillText(text,x,z);}
    if(second){marker(-7,35,'⌂','#f2d18d');marker(0,51,'✧','#88edff');marker(0,-55,'♛','#d7a3ff');if(large){ctx.font='5px Georgia';ctx.fillText('Trader',-7,26);ctx.fillText('Return gate',0,60);ctx.fillText('Storm Regent',0,-66);}}
    if(!second){marker(CAMP.x,CAMP.z,'⌂','#e6d197');marker(0,-18,'✧',state.won?'#b7efc0':'#e5d4ae');
    for(const b of BEACONS){marker(b.x,b.z,state.beacons.includes(b.id)?'✦':'◇',state.beacons.includes(b.id)?'#b5f6cf':'#f0d291');if(large){ctx.font=`${fontSize}px Georgia`;ctx.fillStyle='#e4e4ce';ctx.fillText(b.name,b.x,b.z+10);}}
    if(large){ctx.font='5px Georgia';ctx.fillStyle='#dddbc0';ctx.fillText("Keeper's camp",CAMP.x,CAMP.z+9);ctx.fillText('The Aether Gate',0,-8);ctx.fillStyle='#b5d4bf';ctx.font='italic 5px Georgia';ctx.fillText('The Stillwater',39,27);}
    }
    if(waypoint){ctx.strokeStyle='#f5e6a4';ctx.lineWidth=.6;ctx.beginPath();ctx.arc(waypoint.x,waypoint.z,4,0,7);ctx.moveTo(waypoint.x-6,waypoint.z);ctx.lineTo(waypoint.x+6,waypoint.z);ctx.moveTo(waypoint.x,waypoint.z-6);ctx.lineTo(waypoint.x,waypoint.z+6);ctx.stroke();}
    ctx.save();ctx.translate(player.position.x,player.position.z);ctx.rotate(-player.rotation.y);ctx.fillStyle='#f6f0d1';ctx.shadowColor='#152c25';ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(0,large?3.8:5);ctx.lineTo(-2.8,-3);ctx.lineTo(0,-1.4);ctx.lineTo(2.8,-3);ctx.closePath();ctx.fill();ctx.restore();ctx.restore();
  }
  function updateCamera(dt){if(!playing){camera.position.set(42+Math.sin(time*.035)*2,26,60);camera.lookAt(-3,9,-14);return;}cameraTarget.set(player.position.x,player.position.y+2.1,player.position.z);
    let distance=zoom;const sx=Math.sin(yaw),sz=Math.cos(yaw);for(const c of world.colliders){const dx=c.x-player.position.x,dz=c.z-player.position.z,along=dx*sx+dz*sz,across=Math.abs(dx*sz-dz*sx);if(along>2&&along<distance&&across<c.r+.55)distance=Math.max(3.8,along-c.r-.6);}
    cameraPosition.set(cameraTarget.x+sx*distance*Math.cos(pitch),cameraTarget.y+distance*Math.sin(pitch),cameraTarget.z+sz*distance*Math.cos(pitch));cameraPosition.y=Math.max(cameraPosition.y,surfaceAt(cameraPosition.x,cameraPosition.z)+1.3);camera.position.lerp(cameraPosition,1-Math.exp(-dt*7));if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake=Math.max(0,shake-dt);}camera.lookAt(cameraTarget);
  }
  function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.045);last=now;time+=dt;
    if(!modalOpen){world.update(time,dt);world.npc.userData.hero?.update(dt);}if(!playing&&!modalOpen)player.userData.hero?.update(dt);
    if(playing&&!modalOpen){state.playTime+=dt;attackTimer=Math.max(0,attackTimer-dt);attackCooldown=Math.max(0,attackCooldown-dt);dodgeTimer=Math.max(0,dodgeTimer-dt);dodgeCooldown=Math.max(0,dodgeCooldown-dt);invincible=Math.max(0,invincible-dt);movePlayer(dt);updateEnemies(dt);updateShots(dt);checkWorld();$('stamina-fill').style.width=`${stamina}%`;if(time-saveTime>5){saveTime=time;save();}if(time-mapTime>.12){mapTime=time;drawMap($('minimap'));}}
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.velocity.y-=dt*8;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.material.opacity=Math.max(0,p.life/p.max);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
    for(let i=floaters.length-1;i>=0;i--){const f=floaters[i];f.life-=dt;f.position.y+=dt;const v=f.position.clone().project(camera);f.el.style.left=`${(v.x*.5+.5)*innerWidth}px`;f.el.style.top=`${(-v.y*.5+.5)*innerHeight}px`;f.el.style.opacity=Math.max(0,f.life);if(f.life<=0){f.el.remove();floaters.splice(i,1);}}
    if(!modalOpen)updateCamera(dt);sun.position.set(player.position.x-35,player.position.y+55,player.position.z+25);sun.target.position.copy(player.position);post.render(scene,camera,time,quality==='high');
  }
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  $('world').addEventListener('webglcontextlost',e=>{e.preventDefault();save();show('error-screen');$('error-message').textContent='The graphics connection was interrupted. Your last autosave is safe. Reload to continue.';});
  // Optional browser-native tools expose the same player-facing journal and map.
  if(navigator.modelContext?.registerTool){
    navigator.modelContext.registerTool({name:'aetherfall_journey_status',description:'Read the current Aetherfall quest, health, upgrades, and controls.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:async()=>({content:[{type:'text',text:JSON.stringify({level:levelOf(state),health:state.hp,maxHealth:maxHealth(state),shards:state.shards,beacons:state.beacons,quest:$('quest-description').textContent,controls:'WASD move, drag camera, J attack, Space dodge, E interact, Q heal, F jump, M map, Tab journal'})}]})});
    navigator.modelContext.registerTool({name:'aetherfall_open_journal',description:'Pause Aetherfall and open the player journal.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:async()=>{if(playing)journal();return {content:[{type:'text',text:playing?'Journal opened.':'Begin your journey first.'}]};}});
  }
  requestAnimationFrame(frame);
}
class Soundscape{
  constructor(){this.ctx=null;this.master=null;this.muted=false;this.timer=null;}
  start(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.22;this.master.connect(this.ctx.destination);let n=0;const tones=[146.83,196,220,293.66,392,293.66,220,196];this.timer=setInterval(()=>{if(!document.hidden&&!this.muted)this.note(tones[n++%tones.length],2.8,.045,'sine');},1900);}this.ctx.resume();}catch{}}
  apply(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.22,this.ctx.currentTime,.1);}
  note(freq,duration,volume=.06,type='sine'){if(!this.ctx||this.muted)return;const now=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(volume,now+.015);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(this.master);o.start();o.stop(now+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
  chime(){[523.25,659.25,783.99].forEach((f,i)=>setTimeout(()=>this.note(f,.8,.09),i*110));}
}

try{init();}catch(error){console.error(error);show('error-screen');$('error-message').textContent='Your browser could not start the 3D world. Enable hardware acceleration, then reload, or try a recent version of Chrome, Edge, Firefox, or Safari.';}

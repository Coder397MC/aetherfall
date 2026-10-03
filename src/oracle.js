// Aether shards are charged only when the guide can answer a valid question.
export const DETAIL_LEVELS = { hint:{label:'Hint',base:1}, explanation:{label:'Explanation',base:3}, walkthrough:{label:'Walkthrough',base:5} };
export function quoteQuestion(question,detail='hint') {
  const text=question.trim(),level=Object.hasOwn(DETAIL_LEVELS,detail)?DETAIL_LEVELS[detail]:null;
  if(!text||text.length>400||!level)return null;
  return level.base+Math.floor((text.length-1)/80);
}

const topics=[
  {match:/\b(bow|arrow|arrows|shoot|shop|trader|merchant|starforged)\b/i,answer:s=>[
    s.bow?`Your bow has ${s.arrows} arrows. Press R or tap Bow to shoot the nearest enemy within 32 metres.`:'Enter Chapter II through the Aether Gate after awakening all three beacons to receive a bow and 30 arrows.',
    'Visit the camp shop: 20 arrows cost 6 crystals, and the Starforged sword costs 35 crystals and adds 20 damage. Elowen’s blade upgrades stack with it.',
    'Shots travel through the world, so moving targets can evade them. Frostglass enemies drop 4 arrows when defeated. If you run out, your sword still works. Healing refills cost 5 crystals, or rest at camp for free.'
  ]},
  {match:/\b(frost|frostglass|regent|prowler|prowlers|frostcaster|frostcasters|storm)\b/i,answer:s=>[
    s.chapterTwoWon?'The Storm Regent is defeated. Explore Frostglass Reach or return through the southern arch.':'The Storm Regent waits in the northern arena of Frostglass Reach.',
    'Glass prowlers rush into melee. Frostcasters keep their distance and fire ice bolts. Use your bow, dodge incoming shots, and visit the southern trader for supplies.',
    'The Regent fires a spread of three bolts, then seven faster volleys below half health. Keep moving sideways, dodge through gaps, and shoot between volleys. Avoid standing within seven metres when its attack releases.'
  ]},
  {match:/\b(beacon|beacons|grove|observatory|crown)\b/i,answer:s=>[
    `You have awakened ${s.beacons.length} of 3 beacons. Each unlit beacon is bound to three guardians.`,
    'Release all three guardians at a beacon, then approach its crystal and use E. You can awaken the beacons in any order.',
    'Use M or tap the minimap. The Whispering Grove is northwest of camp, the Sunken Observatory is northeast, and the Crown of Dawn lies far north. Each awakening grants 75 experience and 15 shards, restores health, and refills your flasks.'
  ]},
  {match:/\b(warden|boss|gate|red circle)\b/i,answer:s=>[
    s.defeated.includes('warden')?'You have defeated the Hollow Warden. Return to Elowen at camp.':s.beacons.length===3?'The Hollow Warden is waiting at the ancient gate.':'Awaken all three beacons to summon the Hollow Warden at the ancient gate.',
    'Stay close enough to strike, watch for its red attack circle, and dodge clear before the blow lands. Heal between attacks if needed.',
    'Use J or Strike to attack, Space or Dodge to evade, and Q or Mend to drink a flask. If you need supplies, rest at camp first. Defeating the Warden grants 160 experience and 40 shards; speak with Elowen afterward to complete the chapter.'
  ]},
  {match:/\b(elowen|keeper|camp|rest|npc)\b/i,answer:s=>[
    'Elowen is the keeper beside the campfire where your journey begins.',
    'Approach her and use E to speak. She can explain your journey, offer upgrades, and restore your health and three healing flasks when you rest.',
    'Camp is at the southern end of the island, marked on the map. You can also pause and choose Return to camp without losing progress. Bring shards to temper your blade or strengthen your spirit.'
  ]},
  {match:/\b(shard|shards|material|materials|currency|cost|price|pay|money)\b/i,answer:s=>[
    `You have ${s.shards} Aether shards. They pay for upgrades and questions to this guide.`,
    'Find glowing shards across the island, defeat guardians, or awaken beacons. Spending shards does not remove experience or levels.',
    'There are 45 collectible wild shards, each worth one. Ordinary guardians award 3 shards, stronger guardians 10, beacons 15, and the Warden 40. Guide questions cost 1, 3, or 5 shards for the answer depth, plus 1 per additional 80 characters. Keep some for upgrades.'
  ]},
  {match:/\b(upgrade|upgrades|sword|blade|vitality|spirit|temper)\b/i,answer:s=>[
    `Your blade is rank ${s.sword}/3 and your spirit is rank ${s.vitality}/3. Elowen offers upgrades at camp.`,
    'Blade upgrades add 10 sword damage each. Spirit upgrades add 25 maximum health each. Both have three ranks.',
    'The first rank costs 15 shards, the second 30, and the third 45 for each upgrade type. Talk to Elowen with E and choose the upgrade you can afford. Rest afterward to fill your health.'
  ]},
  {match:/\b(heal|healing|health|potion|potions|flask|flasks|mend|die|death|dead)\b/i,answer:s=>[
    `You have ${s.potions} healing flasks. Use Q or the Mend button when you are hurt.`,
    'Each flask restores up to 65 health. Resting with Elowen or awakening a beacon restores health and refills all three flasks.',
    'A flask is not consumed at full health. Leveling up also restores health. If defeated, you return to camp with your collected shards, upgrades, and beacon progress preserved.'
  ]},
  {match:/\b(fight|combat|attack|strike|guardian|guardians|enemy|enemies|dodge|stamina)\b/i,answer:()=>[
    'Get close to an enemy to strike, then dodge away from its telegraphed attack.',
    'Use J, click the world, or tap Strike to swing. Space or Dodge evades an attack and costs 25 stamina. Sprinting also uses stamina.',
    'Wait for stamina to recover between dodges. Watch the red attack warning, avoid standing inside it when the hit lands, and heal with Q or Mend between attacks. Defeat all three bound guardians before trying to awaken their beacon.'
  ]},
  {match:/\b(map|where am i|waypoint|navigate|navigation|lost|move|controls|jump|sprint|camera)\b/i,answer:()=>[
    'Open M or tap the minimap to see yourself, camp, the beacons, and the gate.',
    'Select a point on the map to mark a destination. Your waypoint appears on the compass and minimap.',
    'Move with WASD or arrow keys, drag to rotate the camera, scroll to zoom, hold Shift to sprint, and press F to jump. On touch screens use the movement stick and drag the world to look. H toggles the objective reminder.'
  ]},
  {match:/\b(level|levels|xp|experience)\b/i,answer:s=>[
    `You have earned ${s.xp} experience. Guardians and awakened beacons grant experience.`,
    'Every 120 experience raises your level, up to level 10. Leveling up restores your health.',
    'Each level adds 15 maximum health and 4 sword damage. Ordinary guardians grant 30 experience, stronger guardians 60, beacons 75, and the Warden 160.'
  ]},
  {match:/\b(next world|worlds|chapter|ending|finished|finish|won|portal)\b/i,answer:s=>[
    s.chapter===2?'You are in Chapter II: Frostglass Reach. Defeat the Storm Regent in the northern arena.':'Awaken all three beacons, then enter the great Aether Gate near the starting area and use E to travel to Chapter II.',
    'The Hollow Warden is an optional challenge. The three beacons alone unlock the gate. Your equipment and crystals travel with you.',
    'Your first crossing grants a bow and 30 arrows. Visit the Frostglass trader for supplies. Use the southern arch to return to Chapter I at any time.'
  ]},
  {match:/\b(save|saved|saving|progress|restart|reset)\b/i,answer:()=>[
    'Your journey saves automatically in this browser when browser storage is available.',
    'Return using the same browser and website address, then choose Continue your journey. Saves do not transfer between devices automatically.',
    'Clearing site data removes your save. Beginning a new journey replaces it after confirmation. The local preview and published game use separate saves because they have different addresses.'
  ]},
  {match:/\b(next|objective|quest|quests|help|what should|what do i|what to do)\b/i,answer:s=>[
    s.chapter===2?(s.chapterTwoWon?'The Storm Regent is defeated. Explore or return through the southern portal.':'Visit the southern trader, then face the Storm Regent in the northern arena.'):s.beacons.length===3?'The Aether Gate is open. Enter the great ring and use E to travel to Frostglass Reach.':!s.metKeeper?'Speak to Elowen beside the campfire to begin your journey.':s.defeated.includes('warden')?'Return to Elowen at camp and use E to complete the chapter.':s.beacons.length===3?'Face the Hollow Warden at the ancient gate.':`Awaken the remaining ${3-s.beacons.length} beacon${s.beacons.length===2?'':'s'}. You may choose any order.`,
    'Open the map to find camp, beacons, and the gate. Get close to the keeper or a beacon and use E to interact.',
    'The journey is: talk to Elowen, defeat each beacon’s three guardians, awaken all three beacons, defeat the Hollow Warden, and speak to Elowen again. Rest and buy upgrades at camp whenever you need help.'
  ]}
];
export function answerQuestion(question,detail,state){
  if(quoteQuestion(question,detail)===null)return null;
  const topic=topics.find(t=>t.match.test(question));
  if(!topic)return null;
  const count={hint:1,explanation:2,walkthrough:3}[detail];
  return topic.answer(state).slice(0,count).join('\n\n');
}
export function consultGuide(state,question,detail){
  const cost=quoteQuestion(question,detail);
  if(cost===null)return {ok:false,message:'Enter a question of 1–400 characters and choose an answer depth. No shards spent.'};
  const answer=answerQuestion(question,detail,state);
  if(!answer)return {ok:false,message:'I do not know that topic. Ask about beacons, Elowen, combat, shards, upgrades, healing, the map, or your next objective. No shards spent.'};
  if(state.shards<cost)return {ok:false,message:`You need ${cost} shards but have ${state.shards}. Try a shorter question or a hint. No shards spent.`};
  state.shards-=cost;
  return {ok:true,answer,cost};
}

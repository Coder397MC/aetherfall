import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,validateSave} from '../src/state.js';
import {quoteQuestion,answerQuestion,consultGuide} from '../src/oracle.js';
test('question prices scale at exact length and detail boundaries',()=>{
  assert.equal(quoteQuestion('a'.repeat(80),'hint'),1);
  assert.equal(quoteQuestion('a'.repeat(81),'hint'),2);
  assert.equal(quoteQuestion('a'.repeat(400),'walkthrough'),9);
  assert.equal(quoteQuestion(' a ','explanation'),3);
  for(const q of ['', '  ', 'a'.repeat(401)])assert.equal(quoteQuestion(q),null);
  assert.equal(quoteQuestion('beacon','invalid'),null);
});
test('unanswered, invalid and unaffordable questions never charge',()=>{
  const s=freshState();s.shards=2;
  for(const [q,d] of [['banana recipes','hint'],['','hint'],['beacon','walkthrough']]){
    const before=JSON.stringify(s);assert.equal(consultGuide(s,q,d).ok,false);assert.equal(JSON.stringify(s),before);
  }
});
test('successful answers charge the quote and preserve spending in saves',()=>{
  const s=freshState();s.shards=20;s.totalShards=20;
  const result=consultGuide(s,'How do I awaken a beacon?','walkthrough');
  assert.equal(result.ok,true);assert.equal(result.cost,5);assert.equal(s.shards,15);assert.equal(s.totalShards,20);
  assert.equal(validateSave(JSON.parse(JSON.stringify(s))).shards,15);
});
test('answer depth grows and next-step advice follows progression',()=>{
  const s=freshState();
  assert.match(answerQuestion('What next?','hint',s),/Elowen/);
  s.metKeeper=true;assert.match(answerQuestion('What next?','hint',s),/remaining 3/);
  s.beacons=['grove','tide','crown'];assert.match(answerQuestion('What next?','hint',s),/Gate/);
  s.defeated=['warden'];assert.match(answerQuestion('What next?','hint',s),/Gate/);
  s.won=true;assert.match(answerQuestion('What next?','hint',s),/Gate/);
  const lengths=['hint','explanation','walkthrough'].map(d=>answerQuestion('beacons',d,s).length);
  assert.ok(lengths[0]<lengths[1]&&lengths[1]<lengths[2]);
});

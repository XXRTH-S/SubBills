import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAccountImport } from './account-import.js';
const fixture = () => ({lang:'th',cards:[{id:'c1',name:'Personal',issuer:'',last4:'1234'}],
  subs:[{id:'s1',name:'Music',cents:12900,cycle:'monthly',date:'2026-10-31',card:'c1'}],
  paid:['s1:2026-10-31'],read:[]});
test('preview strips credentials and ownership; does not mutate the source', () => {
  const raw = {...fixture(), password:'never-copy',user_id:'someone-else'};
  const before = structuredClone(raw), result = prepareAccountImport(raw);
  assert.deepEqual(raw, before);
  assert.equal(result.requiresConfirmation,true);
  assert.equal(JSON.stringify(result).includes('never-copy'),false);
  assert.equal(JSON.stringify(result).includes('someone-else'),false);
  assert.equal(result.subscriptions[0].legacyCardId,'c1');
  assert.deepEqual(result.skippedStatuses,{paid:1,read:0});
  result.cards[0].name='Changed';
  assert.equal(raw.cards[0].name,'Personal');
});
test('refuses partial import of corrupt data or orphan references', () => {
  for (const raw of [null, {...fixture(),cards:[]}, {...fixture(),subs:[{...fixture().subs[0],cents:-1}]}]) {
    assert.throws(() => prepareAccountImport(raw), /IMPORT_INVALID_DATA/);
  }
});

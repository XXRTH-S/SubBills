import test from 'node:test';
import assert from 'node:assert/strict';
import {validateState,validDate,validCard,validSubscription} from './validation.js';
const state=()=>({lang:'en',cards:[{id:'c1',name:'Card',last4:'1234'}],subs:[{id:'s1',name:'Service',card:'c1',cents:100,cycle:'monthly',date:'2026-10-16'}],paid:[],read:[]});
test('valid calendar dates only',()=>{assert(!validDate('2026-02-29'));assert(validDate('2024-02-29'));assert(!validDate('2026-13-01'));});
test('invalid records quarantined without mutating originals',()=>{const raw=state();raw.subs.push({});const r=validateState(raw);assert(r.damaged);assert.equal(r.value.subs.length,1);assert.equal(raw.subs.length,2);});
test('rejects injected identifiers, full card numbers and unsafe prices',()=>{assert(!validCard({...state().cards[0],id:'" onclick="alert(1)'}));assert(!validCard({...state().cards[0],last4:'1234567890123456'}));assert(!validSubscription({...state().subs[0],cents:Infinity}));assert(!validSubscription({...state().subs[0],cents:1.5}));});
test('only approved fields are retained',()=>{const raw=state();raw.password='secret';raw.cards[0].cvv='123';const r=validateState(raw);assert(!r.damaged);assert(!('password' in r.value));assert(!('cvv' in r.value.cards[0]));});
test('duplicate ids and invalid card references detected',()=>{const raw=state();raw.cards.push(raw.cards[0]);raw.subs[0].card='other';const r=validateState(raw);assert(r.damaged);assert.equal(r.value.subs[0].card,'');});

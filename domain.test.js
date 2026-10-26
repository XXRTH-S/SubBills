import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,occurrence,monthBills,notifications} from './domain.js';
const sub={id:'s1',name:'Test',date:'2024-01-31',cycle:'monthly',cents:120000};
test('month-end dates clamp without drifting the original day',()=>{assert.equal(dateKey(occurrence(sub,1)),'2024-02-29');assert.equal(dateKey(occurrence(sub,2)),'2024-03-31');assert.equal(dateKey(occurrence(sub,13)),'2025-02-28');});
test('annual charges appear only in the renewal month',()=>{const yearly={...sub,cycle:'yearly'};assert.equal(monthBills([yearly],new Date(2024,1,1)).length,0);assert.equal(monthBills([yearly],new Date(2025,0,1))[0].cents,120000);});
test('no bills before the initial date and no duplicate monthly charges',()=>{assert.equal(monthBills([sub],new Date(2023,11,1)).length,0);assert.equal(monthBills([sub],new Date(2024,1,1)).length,1);});
test('reminders cross month boundaries and exclude stale bills',()=>{const bills=notifications([{...sub,date:'2026-11-01'}],new Date(2026,9,30));assert.equal(bills.length,1);assert.equal(bills[0].due,'2026-11-01');assert.equal(notifications([{...sub,date:'2026-10-01'}],new Date(2026,9,15)).length,0);});
test('leap-day yearly renewal returns to Feb 29 in leap years',()=>{const annual={...sub,date:'2024-02-29',cycle:'yearly'};assert.equal(dateKey(occurrence(annual,1)),'2025-02-28');assert.equal(dateKey(occurrence(annual,4)),'2028-02-29');});

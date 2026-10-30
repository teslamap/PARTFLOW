import assert from 'node:assert/strict';
import {BATCH_DEFAULTS,batchPolicy,billingMonth,monthlyQuote,transportInput} from '../server/batch-policy.mjs';
assert.equal(monthlyQuote(100,100,{...BATCH_DEFAULTS,discounts:true}).dueGEL,50);
assert.equal(monthlyQuote(100,3,{...BATCH_DEFAULTS,discounts:true}).discountGEL,15);
for(const fee of [10,50,99,101]){const q=monthlyQuote(fee,100,{...BATCH_DEFAULTS,discounts:true});assert.equal(q.dueGEL,fee);assert.equal(q.discountRulePending,true)}
assert.equal(monthlyQuote(10,100,{...BATCH_DEFAULTS,discounts:true,lowFeeFloorGEL:1}).dueGEL,1);
assert.equal(monthlyQuote(50,100,{...BATCH_DEFAULTS,discounts:true,lowFeeFloorGEL:100}).dueGEL,50);
assert.equal(monthlyQuote(100,100,BATCH_DEFAULTS).discountGEL,0);
for(const patch of [{lowFeeFloorGEL:0},{perCreatorGEL:51},{transport:'true'},{minAccountDays:-1},{unknown:true}])assert.throws(()=>batchPolicy(patch));
assert.equal(billingMonth(Date.parse('2026-10-31T21:00:00Z')),'2026-11');
const value={mode:'sos',city:'თბილისი',destinationCity:'თბილისი',destination:'გლდანი',notes:'საბურავი დაზიანებულია',phone:'+995555111222',pickup:{lat:41.7,lng:44.8}};
assert.equal(transportInput(value).scheduledAt,null);
for(const patch of [{pickup:null},{pickup:{lat:NaN,lng:1}},{city:'სხვა'},{destination:''},{phone:'no'},{mode:'intercity'},{mode:'intercity',destinationCity:'ბათუმი',scheduledAt:Date.now()-1}])assert.throws(()=>transportInput({...value,...patch}));
assert.ok(transportInput({...value,mode:'intercity',destinationCity:'ბათუმი',scheduledAt:Date.now()+86400000}).scheduledAt);
console.log('PASS: transport validation, Georgian billing month, standard cap and explicit low-fee floors');

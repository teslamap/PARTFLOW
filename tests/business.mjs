import assert from 'node:assert/strict';
import {businessType,submissionState,reviewFields,legacyBusinessPatch} from '../src/business.mjs';
assert.equal(businessType({status:'approved'}),'parts_shop');
assert.equal(submissionState('auto_service'),'pending_approval');
assert.throws(()=>submissionState('superadmin'));
assert.throws(()=>reviewFields({id:'a',role:'admin'},'approved','',0));
assert.throws(()=>reviewFields({id:'s',role:'superadmin'},'rejected',' ',0));
assert.throws(()=>reviewFields({id:'s',role:'superadmin'},'needs_clarification','x'.repeat(1001),0));
assert.deepEqual(reviewFields({id:'s',role:'superadmin'},'approved','old reason',123),{status:'approved',reviewReason:'',reviewedBy:'s',reviewedAt:123});
for(const status of ['pending','approved','suspended']){
 const original={status,name:'Legacy shop'};
 const patch=legacyBusinessPatch(original);
 assert.deepEqual(patch,{businessType:'parts_shop'});
 const migrated={...original,...patch};
 assert.equal(migrated.status,status);
 assert.equal(legacyBusinessPatch(migrated),null);
}
assert.equal(legacyBusinessPatch({businessType:'auto_service'}),null);
assert.equal(legacyBusinessPatch({businessType:'unknown'}),null);
console.log('Business policy and idempotent migration tests passed');

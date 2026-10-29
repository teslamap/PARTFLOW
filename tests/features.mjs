import assert from 'node:assert/strict';
import {DEFAULT_FLAGS,OPTIONAL_FLAGS,enabled,validateFlags} from '../src/feature-policy.mjs';
for(const key of OPTIONAL_FLAGS)assert.equal(enabled(DEFAULT_FLAGS,key),false);
assert.equal(enabled(DEFAULT_FLAGS,'__proto__'),false);
assert.equal(enabled({...DEFAULT_FLAGS,vouchers:'ON'},'vouchers'),false);
assert.throws(()=>validateFlags({...DEFAULT_FLAGS,phoneRecovery:'ON'}));
assert.throws(()=>validateFlags({...DEFAULT_FLAGS,webAuthRequired:'OFF'}));
validateFlags({...DEFAULT_FLAGS,referrals:'ON',loyaltyPoints:'ON',partnerPromotions:'ON',vouchers:'ON'});
console.log('PASS: safe defaults, dependencies and mandatory web authentication');

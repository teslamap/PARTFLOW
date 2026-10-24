import assert from 'node:assert/strict';
import {pushTargets} from '../functions/payload.mjs';
const d={ownerId:'buyer',shopId:'shop',recipientId:'shop',requestId:'r',offerId:'r_shop',text:'PRIVATE BODY'};
assert.equal(pushTargets('message','m',d)[0].uid,'shop');
assert.equal(pushTargets('offer','r_shop',d)[0].uid,'buyer');
assert.deepEqual(pushTargets('order','r',d).map(t=>t.uid),['buyer','shop']);
assert.equal(JSON.stringify(pushTargets('message','m',d)).includes('PRIVATE BODY'),false);
assert.throws(()=>pushTargets('forged','m',d));
console.log('PASS: push recipients derive from source records; private text excluded.');

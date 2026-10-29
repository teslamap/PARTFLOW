import assert from 'node:assert/strict';
import {createService} from '../server/service.mjs';
const db={collection:()=>({doc:()=>({get:async()=>({data:()=>({})})})}),runTransaction:async fn=>fn({get:async()=>({data:()=>null}),set:()=>{}})};
const auth={verifyIdToken:async()=>({uid:'alice',email_verified:true,firebase:{sign_in_provider:'password'}})};
const service=createService({db,auth});
for(const action of ['referral-code','referral-attach','reward','voucher-redeem','voucher-use','promotion-create','promotion-approve','ai-draft','ai-confirm']){
 const r=await service.handle(new Request('https://test/'+action,{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({confirmed:true})}));
 assert.equal(r.status,403,action+' must fail closed');
}
const anonymous=createService({db,auth:{verifyIdToken:async()=>({uid:'anonymous',firebase:{sign_in_provider:'anonymous'}})}});
assert.equal((await anonymous.handle(new Request('https://test/referral-code',{method:'POST',headers:{Authorization:'Bearer spoof'},body:'{}'}))).status,403);
assert.equal((await service.handle(new Request('https://test/ai-draft',{method:'POST',body:'{}'}))).status,401);
console.log('PASS: all optional API actions denied while disabled; spoofed anonymous and unauthenticated requests denied');

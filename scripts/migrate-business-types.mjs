// Dry run by default. Never changes a status, owner, or existing business type.
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {legacyBusinessPatch} from '../src/business.mjs';
const projectId=process.env.GCLOUD_PROJECT;
if(!projectId)throw Error('Set GCLOUD_PROJECT explicitly');
initializeApp({projectId});
const db=getFirestore(),apply=process.argv.includes('--apply');
let candidates=0,changed=0;
for(const snapshot of (await db.collection('pf_shops').get()).docs){
 if(!legacyBusinessPatch(snapshot.data()))continue;
 candidates++;
 if(apply)await db.runTransaction(async tx=>{
  const fresh=await tx.get(snapshot.ref);
  if(!fresh.exists)return;
  const patch=legacyBusinessPatch(fresh.data());
  if(patch){tx.update(snapshot.ref,patch);changed++}
 });
}
console.log(JSON.stringify({projectId,mode:apply?'apply':'dry-run',candidates,changed}));
await db.terminate();

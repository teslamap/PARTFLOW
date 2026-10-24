import {runTransaction} from 'firebase/firestore';
// Auth state and the post-registration refresh can both request a profile.
// Read/create in one transaction so the loser retries instead of overwriting
// createdAt and losing the listener to a denied update.
export async function ensureMemberRecord(db,ref,value){
 await runTransaction(db,async tx=>{const snapshot=await tx.get(ref);if(!snapshot.exists())tx.set(ref,value)});
}

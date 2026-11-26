import {Timestamp,FieldPath} from 'firebase-admin/firestore';
export const DELAY_MS=15*60*1000;
export function audienceFor(d,now=Date.now()){
 if(d.searchScope!=='city')return 'national';
 if(d.audience==='national'||d.expandedAt!=null)return 'national';
 return d.status==='open'&&!d.acceptedOfferId&&Number.isFinite(d.createdAt?.toMillis?.())&&d.createdAt.toMillis()<=now-DELAY_MS?'national':'city';
}
export async function expandDue(db,now=Date.now()){
 const cutoff=Timestamp.fromMillis(now-DELAY_MS);let changed=0;
 for(let page=0;page<5;page++){
  const rows=await db.collection('pf_requests').where('audience','==','city').where('status','==','open').where('createdAt','<=',cutoff).orderBy('createdAt').limit(100).get();
  if(rows.empty)break;
  for(const row of rows.docs)if(await db.runTransaction(async tx=>{const s=await tx.get(row.ref),d=s.data();if(!d||d.audience!=='city'||d.status!=='open'||d.acceptedOfferId||audienceFor(d,now)!=='national')return false;tx.update(row.ref,{audience:'national'});return true;}))changed++;
  if(rows.size<100)break;
 }
 return changed;
}
export async function migrateAudience(db,{apply=false,now=Date.now()}={}){
 let cursor,scanned=0,candidates=0,changed=0;
 for(;;){
  let q=db.collection('pf_requests').orderBy(FieldPath.documentId()).limit(100);if(cursor)q=q.startAfter(cursor);const page=await q.get();
  if(page.empty)break;
  for(const row of page.docs){scanned++;if(row.data().audience===audienceFor(row.data(),now))continue;candidates++;if(apply&&await db.runTransaction(async tx=>{const s=await tx.get(row.ref);if(!s.exists)return false;const d=s.data(),audience=audienceFor(d,now);if(d.audience===audience)return false;tx.update(row.ref,{audience});return true;}))changed++;}
  cursor=page.docs.at(-1);if(page.size<100)break;
 }
 return {scanned,candidates,changed};
}

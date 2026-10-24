import {collection,doc,getDoc,getDocs,query,where,orderBy,documentId,startAfter,limit,writeBatch,runTransaction,serverTimestamp} from 'firebase/firestore';

// A durable, content-free lock blocks new writes while a bounded cascade runs.
// Interrupted deletion is resumed from the superadmin queue, including after reload.
export async function deleteRequestFully(db,uid,id){
 if(typeof id!=='string'||!id||id.length>128||id.includes('/'))throw Error('მოთხოვნის ID არასწორია');
 const root=doc(db,'pf_requests',id),lock=doc(db,'pf_deletions',id);
 const proceed=await runTransaction(db,async tx=>{
  const existing=await tx.get(lock);
  if(existing.exists())return existing.data().status==='pending';
  const request=await tx.get(root);if(!request.exists())throw Error('მოთხოვნა ვერ მოიძებნა');
  tx.set(lock,{requestedBy:uid,status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
  return true;
 });
 if(!proceed)return;
 async function removeBatch(refs){if(!refs.length)return;const batch=writeBatch(db);refs.forEach(r=>batch.delete(r));await batch.commit()}
 async function drain(path,filters=[]){
  for(;;){const page=await getDocs(query(collection(db,...path),...filters,limit(100)));if(page.empty)return;await removeBatch(page.docs.map(d=>d.ref))}
 }
 // Remove private archived copies of the request/offer labels before deleting offers.
 // Only superadmins can list accounts; no Auth accounts or profiles are modified.
 let cursor;
 do{
  const members=await getDocs(query(collection(db,'pf_members'),orderBy(documentId()),...(cursor?[startAfter(cursor)]:[]),limit(100)));
  if(members.empty)break;
  for(const member of members.docs)for(const panel of ['customer','mobile-customer','shop','admin','superadmin']){
   const path=['pf_archives',member.id,'panels',panel,'items'];
   await drain(path,[where('type','==','requests'),where('targetId','==',id)]);
   // Offers are paged separately so no large IN query or UI 300-row limit applies.
   let offerCursor;
   for(;;){const offers=await getDocs(query(collection(db,'pf_offers'),where('requestId','==',id),orderBy(documentId()),...(offerCursor?[startAfter(offerCursor)]:[]),limit(5)));
    if(offers.empty)break;
    await drain(path,[where('type','==','offers'),where('targetId','in',offers.docs.map(o=>o.id))]);
    offerCursor=offers.docs.at(-1);
   }
  }
  cursor=members.docs.at(-1);
 }while(cursor);
 await drain(['pf_messages'],[where('requestId','==',id)]);
 await drain(['pf_orders',id,'events']);
 await removeBatch([doc(db,'pf_orders',id)]);
 await drain(['pf_offers'],[where('requestId','==',id)]);
 // Commit the final removal with completion, so a disconnected operator can retry.
 const final=writeBatch(db);final.delete(root);final.update(lock,{status:'completed',updatedAt:serverTimestamp()});await final.commit();
}

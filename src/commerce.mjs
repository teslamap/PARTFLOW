import {doc,getDoc,runTransaction,serverTimestamp} from 'firebase/firestore';

export const orderLabels={confirmed:'დადასტურებული',preparing:'მომზადება',shipped:'გაგზავნილი',delivered:'მიწოდებული',completed:'დასრულებული',cancelled:'გაუქმებული'};
export function nextStatuses(order,uid,isAdmin=false){
 if(order.dispute==='open'&&!isAdmin)return [];
 const next={confirmed:'preparing',preparing:'shipped',shipped:'delivered',delivered:'completed'}[order.status];
 const result=[];
 if(next&&(isAdmin||(next==='completed'?uid===order.ownerId:uid===order.shopId)))result.push(next);
 if(['confirmed','preparing'].includes(order.status)&&(isAdmin||[order.ownerId,order.shopId].includes(uid)))result.push('cancelled');
 if(isAdmin&&['shipped','delivered'].includes(order.status))result.push('cancelled');
 return result;
}
export function canChangeOrder(order,uid,kind,isAdmin=false){
 if(!order||!uid)return false;
 if(kind==='dispute')return !isAdmin&&order.dispute==='none'&&[order.ownerId,order.shopId].includes(uid);
 if(kind==='resolve')return isAdmin&&order.dispute==='open';
 return nextStatuses(order,uid,isAdmin).includes(kind);
}
const ref=(db,c,id)=>doc(db,'pf_'+c,id);
// The request ID is the order ID: selection cannot create two fulfillment records.
// Legacy selected offers can initialize their order without rewriting the request.
export async function confirmOrder(db,uid,offerId,expectedVersion){
 const offerSnap=await getDoc(ref(db,'offers',offerId));
 if(!offerSnap.exists())throw Error('შეთავაზება ვერ მოიძებნა');
 const offer=offerSnap.data(),rr=ref(db,'requests',offer.requestId),or=ref(db,'orders',offer.requestId);
 try{await runTransaction(db,async tx=>{
  const request=await tx.get(rr),order=await tx.get(or),confirmation=await tx.get(ref(db,'confirmations',offerId)),r=request.data(),c=confirmation.data();
  const shop=await tx.get(ref(db,'shops',offer.shopId));
  if(r?.ownerId!==uid||offer.ownerId!==uid)throw Error('წვდომა შეზღუდულია');
  if(order.exists()){if(order.data().offerId===offerId)return;throw Error('შეკვეთა უკვე არსებობს');}
  if(!(r.status==='open'||r.status==='closed'&&r.acceptedOfferId===offerId))throw Error('მოთხოვნა უკვე დახურულია');
  if(r.status==='open'&&shop.data()?.status!=='approved')throw Error('მაღაზია ამ ეტაპზე დამტკიცებული არ არის');
  if(r.status==='open'&&(c?.status!=='pending'||expectedVersion!==undefined&&c.version!==expectedVersion))throw Error('დადასტურების მოთხოვნა შეიცვალა ან აღარ არის აქტიური');
  const now=serverTimestamp();
  if(r.status==='open')tx.update(ref(db,'confirmations',offerId),{status:'accepted',updatedAt:now});
  if(r.status==='open')tx.update(rr,{status:'closed',acceptedOfferId:offerId});
  tx.set(or,{requestId:offer.requestId,offerId,ownerId:uid,shopId:offer.shopId,status:'confirmed',dispute:'none',version:0,updatedAt:now,createdAt:now,...(r.status==='open'?{confirmationId:offerId,confirmationVersion:c.version}:{})});
  tx.set(doc(or,'events','0'),{actorId:uid,kind:'confirmed',status:'confirmed',dispute:'none',note:'შეთავაზება არჩეულია',version:0,createdAt:now});
 });}catch(error){
  // Another identical confirmation may commit while this transaction is pending.
  // Only the same owner and immutable offer qualify as an idempotent success.
  const existing=await getDoc(or);
  if(!existing.exists()||existing.data().ownerId!==uid||existing.data().offerId!==offerId)throw error;
 }
}
export async function changeOrder(db,uid,id,kind,note,{isAdmin=false}={}){
 if(typeof note!=='string'||!note.trim()||note.trim().length>1000)throw Error('მიუთითე კომენტარი (1–1000 სიმბოლო)');
 const r=ref(db,'orders',id);
 await runTransaction(db,async tx=>{
  const s=await tx.get(r);if(!s.exists())throw Error('შეკვეთა ვერ მოიძებნა');
  const o=s.data();if(!canChangeOrder(o,uid,kind,isAdmin))throw Error('შეკვეთის ეს ცვლილება ამ ეტაპზე დაშვებული არ არის');
  const version=o.version+1,now=serverTimestamp();
  const status=kind==='dispute'||kind==='resolve'?o.status:kind;
  const dispute=kind==='dispute'?'open':kind==='resolve'?'resolved':o.dispute;
  tx.update(r,{status,dispute,version,updatedAt:now});
  tx.set(doc(r,'events',String(version)),{actorId:uid,kind,status,dispute,note:note.trim(),version,createdAt:now});
 });
}
export {writeChatMessage as sendMessage} from './chat-workflow.mjs';

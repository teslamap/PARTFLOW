import {collection,doc,getDoc,runTransaction,serverTimestamp,setDoc} from 'firebase/firestore';

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
const ref=(db,c,id)=>doc(db,'pf_'+c,id);
// The request ID is the order ID: selection cannot create two fulfillment records.
// Legacy selected offers can initialize their order without rewriting the request.
export async function confirmOrder(db,uid,offerId){
 const offerSnap=await getDoc(ref(db,'offers',offerId));
 if(!offerSnap.exists())throw Error('შეთავაზება ვერ მოიძებნა');
 const offer=offerSnap.data(),rr=ref(db,'requests',offer.requestId),or=ref(db,'orders',offer.requestId);
 try{await runTransaction(db,async tx=>{
  const request=await tx.get(rr),order=await tx.get(or),r=request.data();
  if(r?.ownerId!==uid||offer.ownerId!==uid)throw Error('წვდომა შეზღუდულია');
  if(order.exists()){if(order.data().offerId===offerId)return;throw Error('შეკვეთა უკვე არსებობს');}
  if(!(r.status==='open'||r.status==='closed'&&r.acceptedOfferId===offerId))throw Error('მოთხოვნა უკვე დახურულია');
  const now=serverTimestamp();
  if(r.status==='open')tx.update(rr,{status:'closed',acceptedOfferId:offerId});
  tx.set(or,{requestId:offer.requestId,offerId,ownerId:uid,shopId:offer.shopId,status:'confirmed',dispute:'none',version:0,updatedAt:now,createdAt:now});
  tx.set(doc(or,'events','0'),{actorId:uid,kind:'confirmed',status:'confirmed',dispute:'none',note:'შეთავაზება არჩეულია',version:0,createdAt:now});
 });}catch(error){
  // Another identical confirmation may commit while this transaction is pending.
  // Only the same owner and immutable offer qualify as an idempotent success.
  const existing=await getDoc(or);
  if(!existing.exists()||existing.data().ownerId!==uid||existing.data().offerId!==offerId)throw error;
 }
}
export async function changeOrder(db,uid,id,kind,note){
 if(typeof note!=='string'||!note.trim()||note.trim().length>1000)throw Error('მიუთითე კომენტარი (1–1000 სიმბოლო)');
 const r=ref(db,'orders',id);
 await runTransaction(db,async tx=>{
  const s=await tx.get(r);if(!s.exists())throw Error('შეკვეთა ვერ მოიძებნა');
  const o=s.data(),version=o.version+1,now=serverTimestamp();
  const status=kind==='dispute'||kind==='resolve'?o.status:kind;
  const dispute=kind==='dispute'?'open':kind==='resolve'?'resolved':o.dispute;
  tx.update(r,{status,dispute,version,updatedAt:now});
  tx.set(doc(r,'events',String(version)),{actorId:uid,kind,status,dispute,note:note.trim(),version,createdAt:now});
 });
}
export async function sendMessage(db,uid,offerId,text){
 if(typeof text!=='string'||!text.trim()||text.trim().length>2000)throw Error('შეტყობინება უნდა იყოს 1–2000 სიმბოლო');
 const s=await getDoc(ref(db,'offers',offerId));if(!s.exists())throw Error('შეთავაზება ვერ მოიძებნა');
 const o=s.data();if(![o.ownerId,o.shopId].includes(uid))throw Error('წვდომა შეზღუდულია');
 const target=doc(collection(db,'pf_messages'));
 await setDoc(target,{offerId,requestId:o.requestId,ownerId:o.ownerId,shopId:o.shopId,senderId:uid,recipientId:uid===o.ownerId?o.shopId:o.ownerId,text:text.trim(),createdAt:serverTimestamp()});
}

import {collection,doc,runTransaction,serverTimestamp,setDoc} from 'firebase/firestore';

export function chatClosed(request,offerId){return !request||request.status==='hidden'||(request.status==='closed'&&request.acceptedOfferId!==offerId)}
const ref=(db,c,id)=>doc(db,'pf_'+c,id);
export async function writeChatMessage(db,uid,offerId,text,{admin=false,join=false}={}){
 if(typeof text!=='string'||!text.trim()||text.trim().length>2000)throw Error('შეტყობინება უნდა იყოს 1–2000 სიმბოლო');
 const message=doc(collection(db,'pf_messages')),activityRef=ref(db,'chat_activity',offerId),joinRef=ref(db,'chat_admins',offerId+'_'+uid);
 await runTransaction(db,async tx=>{
  const offerSnap=await tx.get(ref(db,'offers',offerId));if(!offerSnap.exists())throw Error('შეთავაზება ვერ მოიძებნა');
  const o=offerSnap.data(),request=await tx.get(ref(db,'requests',o.requestId)),activity=await tx.get(activityRef);
  if(chatClosed(request.data(),offerId))throw Error('ეს ჩატი დახურულია. ისტორია შენარჩუნებულია.');
  let profile,participation;
  if(admin){profile=await tx.get(ref(db,'members',uid));participation=await tx.get(joinRef);if(!['admin','superadmin'].includes(profile.data()?.role))throw Error('ადმინისტრატორის უფლება აუცილებელია');if(join&&participation.exists())return;if(!join&&!participation.exists())throw Error('ჯერ შემოუერთდი ჩატს');}
  else if(![o.ownerId,o.shopId].includes(uid))throw Error('წვდომა შეზღუდულია');
  const now=serverTimestamp(),before=activity.data(),value={offerId,requestId:o.requestId,ownerId:o.ownerId,shopId:o.shopId,senderId:uid,recipientId:uid===o.ownerId?o.shopId:o.ownerId,text:text.trim(),createdAt:now};
  if(admin){value.kind=join?'admin_join':'admin';value.senderName=profile.data().name;value.recipientIds=[o.ownerId,o.shopId]}
  if(join)tx.set(joinRef,{offerId,requestId:o.requestId,ownerId:o.ownerId,shopId:o.shopId,adminId:uid,adminName:profile.data().name,messageId:message.id,createdAt:now});
  tx.set(message,value);
  tx.set(activityRef,{offerId,requestId:o.requestId,ownerId:o.ownerId,shopId:o.shopId,lastMessageId:message.id,lastSenderId:uid,lastText:value.text,lastKind:admin?(join?'admin_join':'admin'):'message',customerReplied:before?.customerReplied===true||(!admin&&uid===o.ownerId),shopReplied:before?.shopReplied===true||(!admin&&uid===o.shopId),version:(before?.version||0)+1,createdAt:before?.createdAt||now,updatedAt:now});
 });
}
export const joinChat=(db,uid,offerId)=>writeChatMessage(db,uid,offerId,'ადმინისტრატორი შემოუერთდა ჩატს',{admin:true,join:true});
export async function requestConfirmation(db,uid,offerId,terms){
 const price=Number(terms.price),serviceAvailable=terms.serviceAvailable===true||terms.serviceAvailable==='true',servicePrice=serviceAvailable?Number(terms.servicePrice??0):0,delivery=String(terms.delivery||'').trim(),note=String(terms.note||'').trim();
 if(!Number.isFinite(price)||price<=0||price>1000000||!Number.isFinite(servicePrice)||servicePrice<0||servicePrice>1000000||!['ახალი','მეორადი'].includes(terms.condition)||!delivery||delivery.length>120||!note||note.length>1000)throw Error('შეამოწმე ნაწილის/მომსახურების ფასი, მდგომარეობა და მიწოდების პირობები');
 await runTransaction(db,async tx=>{
  const os=await tx.get(ref(db,'offers',offerId));if(!os.exists())throw Error('შეთავაზება ვერ მოიძებნა');const o=os.data();
  const rs=await tx.get(ref(db,'requests',o.requestId)),shop=await tx.get(ref(db,'shops',uid)),activity=await tx.get(ref(db,'chat_activity',offerId)),current=await tx.get(ref(db,'confirmations',offerId));
  if(shop.data()?.status!=='approved')throw Error('დადასტურების გასაგზავნად მაღაზია დამტკიცებული უნდა იყოს');
  if(o.shopId!==uid||rs.data()?.status!=='open')throw Error('მოთხოვნა დახურულია ან უფლება არ გაქვს');
  const customerProof=terms.customerMessageId?await tx.get(ref(db,'messages',terms.customerMessageId)):null,shopProof=terms.shopMessageId?await tx.get(ref(db,'messages',terms.shopMessageId)):null;
  const proven=customerProof?.data()?.senderId===o.ownerId&&shopProof?.data()?.senderId===o.shopId&&[customerProof,shopProof].every(p=>p.data()?.offerId===offerId&&!p.data()?.kind);
  if(!(activity.data()?.customerReplied&&activity.data()?.shopReplied)&&!proven)throw Error('დადასტურებამდე ორივე მხარემ უნდა დაწეროს ჩატში');
  if(current.data()?.status==='pending')throw Error('დადასტურების მოთხოვნა უკვე გაგზავნილია');
  const now=serverTimestamp();
  tx.set(ref(db,'confirmations',offerId),{offerId,requestId:o.requestId,ownerId:o.ownerId,shopId:o.shopId,price,serviceAvailable,servicePrice,condition:terms.condition,delivery,note,...(proven?{customerMessageId:terms.customerMessageId,shopMessageId:terms.shopMessageId}:{}),status:'pending',version:(current.data()?.version||0)+1,createdAt:current.data()?.createdAt||now,updatedAt:now});
 });
}
export async function declineConfirmation(db,uid,offerId,action){
 await runTransaction(db,async tx=>{
  const r=ref(db,'confirmations',offerId),s=await tx.get(r),c=s.data();
  if(!c||c.status!=='pending')throw Error('მოთხოვნა აღარ არის აქტიური');
  if(!(action==='declined'&&c.ownerId===uid||action==='withdrawn'&&c.shopId===uid))throw Error('წვდომა შეზღუდულია');
  tx.update(r,{status:action,updatedAt:serverTimestamp()});
 });
}
export async function markChatRead(db,uid,offerId,version){await setDoc(doc(db,'pf_chat_reads',uid,'threads',offerId),{version,updatedAt:serverTimestamp()})}

import {initializeApp} from 'firebase-admin/app';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {getMessaging} from 'firebase-admin/messaging';
import {onDocumentCreated,onDocumentWritten} from 'firebase-functions/v2/firestore';
import {pushTargets} from './payload.mjs';
initializeApp();
const db=getFirestore(),messaging=getMessaging();
// Deploy separately only when FCM/server prerequisites are configured. No client can
// write delivery receipts or invoke a sender with an arbitrary destination/payload.
async function deliver(kind,id,data,eventId){
 for(const target of pushTargets(kind,id,data)){
  const devices=await db.collection('pf_devices').doc(target.uid).collection('tokens').get();
  for(let start=0;start<devices.size;start+=500){
   const chunk=devices.docs.slice(start,start+500);
   const response=await messaging.sendEachForMulticast({tokens:chunk.map(d=>d.data().token),notification:{title:target.title,body:'გახსენი PARTFLOW დეტალების სანახავად'},data:{...target.data,eventId},android:{collapseKey:kind+'_'+id,notification:{tag:kind+'_'+id}}});
   let retry=false;
   for(const [i,result] of response.responses.entries()){
    if(result.success)continue;
    if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(result.error?.code))await chunk[i].ref.delete();
    else retry=true;
   }
   if(retry)throw Error('Transient FCM error; retry delivery');
  }
 }
 // Operational record only. Trigger retries are at least once; Android tag/collapse
 // replaces duplicate visible notifications. The durable in-app inbox is independent.
 await db.collection('pf_push_deliveries').doc(eventId).set({kind,sourceId:id,deliveredAt:FieldValue.serverTimestamp()});
}
const options={region:'europe-west1',retry:true};
export const messagePush=onDocumentCreated({...options,document:'pf_messages/{id}'},e=>e.data?deliver('message',e.params.id,e.data.data(),e.id):undefined);
export const offerPush=onDocumentCreated({...options,document:'pf_offers/{id}'},e=>e.data?deliver('offer',e.params.id,e.data.data(),e.id):undefined);
export const orderPush=onDocumentWritten({...options,document:'pf_orders/{id}'},e=>{
 const after=e.data?.after;if(!after?.exists)return;
 if(e.data.before.exists&&e.data.before.data().version===after.data().version)return;
 return deliver('order',e.params.id,after.data(),e.id);
});

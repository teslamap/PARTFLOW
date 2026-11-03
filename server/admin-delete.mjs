import {FieldValue} from 'firebase-admin/firestore';

// Privileged, resumable deletion. Never execute from the browser with Firestore rules relaxed.
export function createAdminDeletion({db,auth}){
 const col=n=>db.collection('pf_'+n);
 const safe=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(s);
 async function recursive(ref){await db.recursiveDelete(ref)}
 async function drain(name,field,value,skip=new Set()){
  if(value===undefined||value===null||value==='')return;
  for(;;){const snap=await col(name).where(field,'==',value).limit(75).get();const docs=snap.docs.filter(d=>!skip.has(d.id));if(!docs.length)return;for(const d of docs)await recursive(d.ref)}
 }
 async function ownDoc(name,id){if(safe(id))await recursive(col(name).doc(id))}
 async function removeOffer(offer){
  const id=offer.id,requestId=offer.data().requestId;
  for(const name of ['messages','chat_activity','chat_admins','confirmations'])await drain(name,'offerId',id);
  for(const name of ['inbox','push_deliveries'])await drain(name,'offerId',id);
  await ownDoc('offers',id);
  const request=await col('requests').doc(requestId).get();
  if(request.exists&&request.data().acceptedOfferId===id){
   // Preserve the customer's request, but invalidate the deleted business's selection.
   await col('requests').doc(requestId).update({acceptedOfferId:null,status:'open'});
   await ownDoc('orders',requestId);
  }
 }
 async function removeRequest(id){
  for(;;){const offers=await col('offers').where('requestId','==',id).limit(40).get();if(offers.empty)break;for(const offer of offers.docs)await removeOffer(offer)}
  for(const name of ['messages','chat_activity','chat_admins','confirmations','tow_offers','tow_quotes','inbox','push_deliveries'])await drain(name,'requestId',id);
  await ownDoc('orders',id);
  await ownDoc('requests',id);
  await ownDoc('deletions',id);
 }
 async function removeShop(id){
  for(;;){const offers=await col('offers').where('shopId','==',id).limit(40).get();if(offers.empty)break;for(const offer of offers.docs)await removeOffer(offer)}
  for(const name of ['service_orders','service_requests','service_staff','shop_services','service_catalog','package_audit','referral_scans'])for(const field of ['shopId','businessId','serviceId'])await drain(name,field,id);
  await ownDoc('shops',id);
 }
 async function removePerson(uid){
  // All owned requests, including their offers, messages and orders.
  for(;;){const req=await col('requests').where('ownerId','==',uid).limit(30).get();if(req.empty)break;for(const d of req.docs)await removeRequest(d.id)}
  // Shops and standalone service businesses owned by this account.
  for(;;){const shops=await col('shops').where('ownerId','==',uid).limit(30).get();if(shops.empty)break;for(const d of shops.docs)await removeShop(d.id)}
  await removeShop(uid);
  for(const name of ['tow_requests','tow_offers','tow_quotes','tow_dispatches','support_threads','contacts','vouchers','referrals','rewards','reward_ledger','referral_codes','referral_scans','promotions','promotion_usage','package_audit','ai_drafts','push_deliveries','inbox','chat_admins','chat_activity','messages','confirmations','service_orders','service_requests','service_staff','shop_services','service_catalog','notifications','notification_receipts','rate']){
   for(const field of ['ownerId','uid','userId','customerId','driverId','shopId','adminId','senderId','recipientId','inviterId','inviteeId','partnerId','createdBy','requestedBy'])await drain(name,field,uid);
  }
  for(const name of ['members','shops','tow_drivers','garage','archives','chat_reads','inbox','devices','support_threads','contacts','rewards','referrals','referral_codes','vouchers','ai_drafts','notifications','notification_receipts'])await ownDoc(name,uid);
  await ownDoc('support_threads','shop_'+uid);
  await ownDoc('support_threads','driver_'+uid);
  // Auth is last. If this fails, the job remains pending for a retry.
  try{await auth.deleteUser(uid)}catch(e){if(e.code!=='auth/user-not-found')throw e}
 }
 async function execute({actor,targetType,targetId,confirmation}){
  if(!safe(actor)||!safe(targetId)||!['account','shop','service','driver','chat','support','towRequest'].includes(targetType))throw Error('Invalid deletion target');
  if(actor===targetId||targetType==='account'&&targetId===actor)throw Error('Cannot delete your own admin account');
  if(confirmation!=='DELETE '+targetId)throw Error('Deletion confirmation mismatch');
  const actorProfile=await col('members').doc(actor).get();
  if(actorProfile.data()?.role!=='superadmin')throw Error('Superadmin required');
  if(targetType==='account'){
   const target=await col('members').doc(targetId).get();
   if(target.data()?.role==='superadmin')throw Error('Cannot delete superadmin accounts');
  }
  const key=targetType+'_'+targetId,job=col('admin_deletion_jobs').doc(key);
  const existing=await job.get();
  if(existing.exists&&existing.data().status==='completed')return {deleted:true};
  await job.set({actor,targetType,targetId,status:'pending',updatedAt:FieldValue.serverTimestamp(),createdAt:existing.data()?.createdAt||FieldValue.serverTimestamp()},{merge:true});
  try{
   if(targetType==='chat'){const offer=await col('offers').doc(targetId).get();if(!offer.exists)throw Error('Chat not found');for(const name of ['messages','chat_activity','chat_admins','confirmations'])await drain(name,'offerId',targetId);}
   else if(targetType==='support')await ownDoc('support_threads',targetId);
   else if(targetType==='towRequest')await ownDoc('tow_requests',targetId);
   else if(targetType==='account')await removePerson(targetId);
   else if(targetType==='driver'){await ownDoc('tow_drivers',targetId);for(const name of ['tow_requests','tow_offers','tow_quotes','tow_dispatches'])for(const field of ['driverId','ownerId'])await drain(name,field,targetId);await ownDoc('support_threads','driver_'+targetId)}
   else await removeShop(targetId);
   await job.update({status:'completed',updatedAt:FieldValue.serverTimestamp()});
   return {deleted:true};
  }catch(e){await job.update({status:'pending',lastError:String(e.message||e).slice(0,300),updatedAt:FieldValue.serverTimestamp()});throw e}
 }
 return {execute};
}

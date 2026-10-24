import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,Timestamp,serverTimestamp} from 'firebase/firestore';
import {writeChatMessage,joinChat,requestConfirmation,declineConfirmation} from '../src/chat-workflow.mjs';
import {confirmOrder} from '../src/commerce.mjs';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});
const client=id=>env.authenticatedContext(id).firestore(),buyer=client('buyer'),shop=client('shop'),other=client('other'),admin=client('admin'),wrong=client('wrong');
const terms={price:380,condition:'მეორადი',delivery:'დღეს · ადგილზე გატანა',note:'ორიგინალი'};
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore(),now=Timestamp.now();
 for(const [uid,role] of [['buyer','customer'],['shop','customer'],['other','customer'],['admin','admin'],['root','superadmin']])await setDoc(doc(d,'pf_members',uid),{name:uid,role,createdAt:now});
 for(const uid of ['shop','other'])await setDoc(doc(d,'pf_shops',uid),{ownerId:uid,name:uid,city:'თბილისი',phone:'555000000',status:'approved',rulesMap:{'*~*~*':true},createdAt:now});
 const r={ownerId:'buyer',brand:'Toyota',model:'Prius',year:2015,engine:'1.8',vin:'',category:'განათება',part:'ფარი',description:'Test',city:'თბილისი',condition:'მეორადი',budget:400,photos:[],status:'open',previousStatus:'open',acceptedOfferId:null,createdAt:now};
 for(const id of ['r','race','legacy']){await setDoc(doc(d,'pf_requests',id),r);for(const uid of ['shop','other'])await setDoc(doc(d,'pf_offers',id+'_'+uid),{requestId:id,ownerId:'buyer',shopId:uid,shopName:uid,...terms,status:'pending',createdAt:now})}
 for(const [id,sender] of [['old-customer','buyer'],['old-shop','shop']])await setDoc(doc(d,'pf_messages',id),{offerId:'legacy_shop',requestId:'legacy',ownerId:'buyer',shopId:'shop',senderId:sender,recipientId:sender==='buyer'?'shop':'buyer',text:'Legacy contact',createdAt:now});
 });
 await assertFails(setDoc(doc(shop,'pf_confirmations','r_shop'),{...terms,offerId:'r_shop',requestId:'r',ownerId:'buyer',shopId:'shop',status:'pending',version:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assert.rejects(requestConfirmation(shop,'shop','r_shop',terms));
 await assertSucceeds(writeChatMessage(buyer,'buyer','r_shop','გამარჯობა'));
 await assertSucceeds(writeChatMessage(shop,'shop','r_shop','გამარჯობა'));
 await assert.rejects(writeChatMessage(wrong,'wrong','r_shop','forged'));
 await assert.rejects(writeChatMessage(admin,'admin','r_shop','silent admin',{admin:true}));
 await assertSucceeds(joinChat(admin,'admin','r_shop'));
 await assertSucceeds(joinChat(admin,'admin','r_shop')); // no duplicate join entry
 await assertSucceeds(writeChatMessage(admin,'admin','r_shop','დაგეხმარებით',{admin:true}));
 const messages=await getDocs(query(collection(buyer,'pf_messages'),where('offerId','==','r_shop'),where('ownerId','==','buyer')));
 assert.equal(messages.docs.filter(d=>d.data().kind==='admin_join').length,1);
 assert.deepEqual(messages.docs.find(d=>d.data().kind==='admin').data().recipientIds,['buyer','shop']);
 const activity=await getDoc(doc(buyer,'pf_chat_activity','r_shop'));assert.equal(activity.data().version,4);
 await assertFails(updateDoc(doc(shop,'pf_chat_activity','r_shop'),{lastText:'forged',version:5,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(buyer,'pf_chat_admins','r_shop_buyer'),{offerId:'r_shop',requestId:'r',ownerId:'buyer',shopId:'shop',adminId:'buyer',adminName:'Admin',messageId:'fake',createdAt:serverTimestamp()}));
 await assertFails(getDocs(collection(wrong,'pf_chat_activity')));await assertFails(getDocs(collection(wrong,'pf_confirmations')));await assertFails(getDocs(collection(wrong,'pf_chat_admins')));
 await assertSucceeds(requestConfirmation(shop,'shop','r_shop',terms));
 await assert.rejects(requestConfirmation(shop,'shop','r_shop',terms));
 await assert.rejects(declineConfirmation(other,'other','r_shop','declined'));
 await assertFails(updateDoc(doc(admin,'pf_confirmations','r_shop'),{status:'accepted',updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(shop,'pf_confirmations','r_shop'),{price:1,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(buyer,'pf_chat_reads','shop','threads','r_shop'),{version:1,updatedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(buyer,'pf_chat_reads','buyer','threads','r_shop'),{version:100000,updatedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(buyer,'pf_chat_reads','buyer','threads','r_shop'),{version:4,updatedAt:serverTimestamp()}));
 await assertSucceeds(declineConfirmation(buyer,'buyer','r_shop','declined'));
 await assertSucceeds(requestConfirmation(shop,'shop','r_shop',{...terms,price:370}));
 await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),'pf_shops','shop'),{status:'suspended'}));
 await assert.rejects(confirmOrder(buyer,'buyer','r_shop',2));
 await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),'pf_shops','shop'),{status:'approved'}));
 await assert.rejects(confirmOrder(buyer,'buyer','r_shop',1)); // stale card
 await assertSucceeds(confirmOrder(buyer,'buyer','r_shop',2));
 assert.equal((await getDoc(doc(buyer,'pf_requests','r'))).data().acceptedOfferId,'r_shop');
 assert.equal((await getDoc(doc(buyer,'pf_orders','r'))).data().confirmationVersion,2);
 await assertSucceeds(writeChatMessage(buyer,'buyer','r_shop','გამოვდივარ'));
 await assertSucceeds(writeChatMessage(shop,'shop','r_shop','გელოდებით'));
 await assert.rejects(writeChatMessage(other,'other','r_other','closed competitor'));
 await assert.rejects(writeChatMessage(buyer,'buyer','r_other','closed competitor'));
 await assert.rejects(joinChat(admin,'admin','r_other'));
 await assert.rejects(requestConfirmation(other,'other','r_other',terms));
 for(const uid of ['shop','other']){const d=uid==='shop'?shop:other;await writeChatMessage(buyer,'buyer','race_'+uid,'hello');await writeChatMessage(d,uid,'race_'+uid,'hello');await requestConfirmation(d,uid,'race_'+uid,terms)}
 const results=await Promise.allSettled([confirmOrder(buyer,'buyer','race_shop',1),confirmOrder(buyer,'buyer','race_other',1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'exactly one competing offer wins');
 await assertSucceeds(requestConfirmation(shop,'shop','legacy_shop',{...terms,customerMessageId:'old-customer',shopMessageId:'old-shop'}));
 await assertSucceeds(confirmOrder(buyer,'buyer','legacy_shop',1));
 await env.withSecurityRulesDisabled(async c=>updateDoc(doc(c.firestore(),'pf_members','admin'),{role:'customer'}));
 await assert.rejects(writeChatMessage(admin,'admin','r_shop','revoked admin',{admin:true}));
 console.log('PASS: grouped-chat data, two-way confirmation, visible admin join, named admin messages to both parties, role revocation, stale cards, single winner, winning chat active and competitors locked.');
}finally{await env.cleanup()}

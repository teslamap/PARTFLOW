import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,updateDoc,deleteDoc,collection,query,where,or,and,orderBy,onSnapshot,serverTimestamp,writeBatch,Timestamp} from 'firebase/firestore';
import {requestConfirmation} from '../src/chat-workflow.mjs';
import {ensureMemberRecord} from '../src/member-write.mjs';
import {confirmOrder,changeOrder,sendMessage,nextStatuses,canChangeOrder} from '../src/commerce.mjs';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080),rules:readFileSync('firestore.rules','utf8')}});
const db=id=>env.authenticatedContext(id).firestore(),alice=db('alice'),shop=db('shop'),outsider=db('outsider'),admin=db('admin'),anon=env.unauthenticatedContext().firestore();
const r=(d,c,id)=>doc(d,'pf_'+c,id);
async function observed(db,c,filters,action,predicate){
 let stop=()=>{},timer;
 const received=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Live update timed out')),12000);stop=onSnapshot(query(collection(db,'pf_'+c),...filters),s=>{if(predicate(s.docs.map(d=>d.data())))resolve()},reject)});
 try{await action();await received}finally{clearTimeout(timer);stop()}
}
try{
 await env.clearFirestore();
 const signup=db('signup');await Promise.all([ensureMemberRecord(signup,r(signup,'members','signup'),{name:'First',role:'customer',createdAt:serverTimestamp()}),ensureMemberRecord(signup,r(signup,'members','signup'),{name:'Second',role:'customer',createdAt:serverTimestamp()})]);
 assert.ok(['First','Second'].includes((await getDoc(r(signup,'members','signup'))).data().name));
 await env.withSecurityRulesDisabled(async c=>{
  const d=c.firestore(),now=Timestamp.now();
  for(const [id,role] of [['alice','customer'],['shop','customer'],['admin','admin']])await setDoc(r(d,'members',id),{name:id,role,createdAt:now});
  await setDoc(r(d,'shops','shop'),{ownerId:'shop',name:'Shop',city:'თბილისი',phone:'555000000',status:'approved',rulesMap:{'*~*~*':true},createdAt:now});
  const request={ownerId:'alice',brand:'Toyota',model:'Prius',year:2015,engine:'1.8',vin:'',category:'განათება',part:'ფარი',description:'ფარი',city:'თბილისი',condition:'მეორადი',budget:400,photos:[],status:'open',previousStatus:'open',acceptedOfferId:null,createdAt:now};
  for(const id of ['r1','r2','r3','r4']){
   await setDoc(r(d,'requests',id),request);
   await setDoc(r(d,'offers',id+'_shop'),{requestId:id,ownerId:'alice',shopId:'shop',shopName:'Shop',price:300,condition:'მეორადი',delivery:'დღეს',note:'კარგი',status:'pending',createdAt:now});
  }
 });
 await assertFails(getDocs(collection(anon,'pf_orders')));
 await assertFails(getDocs(collection(outsider,'pf_messages')));
 await assertFails(sendMessage(outsider,'outsider','r1_shop','spoof'));
 await observed(shop,'messages',[and(where('offerId','==','r1_shop'),or(where('ownerId','==','shop'),where('shopId','==','shop'))),orderBy('createdAt','desc')],()=>sendMessage(alice,'alice','r1_shop','გამარჯობა'),rows=>rows.some(x=>x.text==='გამარჯობა'));
 await assertSucceeds(sendMessage(shop,'shop','r1_shop','მოგესალმებით'));
 const messages=await getDocs(query(collection(alice,'pf_messages'),where('ownerId','==','alice'))),msg=messages.docs[0];
 await assertFails(updateDoc(msg.ref,{text:'edited'}));await assertFails(deleteDoc(msg.ref));
 await assertFails(getDoc(doc(outsider,'pf_messages',msg.id)));
 const base={...msg.data(),createdAt:serverTimestamp()};
 for(const patch of [{senderId:'shop'},{recipientId:'outsider'},{ownerId:'outsider'},{requestId:'r2'},{text:'x'.repeat(2001)},{text:3},{extra:true},{createdAt:Timestamp.fromMillis(0)}])await assertFails(setDoc(r(alice,'messages','bad'),{...base,...patch}));
 await requestConfirmation(shop,'shop','r1_shop',{price:300,condition:'მეორადი',delivery:'დღეს',note:'ტესტი'});
 await observed(shop,'orders',[where('shopId','==','shop')],()=>confirmOrder(alice,'alice','r1_shop'),rows=>rows.some(x=>x.status==='confirmed'));
 await assertSucceeds(confirmOrder(alice,'alice','r1_shop')); // retry is idempotent
 await assertFails(confirmOrder(outsider,'outsider','r2_shop'));
 await assertFails(getDoc(r(outsider,'orders','r1')));
 await assertSucceeds(getDocs(query(collection(shop,'pf_orders'),where('shopId','==','shop'),orderBy('createdAt','desc'))));
 await assertSucceeds(getDocs(collection(admin,'pf_orders')));
 await assertFails(updateDoc(r(shop,'orders','r1'),{status:'preparing',version:1,updatedAt:serverTimestamp()})); // history is mandatory
 await assert.rejects(changeOrder(shop,'shop','r1','completed','skip'));
 await assert.rejects(changeOrder(alice,'alice','r1','preparing','wrong actor'));
 await assertSucceeds(changeOrder(shop,'shop','r1','preparing','მზადდება'));
 await assertSucceeds(changeOrder(alice,'alice','r1','dispute','დაზუსტება'));
 await assert.rejects(changeOrder(shop,'shop','r1','shipped','frozen'));
 await assert.rejects(changeOrder(alice,'alice','r1','resolve','self resolve'));
 await assertSucceeds(changeOrder(admin,'admin','r1','resolve','გადაწყვეტილია',{isAdmin:true}));
 for(const status of ['shipped','delivered'])await assertSucceeds(changeOrder(shop,'shop','r1',status,status));
 await assert.rejects(changeOrder(shop,'shop','r1','completed','wrong actor'));
 await assertSucceeds(changeOrder(alice,'alice','r1','completed','მივიღე'));
 await assert.rejects(changeOrder(admin,'admin','r1','confirmed','reopen',{isAdmin:true}));
 await assert.rejects(changeOrder(admin,'admin','r1','cancelled','terminal',{isAdmin:true}));
 const events=await getDocs(collection(alice,'pf_orders','r1','events'));assert.equal(events.size,7);
 await assertFails(updateDoc(doc(admin,'pf_orders','r1','events','0'),{note:'overwrite'}));
 await assertFails(deleteDoc(r(admin,'orders','r1')));
 await assertFails(setDoc(doc(alice,'pf_orders','r1','events','100'),{...events.docs[0].data(),version:100,createdAt:serverTimestamp()}));
 for(const patch of [{ownerId:'shop'},{shopId:'alice'},{offerId:'r2_shop'},{createdAt:serverTimestamp()},{version:100},{status:4},{extra:'bad'}])await assertFails(updateDoc(r(alice,'orders','r1'),patch));
 for(const id of ['r2_shop','r3_shop']){await sendMessage(alice,'alice',id,'hello');await sendMessage(shop,'shop',id,'hello');await requestConfirmation(shop,'shop',id,{price:300,condition:'მეორადი',delivery:'დღეს',note:'ტესტი'})}
 console.log('Starting cancellation order');await assertSucceeds(confirmOrder(alice,'alice','r2_shop'));
 await assertSucceeds(changeOrder(alice,'alice','r2','cancelled','აღარ მჭირდება'));
 await assert.rejects(changeOrder(shop,'shop','r2','preparing','cancelled'));
 // Concurrent selection: exactly one order and version-zero event, no overwrites.
 console.log('Starting concurrent confirmations');await Promise.all([confirmOrder(alice,'alice','r3_shop'),confirmOrder(alice,'alice','r3_shop')]);
 assert.equal((await getDocs(collection(alice,'pf_orders','r3','events'))).size,1);
 const receipt=doc(alice,'pf_inbox','alice','receipts','message_test');
 await assertSucceeds(setDoc(receipt,{createdAt:serverTimestamp()}));
 await assertFails(getDocs(collection(shop,'pf_inbox','alice','receipts')));
 await assertFails(setDoc(receipt,{createdAt:serverTimestamp(),role:'admin'}));
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'pf_settings/control'),{flags:{pushNotifications:'ON'}}));
 const tokenPath=['pf_devices','alice','tokens','a'.repeat(64)];
 await assertSucceeds(setDoc(doc(alice,...tokenPath),{token:'fcm-token',platform:'android',updatedAt:serverTimestamp()}));
 await assertFails(getDoc(doc(admin,...tokenPath)));
 await assertFails(setDoc(doc(shop,...tokenPath),{token:'stolen',platform:'android',updatedAt:serverTimestamp()}));
 assert.deepEqual(nextStatuses({status:'delivered',dispute:'none',ownerId:'alice',shopId:'shop'},'alice'),['completed']);
 const initialOrder={status:'confirmed',dispute:'none',ownerId:'alice',shopId:'shop'};
 assert.equal(canChangeOrder(initialOrder,'shop','preparing'),true);
 assert.equal(canChangeOrder(initialOrder,'alice','preparing'),false);
 assert.equal(canChangeOrder(initialOrder,'outsider','cancelled'),false);
 assert.equal(canChangeOrder(initialOrder,'alice','dispute'),true);
 assert.equal(canChangeOrder({...initialOrder,dispute:'open'},'admin','resolve',true),true);
 assert.equal(canChangeOrder({...initialOrder,dispute:'open'},'shop','preparing'),false);
 assert.equal(canChangeOrder({...initialOrder,status:'completed'},'admin','cancelled',true),false);
 console.log('Commerce: live chat, order cycle, disputes, atomic history, retries, isolation, validation and private device tokens passed.');
}finally{await env.cleanup()}

import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,where,deleteDoc,updateDoc,Timestamp,serverTimestamp,writeBatch} from 'firebase/firestore';
import {deleteRequestFully} from '../src/delete-request.mjs';
import {sendMessage,changeOrder} from '../src/commerce.mjs';
import {subscribePanelData} from '../src/live-data.mjs';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080),rules:readFileSync('firestore.rules','utf8')}});
const client=id=>env.authenticatedContext(id).firestore(),sa=client('sa'),admin=client('admin'),buyer=client('buyer'),shop=client('shop'),anon=env.unauthenticatedContext().firestore();
let stop=()=>{};
try{
 await env.clearFirestore();
 const now=Timestamp.now(),request={ownerId:'buyer',brand:'Toyota',model:'Prius',year:2015,engine:'1.8',vin:'',category:'განათება',part:'Delete test',description:'Test',city:'თბილისი',condition:'მეორადი',budget:400,photos:[],status:'closed',previousStatus:'open',acceptedOfferId:'r_shop',createdAt:now};
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
  for(const [uid,role] of [['sa','superadmin'],['admin','admin'],['buyer','customer'],['shop','customer']])await setDoc(doc(d,'pf_members',uid),{name:uid,role,createdAt:now});
  await setDoc(doc(d,'pf_shops','shop'),{ownerId:'shop',name:'Shop',city:'თბილისი',phone:'555000000',status:'approved',rulesMap:{'*~*~*':true},createdAt:now});
  await setDoc(doc(d,'pf_requests','r'),request);await setDoc(doc(d,'pf_requests','keep'),{...request,part:'Keep this'});
  const offer={requestId:'r',ownerId:'buyer',shopId:'shop',shopName:'Shop',price:300,condition:'მეორადი',delivery:'დღეს',note:'Test',status:'pending',createdAt:now};
  await setDoc(doc(d,'pf_offers','r_shop'),offer);
  for(let i=0;i<32;i++){const oid='r_extra'+i;await setDoc(doc(d,'pf_offers',oid),{...offer,shopId:'extra'+i});await setDoc(doc(d,'pf_archives','sa','panels','superadmin','items','offers_'+oid),{type:'offers',targetId:oid,label:'delete extra offer',createdAt:now})}await setDoc(doc(d,'pf_offers','keep_shop'),{...offer,requestId:'keep'});
  await setDoc(doc(d,'pf_orders','r'),{requestId:'r',offerId:'r_shop',ownerId:'buyer',shopId:'shop',status:'confirmed',dispute:'none',version:0,createdAt:now,updatedAt:now});
  for(const c of ['pf_chat_activity','pf_confirmations','pf_chat_admins'])await setDoc(doc(d,c,'r_shop'),{requestId:'r',offerId:'r_shop',ownerId:'buyer',shopId:'shop',createdAt:now,updatedAt:now});
  for(let offset=0;offset<520;offset+=100){const b=writeBatch(d);for(let i=offset;i<Math.min(offset+100,520);i++)b.set(doc(d,'pf_messages','m'+i),{requestId:'r',offerId:'r_shop',ownerId:'buyer',shopId:'shop',senderId:'buyer',recipientId:'shop',text:'delete me',createdAt:now});await b.commit()}
  for(let i=0;i<105;i++)await setDoc(doc(d,'pf_orders','r','events',String(i)),{version:i,note:'delete history',createdAt:now});
  for(const uid of ['buyer','shop','admin','sa'])for(const panel of ['customer','mobile-customer','shop','admin','superadmin']){
   await setDoc(doc(d,'pf_archives',uid,'panels',panel,'items','requests_r'),{type:'requests',targetId:'r',label:'delete label',createdAt:now});
   await setDoc(doc(d,'pf_archives',uid,'panels',panel,'items','offers_r_shop'),{type:'offers',targetId:'r_shop',label:'delete offer',createdAt:now});
   await setDoc(doc(d,'pf_archives',uid,'panels',panel,'items','requests_keep'),{type:'requests',targetId:'keep',label:'keep label',createdAt:now});
  }
 });
 for(const d of [sa,admin,buyer,shop,anon])await assertFails(deleteDoc(doc(d,'pf_requests','r'))); // lock required even for superadmin
 const lock={requestedBy:'sa',status:'pending',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 for(const d of [admin,buyer,shop,anon])await assertFails(setDoc(doc(d,'pf_deletions','r'),lock));
 await assertFails(setDoc(doc(sa,'pf_deletions','missing'),lock));
 await assertFails(setDoc(doc(sa,'pf_deletions','r'),{...lock,extra:true}));
 await assertSucceeds(setDoc(doc(sa,'pf_deletions','r'),lock)); // simulate interrupted job
 await assertFails(updateDoc(doc(sa,'pf_deletions','r'),{requestedBy:'other',updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(admin,'pf_offers','r_shop')));
 await assertFails(deleteDoc(doc(sa,'pf_requests','keep')));
 await assertFails(sendMessage(buyer,'buyer','r_shop','race after deletion started'));
 await assertFails(changeOrder(shop,'shop','r','preparing','race after deletion started'));
 await assertFails(setDoc(doc(buyer,'pf_archives','buyer','panels','customer','items','requests_r'),{type:'requests',targetId:'r',label:'new archive',createdAt:serverTimestamp()}));
 let latest;const errors=[];stop=subscribePanelData(shop,{id:'shop'},d=>latest=d,e=>errors.push(e),{panel:'shop'});
 const wait=async fn=>{const end=Date.now()+12000;while(!fn()){if(Date.now()>end)throw Error('Live deletion timeout');await new Promise(r=>setTimeout(r,25))}};
 await wait(()=>latest?.offers.some(o=>o.id==='r_shop'));
 await assertSucceeds(deleteRequestFully(sa,'sa','r'));
 await wait(()=>!latest.requests.some(r=>r.id==='r')&&!latest.offers.some(o=>o.requestId==='r'));
 assert.ok(latest.requests.some(r=>r.id==='keep'),'unrelated request remains');
 await assertSucceeds(deleteRequestFully(sa,'sa','r')); // completed retry is safe
 assert.equal((await getDoc(doc(sa,'pf_deletions','r'))).data().status,'completed');
 await assertFails(deleteDoc(doc(sa,'pf_deletions','r')));
 await assertFails(setDoc(doc(buyer,'pf_requests','r'),{...request,status:'open',acceptedOfferId:null,createdAt:serverTimestamp()}));
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();
  for(const p of [['pf_requests','r'],['pf_orders','r'],['pf_offers','r_shop']])assert.equal((await getDoc(doc(d,...p))).exists(),false,p.join('/'));
  assert.equal((await getDocs(query(collection(d,'pf_messages'),where('requestId','==','r')))).size,0);
  assert.equal((await getDocs(collection(d,'pf_orders','r','events'))).size,0);
  for(const c of ['pf_chat_activity','pf_confirmations','pf_chat_admins'])assert.equal((await getDocs(query(collection(d,c),where('requestId','==','r')))).size,0);
  for(const uid of ['buyer','shop','admin','sa'])for(const panel of ['customer','mobile-customer','shop','admin','superadmin']){
   const rows=await getDocs(collection(d,'pf_archives',uid,'panels',panel,'items'));assert.deepEqual(rows.docs.map(x=>x.id),['requests_keep']);
  }
 });
 console.log('PASS: superadmin-only locked cascade; >500 messages and >100 history events; archives removed; shop updates live; interruption/retry and unrelated-data isolation.');
}finally{stop();await env.cleanup()}

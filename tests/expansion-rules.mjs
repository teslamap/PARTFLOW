import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,Timestamp,serverTimestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080),rules:readFileSync(process.env.PARTFLOW_RULES_FILE||'firestore.rules','utf8')}});
try{
 await env.clearFirestore();
 const buyer=env.authenticatedContext('buyer').firestore(),far=env.authenticatedContext('far').firestore(),near=env.authenticatedContext('near').firestore();
 const r={ownerId:'buyer',brand:'Toyota',model:'Prius',year:2018,engine:'1.8',vin:'',category:'განათება',part:'ფარი',description:'ფარი',city:'თბილისი',condition:'მეორადი',budget:100,photos:[],status:'open',previousStatus:'open',acceptedOfferId:null,createdAt:Timestamp.now(),searchScope:'city'};
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();for(const [uid,city] of [['near','თბილისი'],['far','ბათუმი']])await setDoc(doc(db,'pf_shops',uid),{ownerId:uid,name:uid,city,status:'approved',rulesMap:{'Toyota~Prius~განათება':true}});
  for(const [id,data] of Object.entries({fresh:r,old:{...r,createdAt:Timestamp.fromMillis(Date.now()-16*60000)},closed:{...r,status:'closed',acceptedOfferId:'chosen'},legacy:{...r,searchScope:undefined}})){
   const value={...data};if(value.searchScope===undefined)delete value.searchScope;await setDoc(doc(db,'pf_requests',id),value);
  }
 });
 const offer=(id,uid)=>({requestId:id,ownerId:'buyer',shopId:uid,shopName:uid,price:50,condition:'მეორადი',delivery:'მიტანა',note:'ფარი',status:'pending',createdAt:serverTimestamp()});
 await assertFails(setDoc(doc(far,'pf_offers/fresh_far'),offer('fresh','far')));
 await assertSucceeds(setDoc(doc(near,'pf_offers/fresh_near'),offer('fresh','near')));
 await assertSucceeds(setDoc(doc(far,'pf_offers/old_far'),offer('old','far')));
 await assertSucceeds(setDoc(doc(far,'pf_offers/legacy_far'),offer('legacy','far')));
 await assertFails(updateDoc(doc(far,'pf_requests/fresh'),{expandedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(buyer,'pf_requests/fresh'),{expandedAt:Timestamp.fromMillis(0)}));
 await assertFails(updateDoc(doc(buyer,'pf_requests/fresh'),{expandedAt:serverTimestamp(),city:'ბათუმი'}));
 await assertSucceeds(updateDoc(doc(buyer,'pf_requests/fresh'),{expandedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(far,'pf_offers/fresh_far'),offer('fresh','far')));
 assert.equal((await getDoc(doc(near,'pf_offers/fresh_near'))).data().price,50);
 await assertFails(updateDoc(doc(buyer,'pf_requests/fresh'),{expandedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(buyer,'pf_requests/closed'),{expandedAt:serverTimestamp()}));
 await assertFails(setDoc(doc(far,'pf_offers/closed_far'),offer('closed','far')));
 await assertFails(setDoc(doc(buyer,'pf_requests/forged'),{...r,createdAt:serverTimestamp(),expandedAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(buyer,'pf_requests/new'),{...r,createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(buyer,'pf_garage/buyer/vehicles/car'),{brand:'Toyota',model:'Prius',year:2018,engine:'უცნობია',vin:'',trim:'',fuel:'',plate:'AB123CD',createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(buyer,'pf_garage/buyer/vehicles/private'),{brand:'Toyota',model:'Prius',year:2018,engine:'უცნობია',vin:'',trim:'',fuel:'',ownerName:'PRIVATE',createdAt:serverTimestamp()}));
 console.log('PASS: server time/city offer enforcement, customer-only expansion, closed/forged denial, preserved offers, plate whitelist/private data denial');
}finally{await env.cleanup()}

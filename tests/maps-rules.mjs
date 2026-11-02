import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,getDoc,getDocs,collection,query,where,Timestamp,deleteField} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});
const context=id=>env.authenticatedContext(id,{email:id+'@example.com',email_verified:true}).firestore(),admin=context('admin'),owner=context('shop'),other=context('other'),anon=env.unauthenticatedContext().firestore(),ref=(db,id='shop')=>doc(db,'pf_shops',id);
try{
 await env.clearFirestore();await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(const [id,role] of [['admin','admin'],['shop','customer'],['other','customer']])await setDoc(doc(db,'pf_members',id),{name:id,role,createdAt:Timestamp.now()});await setDoc(ref(db),{ownerId:'shop',name:'Test Shop',city:'ბათუმი',phone:'+995555123456',status:'approved',rulesMap:{'Toyota~Prius~განათება':true},createdAt:Timestamp.now()});});
 const point={mapLocation:{lat:41.64,lng:41.63},mapAddress:'Test address'};
 await assertSucceeds(updateDoc(ref(admin),point));await assertSucceeds(getDocs(collection(admin,'pf_shops')));
 await assertSucceeds(getDocs(query(collection(other,'pf_shops'),where('status','==','approved'))));await assertFails(getDoc(ref(anon)));
 await assertFails(updateDoc(ref(other),{mapLocation:{lat:1,lng:1}}));await assertFails(updateDoc(ref(owner),point));
 await assertSucceeds(updateDoc(ref(owner),{...point,status:'pending'}));
 await assertFails(getDoc(ref(other)));await assertFails(getDocs(collection(other,'pf_shops')));
 for(const patch of [{mapLocation:{lat:91,lng:1}},{mapLocation:{lat:1,lng:181}},{mapLocation:{lat:'41',lng:41}},{mapLocation:{lat:1,lng:1,history:[]}},{mapLocation:{lat:1}},{mapAddress:'x'.repeat(301)},{mapAddress:5},{ownerId:'other'},{name:deleteField()}])await assertFails(updateDoc(ref(admin),patch));
 await assertFails(updateDoc(ref(admin),{...point,phone:'spoof'}));await assertSucceeds(updateDoc(ref(admin),{status:'approved'}));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(ref(c.firestore(),'service'),{ownerId:'shop',name:'Service',city:'ბათუმი',phone:'+995555123456',status:'approved',businessType:'auto_service',rulesMap:{'Toyota~Prius~განათება':true},createdAt:Timestamp.now()})});
 await assertSucceeds(updateDoc(ref(admin,'service'),point));await assertFails(updateDoc(ref(admin,'service'),{status:'suspended'}));
 console.log('PASS: admin-only all-shop map, validated location edits, owner approval reset, private pending shops and schema/ownership denial');
}finally{await env.cleanup()}

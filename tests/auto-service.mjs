import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,deleteField,collection,query,where,getDocs,orderBy,serverTimestamp,Timestamp} from 'firebase/firestore';
import {reviewFields} from '../src/business.mjs';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080),rules:readFileSync('firestore.rules','utf8')}});
try {
 await env.clearFirestore();
 const owner=env.authenticatedContext('service').firestore(),other=env.authenticatedContext('other').firestore(),admin=env.authenticatedContext('admin').firestore(),superDb=env.authenticatedContext('super').firestore(),anon=env.unauthenticatedContext().firestore();
 await env.withSecurityRulesDisabled(async c=>{for(const [id,role] of [['service','customer'],['other','customer'],['admin','admin'],['super','superadmin']])await setDoc(doc(c.firestore(),'pf_members',id),{name:id,role,createdAt:Timestamp.now()})});
 const ref=db=>doc(db,'pf_shops/service');
 const service={ownerId:'service',businessType:'auto_service',name:'Service',city:'თბილისი',phone:'+995 555 000 000',rulesMap:{'*~*~*':true},status:'pending_approval',createdAt:serverTimestamp()};
 for(const patch of [{status:'approved'},{status:'pending'},{ownerId:'other'},{businessType:'invalid'},{reviewReason:'forged',reviewedBy:'super',reviewedAt:serverTimestamp()},{extra:true},{name:'x'.repeat(101)}])await assertFails(setDoc(ref(owner),{...service,...patch}));
 await assertSucceeds(setDoc(ref(owner),service));
 await assertFails(getDoc(ref(anon)));await assertFails(getDoc(ref(other)));
 await assertSucceeds(getDoc(ref(owner)));await assertSucceeds(getDoc(ref(superDb)));
 await assertFails(updateDoc(ref(owner),{status:'approved'}));
 const review=(status,reason='')=>reviewFields({id:'super',role:'superadmin'},status,reason,serverTimestamp());
 await assertFails(updateDoc(ref(admin),review('approved')));
 await assertFails(updateDoc(ref(superDb),{status:'approved'}));
 await assertFails(updateDoc(ref(superDb),{...review('approved'),reviewedBy:'other'}));
 await assertFails(updateDoc(ref(superDb),{...review('approved'),reviewedAt:Timestamp.fromMillis(0)}));
 await assertFails(updateDoc(ref(superDb),{...review('approved'),name:'Changed'}));
 await assertSucceeds(updateDoc(ref(superDb),review('needs_clarification','მისამართი დააზუსტე')));
 await assertFails(updateDoc(ref(owner),{reviewReason:''}));
 await assertSucceeds(updateDoc(ref(owner),{name:'Updated service',status:'pending_approval'}));
 await assertSucceeds(updateDoc(ref(superDb),review('rejected','არასრული ინფორმაცია')));
 await assertFails(getDoc(ref(anon)));
 await assertSucceeds(updateDoc(ref(owner),{status:'pending_approval'}));
 await assertSucceeds(updateDoc(ref(superDb),review('approved')));
 await assertSucceeds(getDoc(ref(anon)));
 const publicQuery=db=>query(collection(db,'pf_shops'),where('businessType','==','auto_service'),where('status','==','approved'),orderBy('createdAt','desc'));
 await assertSucceeds(getDocs(publicQuery(anon)));
 await assertFails(getDocs(collection(anon,'pf_shops')));
 await assertFails(getDocs(query(collection(anon,'pf_shops'),where('businessType','==','auto_service'))));
 for(const patch of [{ownerId:'other',status:'pending_approval'},{businessType:'parts_shop',status:'pending'},{businessType:deleteField(),status:'pending'},{createdAt:Timestamp.now(),status:'pending_approval'},{name:'x'.repeat(101),status:'pending_approval'},{status:'pending_approval',reviewedBy:'service'},{name:deleteField(),status:'pending_approval'},{status:'pending_approval',extra:true}])await assertFails(updateDoc(ref(owner),patch));
 await assertFails(deleteDoc(ref(owner)));
 // An approved service does not gain access to customers' parts requests.
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'pf_requests/private'),{ownerId:'other',brand:'Toyota',model:'Prius',category:'განათება',status:'open'}));
 await assertFails(getDoc(doc(owner,'pf_requests/private')));
 await assertSucceeds(updateDoc(ref(superDb),review('suspended','დროებით შეჩერებული')));
 await assertFails(getDoc(ref(anon)));
 // Legacy shop migration is additive and preserves existing approval/access.
 const {businessType,...legacy}=service;
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'pf_shops/other'),{...legacy,ownerId:'other',status:'approved'}));
 await assertSucceeds(updateDoc(doc(admin,'pf_shops/other'),{status:'suspended'}));
 console.log('Auto-service security and public query tests passed');
} finally {await env.cleanup()}

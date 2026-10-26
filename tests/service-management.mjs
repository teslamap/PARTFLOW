import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,query,where,collection,updateDoc,deleteDoc,deleteField,Timestamp,serverTimestamp} from 'firebase/firestore';
import {saveServiceRecord,defaultWeek,catalogValue,staffValue,validateWeek,closureValue} from '../src/service-management.mjs';
assert.throws(()=>catalogValue({name:'A',description:'',durationMinutes:16,active:true}));
assert.throws(()=>validateWeek(defaultWeek().slice(1)));
assert.throws(()=>validateWeek(defaultWeek().map((d,i)=>i===0?{open:true,start:600,end:500}:d)));
assert.throws(()=>validateWeek(defaultWeek().map((d,i)=>i===6?{open:false,start:10,end:20}:d)));
assert.throws(()=>closureValue({date:'2026-02-30',staffId:'',active:true}));
assert.throws(()=>staffValue({name:'Staff',specialty:'',days:defaultWeek(),serviceIds:['x','x'],active:true}));
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080),rules:readFileSync('firestore.rules','utf8')}});
try{
 await env.clearFirestore();
 const account=id=>env.authenticatedContext(id,{email:id+'@example.com',email_verified:true}).firestore();
 const owner=account('service'),other=account('other'),parts=account('parts'),admin=account('admin'),anon=env.unauthenticatedContext().firestore();
 await env.withSecurityRulesDisabled(async c=>{
  for(const [id,type] of [['service','auto_service'],['other','auto_service'],['parts','parts_shop']])await setDoc(doc(c.firestore(),'pf_shops',id),{ownerId:id,businessType:type,status:type==='auto_service'?'pending_approval':'approved'});
  for(const id of ['service','other','parts','admin'])await setDoc(doc(c.firestore(),'pf_members',id),{name:id,role:id==='admin'?'admin':'customer',createdAt:Timestamp.now()});
 });
 const item={name:'ზეთის შეცვლა',description:'ძრავის ზეთი',durationMinutes:30,active:true};
 const itemRef=db=>doc(db,'pf_shops/service/catalog/oil');
 await assertSucceeds(saveServiceRecord(owner,'service','catalog','oil',item));
 const createdAt=(await getDoc(itemRef(owner))).data().createdAt.toMillis();
 await assertSucceeds(saveServiceRecord(owner,'service','catalog','oil',{...item,durationMinutes:45}));
 assert.equal((await getDoc(itemRef(owner))).data().createdAt.toMillis(),createdAt);
 await assertFails(getDoc(itemRef(anon)));await assertFails(getDoc(itemRef(other)));await assertSucceeds(getDoc(itemRef(admin)));
 await assertFails(saveServiceRecord(other,'service','catalog','spoof',item));
 await assertFails(saveServiceRecord(parts,'parts','catalog','oil',item));
 await assertFails(saveServiceRecord(admin,'service','catalog','oil',item));
 const stamps={createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
 for(const patch of [{name:'x'.repeat(101)},{description:'x'.repeat(1001)},{durationMinutes:0},{durationMinutes:481},{durationMinutes:22},{active:'yes'},{ownerId:'other'}]){
  await assertFails(setDoc(doc(owner,'pf_shops/service/catalog/bad'),{...item,...stamps,...patch}));
  await assertFails(updateDoc(itemRef(owner),{...patch,updatedAt:serverTimestamp()}));
 }
 await assertFails(updateDoc(itemRef(owner),{name:deleteField(),updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(itemRef(owner),{createdAt:Timestamp.fromMillis(0),updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(itemRef(owner)));
 await assertSucceeds(saveServiceRecord(owner,'service','hours','weekly',{days:defaultWeek()}));
 await assertFails(setDoc(doc(owner,'pf_shops/service/hours/other'),{timezone:'Asia/Tbilisi',days:defaultWeek(),...stamps}));
 await assertFails(updateDoc(doc(owner,'pf_shops/service/hours/weekly'),{timezone:'UTC',updatedAt:serverTimestamp()}));
 for(const patch of [{days:[]},{days:[...defaultWeek(),defaultWeek()[0]]},{days:defaultWeek().map((d,i)=>i===0?{...d,open:'yes'}:d)},{days:defaultWeek().map((d,i)=>i===0?{...d,start:-1}:d)},{days:defaultWeek().map((d,i)=>i===0?{...d,end:1441}:d)},{days:defaultWeek().map((d,i)=>i===0?{...d,extra:true}:d)}])await assertFails(updateDoc(doc(owner,'pf_shops/service/hours/weekly'),{...patch,updatedAt:serverTimestamp()}));
 const worker={name:'გიორგი',specialty:'ძრავის სპეციალისტი',serviceIds:['oil'],days:defaultWeek(),active:true};
 await assertSucceeds(saveServiceRecord(owner,'service','staff','giorgi',worker));
 await assertSucceeds(saveServiceRecord(other,'other','catalog','foreign',item));
 const staffRef=db=>doc(db,'pf_shops/service/staff/giorgi');
 for(const patch of [{serviceIds:['foreign']},{serviceIds:['missing']},{serviceIds:['oil','oil']},{serviceIds:[]},{name:7},{specialty:'x'.repeat(201)},{days:[]}])await assertFails(updateDoc(staffRef(owner),{...patch,updatedAt:serverTimestamp()}));
 // Upper bound exercises rule access-call limits as well as schema validation.
 const eight=[];for(let i=0;i<8;i++){const id='service'+i;eight.push(id);await saveServiceRecord(owner,'service','catalog',id,item)}
 await assertSucceeds(saveServiceRecord(owner,'service','staff','eight',{...worker,serviceIds:eight}));
 await assertFails(updateDoc(staffRef(owner),{serviceIds:[...eight,'oil'],updatedAt:serverTimestamp()}));
 await assertSucceeds(saveServiceRecord(owner,'service','closures','2026-12-25_all',{date:'2026-12-25',staffId:'',active:true}));
 await assertSucceeds(saveServiceRecord(owner,'service','closures','2026-12-26_staff_giorgi',{date:'2026-12-26',staffId:'giorgi',active:true}));
 const closure={date:'2026-12-25',day:Timestamp.fromDate(new Date('2026-12-25T00:00:00Z')),staffId:'',active:true,...stamps};
 for(const patch of [{date:'2026-02-30'},{day:Timestamp.now()},{staffId:'foreign'},{staffId:'missing'},{day:'2026-12-25'},{privateReason:'medical'}])await assertFails(setDoc(doc(owner,'pf_shops/service/closures/2026-12-25_all'),{...closure,...patch}));
 await assertFails(setDoc(doc(owner,'pf_shops/service/closures/wrong-id'),closure));
 await assertFails(deleteDoc(staffRef(owner)));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'pf_shops/service'),{status:'approved'}));
 for(const kind of ['catalog','staff','closures'])await assertSucceeds(getDocs(query(collection(anon,'pf_shops/service',kind),where('active','==',true))));
 await assertSucceeds(getDoc(doc(anon,'pf_shops/service/hours/weekly')));
 await saveServiceRecord(owner,'service','catalog','oil',{...item,active:false});
 await assertFails(getDoc(itemRef(anon)));await assertSucceeds(getDoc(itemRef(owner)));
 await assertFails(getDocs(collection(anon,'pf_shops/service/catalog')));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),'pf_shops/service'),{status:'suspended'}));
 await assertFails(getDoc(staffRef(anon)));await assertFails(getDoc(doc(anon,'pf_shops/service/hours/weekly')));
 await assertFails(getDocs(query(collection(anon,'pf_shops/service/staff'),where('active','==',true))));
 await assertSucceeds(getDoc(staffRef(owner)));
 await env.withSecurityRulesDisabled(c=>deleteDoc(doc(c.firestore(),'pf_shops/service')));
 await assertFails(getDoc(staffRef(owner)));await assertFails(getDoc(staffRef(anon)));
 console.log('PASS: service setup CRUD, weekly schedules, real dates, local assignments, approval gates, inactive records, immutable timestamps, orphan denial and owner isolation.');
}finally{await env.cleanup()}

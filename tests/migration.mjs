import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,Timestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-partflow',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_PORT||8080)}});
async function migrate(apply=false){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['scripts/migrate-business-types.mjs',...(apply?['--apply']:[])],{env:{...process.env,GCLOUD_PROJECT:'demo-partflow',FIRESTORE_EMULATOR_HOST:'127.0.0.1:'+Number(process.env.FIRESTORE_EMULATOR_PORT||8080)}});
  let output='',error='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>error+=v);
  child.on('error',reject);child.on('exit',code=>code===0?resolve(JSON.parse(output.trim())):reject(Error(error)));
 });
}
try{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore();
  for(const status of ['pending','approved','suspended'])await setDoc(doc(db,'pf_shops',status),{ownerId:status,name:'Legacy',status,createdAt:Timestamp.fromMillis(1000),rulesMap:{'*~*~*':true}});
  await setDoc(doc(db,'pf_shops/service'),{businessType:'auto_service',status:'pending_approval'});
  await setDoc(doc(db,'pf_orders/keep'),{status:'confirmed',ownerId:'customer'});
 });
 assert.equal((await migrate()).candidates,3);
 await env.withSecurityRulesDisabled(async c=>assert.equal((await getDoc(doc(c.firestore(),'pf_shops/approved'))).data().businessType,undefined));
 assert.equal((await migrate(true)).changed,3);
 assert.equal((await migrate(true)).changed,0);
 await env.withSecurityRulesDisabled(async c=>{
  for(const status of ['pending','approved','suspended']){
   const s=(await getDoc(doc(c.firestore(),'pf_shops',status))).data();
   assert.equal(s.status,status);assert.equal(s.businessType,'parts_shop');assert.equal(s.createdAt.toMillis(),1000);assert.equal(s.ownerId,status);
  }
  assert.equal((await getDoc(doc(c.firestore(),'pf_shops/service'))).data().businessType,'auto_service');
  assert.equal((await getDoc(doc(c.firestore(),'pf_orders/keep'))).data().status,'confirmed');
 });
 console.log('Migration dry-run, apply, repeat and preservation tests passed');
}finally{await env.cleanup()}

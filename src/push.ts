import {Capacitor,registerPlugin} from '@capacitor/core';
import {doc,setDoc,deleteDoc,serverTimestamp,getDoc} from 'firebase/firestore';
import {auth,db} from './firebase';
// registerPlugin avoids loading a second web implementation in standalone HTML.
const Push=registerPlugin<any>('PushNotifications');
let stored:any=null;
try{stored=JSON.parse(localStorage.getItem('pf-push-device')||'null')}catch{localStorage.removeItem('pf-push-device')}
let activeToken:string|null=stored?.id||null;
let activeOwner:string|null=stored?.uid||null;
export async function watchAndroidPushOpen(open:(target:any)=>void){
 if(Capacitor.getPlatform()!=='android')return {remove:async()=>{}};
 return Push.addListener('pushNotificationActionPerformed',({notification}:any)=>{
  const d=notification?.data;
  if(d&&typeof d.requestId==='string'&&d.requestId.length<=128)open({requestId:d.requestId,offerId:typeof d.offerId==='string'?d.offerId:undefined,orderId:typeof d.orderId==='string'?d.orderId:undefined});
 });
}
export async function disableAndroidPush(){
 if(activeOwner&&activeToken)await deleteDoc(doc(db,'pf_devices',activeOwner,'tokens',activeToken));
 activeOwner=null;activeToken=null;localStorage.removeItem('pf-push-device');
 if(Capacitor.getPlatform()==='android')await Push.unregister();
}
export async function enableAndroidPush(uid:string){
 if((await getDoc(doc(db,'pf_settings','control'))).data()?.flags?.pushNotifications!=='ON')throw Error('Push გამორთულია');
 if(Capacitor.getPlatform()!=='android')throw Error('Push-ის ჩართვა ხელმისაწვდომია Android აპში. შიდა შეტყობინებები აქაც მუშაობს.');
 let permission=await Push.checkPermissions();
 if(permission.receive==='prompt')permission=await Push.requestPermissions();
 if(permission.receive!=='granted')throw Error('შეტყობინებების უფლება არ არის გაცემული');
 await new Promise<void>(async(resolve,reject)=>{
  let done=false;const handles:any[]=[];
  const finish=(error?:any)=>{if(done)return;done=true;clearTimeout(timer);handles.forEach(h=>void h.remove());error?reject(error):resolve()};
  const timer=setTimeout(()=>finish(Error('Push რეგისტრაციის დრო ამოიწურა')),15000);
  try{
   handles.push(await Push.addListener('registrationError',(e:any)=>finish(Error(e.error||'Push რეგისტრაცია ვერ შესრულდა'))));
   handles.push(await Push.addListener('registration',async({value}:any)=>{
    try{if(auth.currentUser?.uid!==uid)throw Error('ხელახლა შედი ანგარიშში');
     const id=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
     await setDoc(doc(db,'pf_devices',uid,'tokens',id),{token:value,platform:'android',updatedAt:serverTimestamp()});activeOwner=uid;activeToken=id;localStorage.setItem('pf-push-device',JSON.stringify({uid,id}));finish();
    }catch(e){finish(e)}
   }));
   await Push.register();
  }catch(e){finish(e)}
 });
}

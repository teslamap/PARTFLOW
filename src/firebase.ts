import {createPanelSession} from './auth-session';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {FIREBASE_CONFIG} from './runtime-config.mjs';
import {CustomProvider,initializeAppCheck,getToken} from 'firebase/app-check';
import {shouldUseAndroidAppCheck} from './android-identity.mjs';
export const config=FIREBASE_CONFIG;
const role=document.documentElement.dataset.role||'customer';
const emulated=import.meta.env.DEV&&import.meta.env.VITE_EMULATORS==='1';
export const {app,auth}=createPanelSession(config,role,emulated?'http://127.0.0.1:9099':undefined);
const isAndroidWebView=typeof navigator!=='undefined'&&navigator.userAgent.includes('PartflowAndroid/');
let androidAppCheck:any=null;
export async function androidAppCheckToken(){return await appCheckReady?(await getToken(androidAppCheck)).token:null}
export const appCheckReady:Promise<boolean>=shouldUseAndroidAppCheck({isAndroid:isAndroidWebView,enabled:import.meta.env.VITE_ANDROID_APPCHECK==='1',bridgePresent:typeof window!=='undefined'&&'PartflowAppCheck'in window})?initializeAndroidAppCheck():Promise.resolve(false);
async function initializeAndroidAppCheck(){
  if(!('PartflowAppCheck'in window))return false;
  androidAppCheck=initializeAppCheck(app,{provider:new CustomProvider({getToken:()=>new Promise((resolve,reject)=>{
    const bridge=(window as any).PartflowAppCheck,done=(event:MessageEvent)=>{clearTimeout(timeout);bridge.removeEventListener('message',done);try{const token=JSON.parse(event.data);if(!token.token||!Number.isFinite(token.expireTimeMillis))throw Error('App Check token missing');resolve(token)}catch(error){reject(error)}};
    const timeout=setTimeout(()=>{bridge.removeEventListener('message',done);reject(Error('Android App Check timed out'))},10000);bridge.addEventListener('message',done);bridge.postMessage('appCheckToken');
  })}),isTokenAutoRefreshEnabled:true});
  return true;
}
export const db=getFirestore(app);
if(emulated)connectFirestoreEmulator(db,'127.0.0.1',8080);

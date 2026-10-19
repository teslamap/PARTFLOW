import {createPanelSession} from './auth-session';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
export const config={projectId:'menio-8de8f',appId:'1:429553713786:web:bf1325a209c917bd4db1c3',storageBucket:'menio-8de8f.firebasestorage.app',apiKey:'AIzaSyDghOTPxpYXBGijyZMJTL3SxTazB881YMo',authDomain:'menio-8de8f.firebaseapp.com',messagingSenderId:'429553713786'};
const role=document.documentElement.dataset.role||'customer';
const emulated=import.meta.env.DEV&&import.meta.env.VITE_EMULATORS==='1';
export const {app,auth}=createPanelSession(config,role,emulated?'http://127.0.0.1:9099':undefined);
export const db=getFirestore(app);
if(emulated)connectFirestoreEmulator(db,'127.0.0.1',8080);

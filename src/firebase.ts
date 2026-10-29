import {createPanelSession} from './auth-session';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
import {FIREBASE_CONFIG} from './runtime-config.mjs';
export const config=FIREBASE_CONFIG;
const role=document.documentElement.dataset.role||'customer';
const emulated=import.meta.env.DEV&&import.meta.env.VITE_EMULATORS==='1';
export const {app,auth}=createPanelSession(config,role,emulated?'http://127.0.0.1:9099':undefined);
export const db=getFirestore(app);
if(emulated)connectFirestoreEmulator(db,'127.0.0.1',8080);

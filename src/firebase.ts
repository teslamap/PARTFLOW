import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator} from 'firebase/firestore';
export const config={projectId:'menio-8de8f',appId:'1:429553713786:web:bf1325a209c917bd4db1c3',storageBucket:'menio-8de8f.firebasestorage.app',apiKey:'AIzaSyDghOTPxpYXBGijyZMJTL3SxTazB881YMo',authDomain:'menio-8de8f.firebaseapp.com',messagingSenderId:'429553713786'};
export const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
if(import.meta.env.DEV&&import.meta.env.VITE_EMULATORS==='1'){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);}

import {useEffect,useState} from 'react';
import {db,auth} from './firebase';
import {onAuthStateChanged} from 'firebase/auth';
import {doc,onSnapshot} from 'firebase/firestore';
import {DEFAULT_FLAGS,enabled} from './feature-policy.mjs';
const safe={...DEFAULT_FLAGS,phoneContact:'OFF'};
export function useFeatures(){const [flags,setFlags]=useState<any>(safe);useEffect(()=>{let stop=()=>{};const off=onAuthStateChanged(auth,u=>{stop();setFlags(safe);if(u)stop=onSnapshot(doc(db,'pf_settings','control'),s=>setFlags({...safe,...s.data()?.flags}),()=>setFlags(safe))});return()=>{off();stop()}},[]);return (key:string)=>enabled(flags,key)}

import {useEffect,useState} from 'react';
import {doc,onSnapshot} from 'firebase/firestore';
import {auth,db} from './firebase';
import {api} from './api';
export function PhoneVerification(){
 const [contact,setContact]=useState<any>(null),[challenge,setChallenge]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const uid=auth.currentUser?.uid;
 useEffect(()=>{setChallenge('');setCode('');setContact(null);if(!uid)return;return onSnapshot(doc(db,'pf_contacts',uid),s=>{setContact(s.data()||null);setChallenge('');setCode('')},()=>setContact(null))},[uid]);
 async function run(task:()=>Promise<void>){setBusy(true);setStatus('');try{await task()}catch(e:any){setStatus(e.message)}finally{setBusy(false)}}
 return <details><summary>ტელეფონის დადასტურება</summary>{!contact?.phone?<p>ჯერ შეინახე საკონტაქტო ნომერი.</p>:contact.phoneVerified?<p>ტელეფონი დადასტურებულია.</p>:<><p>{contact.phone}</p><button type="button" className="secondary" disabled={busy} onClick={()=>void run(async()=>{const result=await api('sms-start',{phone:contact.phone});setChallenge(result.challengeId);setCode('');setStatus('კოდი გამოგზავნილია. მოქმედებს 5 წუთი.')})}>კოდის გაგზავნა</button>{challenge&&<form className="inline-form" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('sms-confirm',{challengeId:challenge,code});setChallenge('');setCode('');setStatus('ტელეფონი დადასტურებულია.')})}}><label>SMS კოდი<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6}/></label><button className="secondary" disabled={busy||code.length!==6}>დადასტურება</button></form>}</>}{status&&<p role="status">{status}</p>}</details>;
}

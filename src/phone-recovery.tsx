import {useState} from 'react';
import {signInWithCustomToken} from 'firebase/auth';
import {auth} from './firebase';
import {api,endpoint} from './api';
export function PhoneRecovery(){
 const [phone,setPhone]=useState(''),[challenge,setChallenge]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 if(import.meta.env.VITE_PHONE_RECOVERY!=='1'||!endpoint)return null;
 async function run(task:()=>Promise<void>){setBusy(true);setStatus('');try{await task()}catch{setStatus('მოქმედება ვერ შესრულდა. გადაამოწმე მონაცემები ან სცადე მოგვიანებით.')}finally{setBusy(false)}}
 return <details><summary>ანგარიშის აღდგენა ტელეფონით</summary><p>მხოლოდ ანგარიშზე ადრე დადასტურებული ნომრით.</p><form className="auth-form" onSubmit={e=>{e.preventDefault();void run(async()=>{if(challenge){const result=await api('recovery-confirm',{challengeId:challenge,code},true);await signInWithCustomToken(auth,result.customToken);setChallenge('');setCode('')}else{const result=await api('recovery-start',{phone},true);setChallenge(result.challengeId);setStatus('თუ ნომერი დადასტურებულ ანგარიშს ეკუთვნის, კოდი გამოგეგზავნება.')}})}}><label>ტელეფონი<input type="tel" autoComplete="tel" value={phone} disabled={busy||!!challenge} onChange={e=>setPhone(e.target.value.replace(/[\s()-]/g,''))} pattern="\+9955[0-9]{8}" placeholder="+9955XXXXXXXX" required/></label>{challenge&&<label>SMS კოდი<input autoComplete="one-time-code" inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} pattern="[0-9]{6}" required maxLength={6}/></label>}<button className="secondary" disabled={busy}>{challenge?'აღდგენის დადასტურება':'კოდის გაგზავნა'}</button>{challenge&&<button type="button" disabled={busy} onClick={()=>{setChallenge('');setCode('');setStatus('')}}>თავიდან დაწყება</button>}</form>{status&&<p role="status">{status}</p>}</details>;
}

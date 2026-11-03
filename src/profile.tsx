import {useEffect,useState} from 'react';
import {doc,updateDoc} from 'firebase/firestore';
import {auth,db} from './firebase';
import {CITIES} from './core.mjs';
export function ProfileEditor({uid,name,city,demo=false}:any){
 const [value,setValue]=useState(name||''),[cityValue,setCityValue]=useState(city||'თბილისი'),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{setValue(name||'');setCityValue(city||'თბილისი');setStatus('')},[uid,name,city]);
 return <section className="panel" style={{padding:20,marginBottom:16}}><h3>ჩემი პროფილი</h3><form className="inline-form" onSubmit={async e=>{e.preventDefault();const clean=value.trim();if(demo||!uid||auth.currentUser?.uid!==uid||!clean||busy)return;setBusy(true);setStatus('');try{await updateDoc(doc(db,'pf_members',uid),{name:clean,city:cityValue});setStatus('პროფილი შენახულია.')}catch{setStatus('პროფილი ვერ შეინახა. სცადე ხელახლა.')}finally{setBusy(false)}}}><label>სახელი<input value={value} maxLength={100} required autoComplete="name" disabled={demo||busy} onChange={e=>setValue(e.target.value)}/></label><label>ქალაქი<select value={cityValue} disabled={demo||busy} onChange={e=>setCityValue(e.target.value)}>{CITIES.map((c:string)=><option key={c}>{c}</option>)}</select></label><button className="secondary" disabled={demo||busy||!value.trim()||(value.trim()===name&&cityValue===(city||'თბილისი'))}>{busy?'ინახება...':'შენახვა'}</button></form>{status&&<p role="status">{status}</p>}</section>;
}
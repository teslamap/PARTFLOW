import {useEffect,useState,type FormEvent} from 'react';
import {doc,onSnapshot,setDoc,serverTimestamp,updateDoc} from 'firebase/firestore';
import {auth,db} from './firebase';
import {CITIES} from './core.mjs';
import {useFeatures} from './use-features';
import {UserRound,MapPin,Phone,ShieldCheck,Save,LockKeyhole,CheckCircle2} from 'lucide-react';
import './profile.css';

export function ProfileEditor({uid,name,city,demo=false,accountType='customer'}:any){
 const enabled=useFeatures(),contactEnabled=enabled('phoneContact'),accountLabel=accountType==='driver'?'მძღოლის ანგარიში':accountType==='shop'?'ბიზნესის მფლობელი':'მომხმარებლის ანგარიში';
 const [value,setValue]=useState(name||''),[cityValue,setCityValue]=useState(city||'თბილისი'),[phone,setPhone]=useState(''),[originalPhone,setOriginalPhone]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[phoneError,setPhoneError]=useState('');
 useEffect(()=>{setValue(name||'');setCityValue(city||'თბილისი');setStatus('')},[uid,name,city]);
 useEffect(()=>{setPhone('');setOriginalPhone('');setPhoneError('');if(!uid||demo||!contactEnabled)return;return onSnapshot(doc(db,'pf_contacts',uid),s=>{const p=s.data()?.phone||'';setPhone(p);setOriginalPhone(p)},()=>setPhoneError('საკონტაქტო ნომერი ვერ ჩაიტვირთა.'));},[uid,demo,contactEnabled]);
 const cleanPhone=phone.replace(/[\s()-]/g,'');
 const changed=value.trim()!==(name||'').trim()||cityValue!==(city||'თბილისი')||(contactEnabled&&cleanPhone!==originalPhone);
 const validPhone=!contactEnabled||(!cleanPhone||/^\+9955\d{8}$/.test(cleanPhone));
 async function save(e:FormEvent){e.preventDefault();if(demo||!uid||auth.currentUser?.uid!==uid||busy||!value.trim()||!validPhone||!changed)return;setBusy(true);setStatus('');try{
  if(value.trim()!==(name||'').trim()||cityValue!==(city||'თბილისი'))await updateDoc(doc(db,'pf_members',uid),{name:value.trim(),city:cityValue});
  if(contactEnabled&&cleanPhone!==originalPhone){if(!cleanPhone)throw Error('ნომრის წასაშლელად დაუკავშირდი მხარდაჭერას.');await setDoc(doc(db,'pf_contacts',uid),{phone:cleanPhone,phoneVerified:false,updatedAt:serverTimestamp()});}
  setStatus('ცვლილებები წარმატებით შეინახა.');
 }catch(e:any){setStatus(e?.message||'პროფილი ვერ შეინახა. სცადე ხელახლა.')}finally{setBusy(false)}}
 return <section className="panel pf-profile">
  <div className="pf-profile-head"><div className="pf-profile-avatar"><UserRound size={28}/></div><div><span className="pf-profile-eyebrow">PARTFLOW · {accountLabel}</span><h2>ჩემი პროფილი</h2><p>პირადი მონაცემები, საკონტაქტო ინფორმაცია და ანგარიშის პარამეტრები ერთ სივრცეში.</p></div><span className="pf-profile-private"><LockKeyhole size={14}/> პირადი</span></div>
  <form onSubmit={save} className="pf-profile-form"><div className="pf-profile-section"><h3><UserRound size={17}/> პირადი ინფორმაცია</h3><div className="pf-profile-grid"><label>სახელი და გვარი<input value={value} maxLength={100} required autoComplete="name" disabled={demo||busy} placeholder="შენი სახელი" onChange={e=>setValue(e.target.value)}/></label><label><span><MapPin size={14}/> ქალაქი</span><select value={cityValue} disabled={demo||busy} onChange={e=>setCityValue(e.target.value)}>{CITIES.map((c:string)=><option key={c}>{c}</option>)}</select></label></div></div>
  {contactEnabled&&<div className="pf-profile-section"><h3><Phone size={17}/> საკონტაქტო ინფორმაცია</h3><div className="pf-profile-grid"><label>მობილურის ნომერი<input type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={20} disabled={demo||busy} placeholder="+9955XXXXXXXX" aria-invalid={!validPhone} onChange={e=>setPhone(e.target.value)}/></label><div className="pf-profile-hint"><ShieldCheck size={19}/><span>ეს პირადი საკონტაქტო ნომერია და არ ცვლის მაღაზიის ან ევაკუატორის სამუშაო ნომერს. ნომერი მხოლოდ შენს ანგარიშზე ჩანს; შეცვლისას დადასტურება განულდება.</span></div></div>{!validPhone&&<p className="pf-profile-error">გამოიყენე ფორმატი +9955XXXXXXXX</p>}{phoneError&&<p className="pf-profile-error">{phoneError}</p>}</div>}
  <div className="pf-profile-footer"><span><CheckCircle2 size={16}/> ცვლილებები შეინახება მხოლოდ შენს ანგარიშზე.</span><button type="submit" className="primary" disabled={demo||busy||!value.trim()||!validPhone||!changed}><Save size={17}/>{busy?'ინახება...':'ცვლილებების შენახვა'}</button></div>{status&&<p role="status" className="pf-profile-status">{status}</p>}</form>
 </section>;
}

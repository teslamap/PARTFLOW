import {useEffect,useState} from 'react';
import {doc,onSnapshot,setDoc,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
import './infrastructure.css';

type Props={userId:string;demo?:boolean};
type Policy={requestDays:number;chatDays:number;garageDays:number;logoDays:number};
const defaults:Policy={requestDays:90,chatDays:30,garageDays:365,logoDays:365};
const fields:[keyof Policy,string,string][]=[
 ['requestDays','მოთხოვნის ფოტოები','მოთხოვნებზე მიმაგრებული სურათები'],
 ['chatDays','ჩატის ფოტოები','შეტყობინებების ტექსტი შენარჩუნდება'],
 ['garageDays','გარაჟის ფოტოები','ავტომობილების სურათები'],
 ['logoDays','მაღაზიების ლოგოები','მაღაზიის პროფილის გამოსახულებები']
];
export function Infrastructure({userId,demo=false}:Props){
 const [policy,setPolicy]=useState<Policy>(defaults),[draft,setDraft]=useState<Policy>(defaults);
 const [state,setState]=useState('იტვირთება…'),[busy,setBusy]=useState(false);
 useEffect(()=>{if(demo){setState('დემო რეჟიმი');return}return onSnapshot(doc(db,'pf_settings','infrastructure'),snap=>{
 const source=snap.data()||{};const p={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>Number.isInteger(source[k])&&source[k]>=1&&source[k]<=3650).map(k=>[k,source[k]]))} as Policy;
 setPolicy(p);setDraft(p);setState('სინქრონიზებულია');
 },e=>setState('მონაცემები ვერ ჩაიტვირთა: '+e.message))},[demo]);
 const change=(k:keyof Policy,value:string)=>setDraft(p=>({...p,[k]:Number(value)}));
 async function save(){if(Object.values(draft).some(v=>!Number.isInteger(v)||v<1||v>3650)){setState('შეიყვანე 1–3650 დღე');return}
 if(demo){setPolicy(draft);setState('დემო მონაცემები შენახულია');return}
 setBusy(true);try{await setDoc(doc(db,'pf_settings','infrastructure'),{...draft,updatedBy:userId,updatedAt:serverTimestamp()});setState('პარამეტრები შენახულია')}catch(e:any){setState('შენახვა ვერ მოხერხდა: '+e.message)}finally{setBusy(false)}}
 return <section className="pf-infra">
 <div className="pf-infra-head"><div><h2>ინფრასტრუქტურის მართვა</h2><p>ფოტოების შენახვის პოლიტიკა · სუპერადმინი</p></div><span>{state}</span></div>
 <div className="pf-infra-grid">{fields.map(([key,label,description])=><label className="pf-infra-field" key={key}><strong>{label}</strong><small>{description}</small><div><input type="number" min="1" max="3650" step="1" value={draft[key]} onChange={e=>change(key,e.target.value)}/><span>დღე</span></div></label>)}</div>
 <p className="pf-infra-note">ეს პარამეტრები ინახება Firestore-ში. ვადაგასული ფოტოების რეალური წაშლა ამ დაფით არ აქტიურდება — საჭიროა ცალკე სერვერული გასუფთავების დავალება. ჩატის ტექსტები არ უნდა წაიშალოს.</p>
 <div className="pf-infra-actions"><button className="secondary" onClick={()=>setDraft(policy)} disabled={busy}>გაუქმება</button><button className="primary" onClick={save} disabled={busy}>{busy?'ინახება…':'პარამეტრების შენახვა'}</button></div>
 </section>
}
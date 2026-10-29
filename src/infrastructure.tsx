import {useEffect,useState} from 'react';
import {doc,onSnapshot,setDoc,serverTimestamp,collection,query,orderBy,limit,getDocs} from 'firebase/firestore';
import {db} from './firebase';
import {DEFAULT_REWARDS} from './feature-policy.mjs';
import {DEFAULT_CONTROL,FLAGS,STATES,listenControl,normalizeControl,saveControl} from './god-mode.mjs';
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

export function GodMode({userId,demo=false}:Props){
 const [current,setCurrent]=useState<any>(DEFAULT_CONTROL),[draft,setDraft]=useState<any>(DEFAULT_CONTROL),[history,setHistory]=useState<any[]>([]),[state,setState]=useState('იტვირთება…'),[busy,setBusy]=useState(false);
 useEffect(()=>{if(demo){setState('დემო რეჟიმი');return}const stop=listenControl(db,value=>{setCurrent(value);setDraft(value);setState('სინქრონიზებულია')},e=>setState('კონფიგურაცია ვერ ჩაიტვირთა: '+e.message));void getDocs(query(collection(db,'pf_control_audit'),orderBy('revision','desc'),limit(20))).then(s=>setHistory(s.docs.map(d=>({id:d.id,...d.data()})))).catch(e=>setState('აუდიტი ვერ ჩაიტვირთა: '+e.message));return stop},[demo]);
 function change(key:string,value:string){setDraft((d:any)=>({...d,flags:{...d.flags,[key]:value}}))}
 async function persist(value:any,action='update'){if(demo){setState('დემო რეჟიმში შენახვა გამორთულია');return}setBusy(true);try{await saveControl(db,userId,current,value,action);setState(action==='rollback'?'კონფიგურაცია აღდგენილია':'ცვლილებები შენახულია');const s=await getDocs(query(collection(db,'pf_control_audit'),orderBy('revision','desc'),limit(20)));setHistory(s.docs.map(d=>({id:d.id,...d.data()})))}catch(e:any){setState(e.message)}finally{setBusy(false)}}
 return <section className="pf-infra"><div className="pf-infra-head"><div><h2>ფუნქციების მართვა</h2><p>ცოცხალი კონტროლი · ადმინისტრატორი · ვერსია {current.revision}</p></div><span>{state}</span></div>
 <div className="pf-infra-grid">{Object.entries(FLAGS).map(([key,label])=><label className="pf-infra-field" key={key}><strong>{label}</strong><small>{key==='maintenance'?'შეტყობინება მომხმარებლებისთვის':key==='godMode'?'მართვის პანელის ხელმისაწვდომობა':'ახალი V2 ფუნქცია'}</small><select value={draft.flags[key]} onChange={e=>change(key,e.target.value)} disabled={busy||demo}>{STATES.map(v=><option key={v}>{v}</option>)}</select></label>)}</div>
 <label className="pf-infra-field"><strong>ტექნიკური შეტყობინება</strong><input maxLength={240} value={draft.message} onChange={e=>setDraft((d:any)=>({...d,message:e.target.value}))} disabled={busy||demo}/></label>
 <p className="pf-infra-note">შენახვა ვრცელდება სუპერადმინის სერვერული წესით; ცვლილება შედის უცვლელ აუდიტში და იღებს ახალ ვერსიას. TEST და LIMITED მომხმარებელს არ რთავს ფუნქციას. AI და APK საჭიროებს სერვერულ კონფიგურაციას; მხოლოდ flag-ის ჩართვა ინტეგრაციას არ ააქტიურებს.</p>
 <div className="pf-infra-actions"><button className="secondary" onClick={()=>setDraft(current)} disabled={busy}>გაუქმება</button><button className="primary" onClick={()=>persist(draft)} disabled={busy||demo}>{busy?'ინახება…':'კონფიგურაციის შენახვა'}</button></div>
 <h3>ცვლილებების ისტორია</h3>{history.map(item=><div className="pf-infra-head" key={item.id}><span>ვერსია {item.revision} · {item.action==='rollback'?'აღდგენა':'ცვლილება'} · {item.actorId}</span><button className="secondary" disabled={busy||demo||item.revision>=current.revision} onClick={()=>persist(normalizeControl({...item.before,revision:current.revision}), 'rollback')}>ამ ვერსიის აღდგენა</button></div>)}
 </section>
}

export function RewardSettings({userId,demo=false}:Props){const [value,setValue]=useState<any>(DEFAULT_REWARDS),[status,setStatus]=useState('');useEffect(()=>{if(demo)return;return onSnapshot(doc(db,'pf_settings','rewards'),s=>setValue({...DEFAULT_REWARDS,...s.data()}),()=>setStatus('ჩატვირთვა ვერ მოხერხდა'))},[demo]);return <section className="pf-infra"><h3>ქულების წესები</h3><form onSubmit={async e=>{e.preventDefault();try{await setDoc(doc(db,'pf_settings','rewards'),{referralPoints:value.referralPoints,voucherPoints:value.voucherPoints,voucherValue:value.voucherValue,updatedBy:userId,updatedAt:serverTimestamp()});setStatus('შენახულია')}catch{setStatus('შენახვა ვერ მოხერხდა')}}}>{[['referralPoints','აქტიური მოწვევის ქულები'],['voucherPoints','ვაუჩერის ქულების ფასი'],['voucherValue','ვაუჩერის მაქსიმალური ღირებულება ₾']].map(([key,label])=><label className="pf-infra-field" key={key}>{label}<input type="number" required min="1" max="1000000" step="1" value={value[key]} onChange={e=>setValue((v:any)=>({...v,[key]:Number(e.target.value)}))}/></label>)}<button className="primary" disabled={demo}>შენახვა</button><p role="status">{status}</p></form></section>}

import {useEffect,useMemo,useState} from 'react';
import {Store,Wrench,Truck,Coins,Gift,Tag,CalendarDays,Plus,MoreVertical,PenLine,Power,Info,CheckCircle2,Clock3,Search,History,Save,RotateCcw} from 'lucide-react';
import './package-manager.css';

type Kind='parts_shop'|'auto_service'|'tow_driver';
type Row=Record<string,any>;
const kinds:{id:Kind;name:string;single:string;icon:any}[]=[
 {id:'parts_shop',name:'მაღაზიები',single:'ავტომაღაზია',icon:Store},
 {id:'auto_service',name:'ავტოსერვისები',single:'ავტოსერვისი',icon:Wrench},
 {id:'tow_driver',name:'ევაკუატორები',single:'ევაკუატორი',icon:Truck}
];
const initial=()=>({name:'',description:'',monthlyPriceGEL:100,trialDays:30,graceDays:5,maxServices:10,maxStaff:5,allowCustomPrice:false,active:true});
const legacyType=(p:Row):Kind=>p.packageType||(String(p.name||'').toLowerCase().includes('ევაკუატ')?'tow_driver':String(p.name||'').toLowerCase().includes('მაღაზი')?'parts_shop':'auto_service');
const number=(n:any,defaultValue:number)=>Number.isFinite(Number(n))?Number(n):defaultValue;
const dateText=(v:any)=>{try{const d=v?.toDate?.()||new Date(v?.seconds? v.seconds*1000:v);return Number.isFinite(d.getTime())?d.toLocaleString('ka-GE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}catch{return '—'}};
const coin=(v:any)=>new Intl.NumberFormat('ka-GE',{maximumFractionDigits:2}).format(number(v,0))+' ₾';
const statusName=(x:string)=>({approved:'დამტკიცებული',pending:'მოლოდინში',pending_approval:'მოლოდინში',suspended:'შეჩერებული',rejected:'უარყოფილი'} as Row)[x]||x||'—';

export function PackageManager({packages=[],audit=[],shops=[],drivers=[],act,busy=false,demo=false,actor}:{
 packages:Row[];audit:Row[];shops:Row[];drivers:Row[];
 act:(d:Row)=>Promise<boolean>;busy?:boolean;demo?:boolean;actor?:Row
}){
 const [kind,setKind]=useState<Kind>('tow_driver');
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState(initial);
 const [target,setTarget]=useState('');
 const [selected,setSelected]=useState('');
 const [expiresAt,setExpiresAt]=useState('');
 const [override,setOverride]=useState('');
 const [search,setSearch]=useState('');
 const [message,setMessage]=useState('');
 const currentKind=kinds.find(k=>k.id===kind)!;
 const plans=useMemo(()=>packages.filter(p=>legacyType(p)===kind),[packages,kind]);
 const recipients=useMemo<Row[]>(()=>kind==='tow_driver'?drivers.map((d:Row):Row=>({...d,targetType:'tow_driver'})):shops.filter((s:Row)=>(s.businessType||'parts_shop')===kind).map((s:Row):Row=>({...s,targetType:'shop'})),[kind,shops,drivers]);
 const filteredRecipients=recipients.filter(r=>[r.name,r.city,r.phone].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
 const choices=plans.filter(p=>p.active!==false);
 const current=packages.find(p=>p.id===editing);
 const selectedPlan=choices.find(p=>p.id===selected);
 const preview={...form,packageType:kind};
 const update=(field:string,value:any)=>setForm(f=>({...f,[field]:value}));
 useEffect(()=>{setEditing(null);setForm(initial());setTarget('');setSelected('');setExpiresAt('');setOverride('');setSearch('');setMessage('')},[kind]);
 const reset=()=>{setEditing(null);setForm(initial());setMessage('')};
 const edit=(p:Row)=>{setEditing(p.id);setForm({name:p.name||'',description:p.description||'',monthlyPriceGEL:number(p.monthlyPriceGEL,100),trialDays:number(p.trialDays,30),graceDays:number(p.graceDays,5),maxServices:number(p.maxServices,10),maxStaff:number(p.maxStaff,5),allowCustomPrice:p.allowCustomPrice===true,active:p.active!==false});setMessage('');document.getElementById('pfp-editor')?.scrollIntoView({behavior:'smooth',block:'start'})};
 const save=async(e:React.FormEvent)=>{e.preventDefault();setMessage('');const payload:Row={action:editing?'packageUpdate':'packageCreate',...(editing?{id:editing}:{}),...form,packageType:kind};if(await act(payload)){reset();setMessage(editing?'პაკეტი განახლებულია.':'პაკეტი შეიქმნა.')}};
 const toggle=async(p:Row)=>{setMessage('');await act({action:'packageUpdate',id:p.id,active:p.active===false})};
 const assign=async(e:React.FormEvent)=>{e.preventDefault();setMessage('');const chosen=recipients.find(r=>r.id===target);if(!chosen||!selectedPlan){setMessage('აირჩიე ბიზნესი და აქტიური პაკეტი.');return}if(override!==''&&!selectedPlan.allowCustomPrice){setMessage('ამ პაკეტს ინდივიდუალური ტარიფი გამორთული აქვს.');return}if(await act({action:'packageAssign',targetType:chosen.targetType,id:chosen.id,packageId:selectedPlan.id,expiresAt:expiresAt||null,priceOverride:override===''?null:Number(override)})){setMessage('პაკეტი მინიჭებულია: '+chosen.name);setOverride('');setExpiresAt('')}};
 const actionLabels:Row={create:'პაკეტის შექმნა',update:'პაკეტის რედაქტირება',assign:'პაკეტის მინიჭება'};
 const targets=[...shops,...drivers];
 const history=[...audit].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,50);
 return <div className="pfp" id="pfp">
  <div className="pfp-heading"><div><h1>პაკეტები და ტარიფები</h1><p>ბიზნესების ტარიფების მართვა, პაკეტების შექმნა და მინიჭება.</p></div></div>
  <div className="pfp-tabs" role="tablist" aria-label="ბიზნესის ტიპი">{kinds.map(k=><button key={k.id} role="tab" aria-selected={kind===k.id} className={kind===k.id?'selected':''} onClick={()=>setKind(k.id)}><k.icon size={21}/>{k.name}</button>)}</div>
  <div className="pfp-stats">
   <article><span className="pfp-stat-icon"><Coins size={22}/></span><div><strong>{coin(100)} / თვე</strong><small>სტანდარტული საბაზისო ტარიფი</small></div></article>
   <article><span className="pfp-stat-icon"><Gift size={22}/></span><div><strong>პირველი თვე უფასო</strong><small>ახალი ბიზნესებისთვის</small></div></article>
   <article><span className="pfp-stat-icon"><Tag size={22}/></span><div><strong>ინდივიდუალური ტარიფი</strong><small>შესაძლებელია ხელით მინიჭება</small></div></article>
   <article><span className="pfp-stat-icon"><CalendarDays size={22}/></span><div><strong>5-დღიანი საშეღავათო ვადა</strong><small>გადახდის ვადის გასვლის შემდეგ</small></div></article>
  </div>
  <div className="pfp-top">
   <section className="pfp-panel" id="pfp-editor">
    <div className="pfp-title"><h2>{editing?'პაკეტის რედაქტირება':'პაკეტის შექმნა / რედაქტირება'}</h2>{editing&&<button type="button" className="pfp-textbutton" onClick={reset}><RotateCcw size={15}/> ახალი პაკეტი</button>}</div>
    <form onSubmit={save} className="pfp-form">
     <label>პაკეტის სახელი *<input value={form.name} onChange={e=>update('name',e.target.value)} required maxLength={100} placeholder={currentKind.single+' სტანდარტი'}/></label>
     <label>აღწერა<input value={form.description} onChange={e=>update('description',e.target.value)} maxLength={500} placeholder="მოკლე აღწერა"/></label>
     <label>თვიური ფასი (₾)<input value={form.monthlyPriceGEL} onChange={e=>update('monthlyPriceGEL',e.target.value)} type="number" min="0" max="1000000" step="0.01" required/></label>
     <label>საცდელი პერიოდი (დღე)<input value={form.trialDays} onChange={e=>update('trialDays',e.target.value)} type="number" min="0" max="3650" step="1" required/></label>
     <label>გრეის პერიოდი (დღე)<input value={form.graceDays} onChange={e=>update('graceDays',e.target.value)} type="number" min="0" max="60" step="1" required/></label>
     {kind==='auto_service'&&<><label>მაქს. სერვისები<input value={form.maxServices} onChange={e=>update('maxServices',e.target.value)} type="number" min="1" max="10000" required/></label><label>მაქს. ხელოსნები<input value={form.maxStaff} onChange={e=>update('maxStaff',e.target.value)} type="number" min="1" max="10000" required/></label></>}
     <label className="pfp-switchline"><span>ინდივიდუალური ტარიფის დაშვება</span><input type="checkbox" role="switch" checked={form.allowCustomPrice} onChange={e=>update('allowCustomPrice',e.target.checked)}/></label>
     <label className="pfp-switchline"><span>პაკეტი აქტიურია</span><input type="checkbox" role="switch" checked={form.active} onChange={e=>update('active',e.target.checked)}/></label>
     <div className="pfp-buttons"><button className="pfp-save" disabled={busy||demo}><Save size={17}/>{editing?'ცვლილებების შენახვა':'პაკეტის შექმნა'}</button><button type="button" className="pfp-cancel" onClick={reset}>გასუფთავება</button></div>
    </form>
   </section>
   <aside className="pfp-panel pfp-preview"><h2>პაკეტის წინასწარი ნახვა</h2><div className="pfp-preview-banner"><currentKind.icon size={25}/><strong>{preview.name||currentKind.single+' სტანდარტი'}</strong></div><ul><li>ბიზნესის ტიპი: <b>{currentKind.name}</b></li><li>თვიური ფასი: <b>{coin(form.monthlyPriceGEL)}</b></li><li>საცდელი პერიოდი: <b>{form.trialDays} დღე</b></li><li>გრეის პერიოდი: <b>{form.graceDays} დღე</b></li>{kind==='auto_service'&&<><li>სერვისები: <b>{form.maxServices}</b></li><li>ხელოსნები: <b>{form.maxStaff}</b></li></>}<li>სტატუსი: <b>{form.active?'აქტიური':'გამორთული'}</b></li></ul><p className="pfp-info"><Info size={19}/>ეს გვერდი ტარიფებსა და მინიჭებას მართავს. ავტომატური ჩამოჭრა და ბილინგი ჯერ დაკავშირებული არ არის.</p></aside>
  </div>
  <section className="pfp-panel"><div className="pfp-title"><h2>არსებული პაკეტები</h2><small>{plans.length} პაკეტი</small></div><div className="pfp-plans">{plans.length?plans.map(p=><article className={'pfp-plan'+(editing===p.id?' is-editing':'')} key={p.id}><div className="pfp-plan-head"><span className="pfp-plan-icon"><currentKind.icon size={20}/></span><strong>{p.name}</strong><details className="pfp-options"><summary aria-label={p.name+' მოქმედებები'}><MoreVertical size={18}/></summary><div><button type="button" onClick={e=>{edit(p);e.currentTarget.closest('details')?.removeAttribute('open')}}><PenLine size={15}/> რედაქტირება</button><button type="button" disabled={busy||demo} onClick={e=>{void toggle(p);e.currentTarget.closest('details')?.removeAttribute('open')}}><Power size={15}/>{p.active===false?'ჩართვა':'გამორთვა'}</button></div></details></div>{p.description&&<p className="pfp-plan-description">{p.description}</p>}<div className="pfp-plan-values"><span><small>ფასი</small><b>{coin(p.monthlyPriceGEL===undefined?100:p.monthlyPriceGEL)}</b></span><span><small>საცდელი</small><b>{number(p.trialDays,0)} დღე</b></span><span><small>გრეისი</small><b>{number(p.graceDays,5)} დღე</b></span><span><small>სტატუსი</small><b className={p.active===false?'pfp-inactive':'pfp-active'}>{p.active===false?'გამორთული':'აქტიური'}</b></span></div></article>):<div className="pfp-empty"><Plus size={20}/>ამ კატეგორიაში პაკეტი ჯერ არ არის. შექმენი ზემოთ მოცემული ფორმით.</div>}</div></section>
  <section className="pfp-panel"><div className="pfp-title"><h2>პაკეტის მინიჭება</h2><small>{currentKind.name}</small></div><form className="pfp-assign" onSubmit={assign}>
   <label>ბიზნესი / მძღოლი<div className="pfp-search"><Search size={15}/><input aria-label="ბიზნესის ძებნა" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ძებნა სახელით ან ქალაქით"/></div><select value={target} onChange={e=>setTarget(e.target.value)} required><option value="">აირჩიე {currentKind.single}</option>{filteredRecipients.map(r=><option key={r.id} value={r.id}>{r.name} · {r.city} · {statusName(r.status)}</option>)}</select></label>
   <label>პაკეტი<select value={selected} onChange={e=>{setSelected(e.target.value);setOverride('')}} required><option value="">აირჩიე პაკეტი</option>{choices.map(p=><option value={p.id} key={p.id}>{p.name} · {coin(p.monthlyPriceGEL===undefined?100:p.monthlyPriceGEL)}</option>)}</select></label>
   <label>ვადის თარიღი<input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/><small>ცარიელი = პაკეტის საცდელი პერიოდი</small></label>
   <label>ინდივიდუალური ფასი (₾)<input type="number" min="0" max="1000000" step="0.01" value={override} onChange={e=>setOverride(e.target.value)} placeholder="სტანდარტული" disabled={!selectedPlan?.allowCustomPrice}/></label>
   <button className="pfp-save" disabled={busy||demo||!target||!selected}><CheckCircle2 size={17}/> მინიჭება</button>
  </form>{message&&<p role="status" className="pfp-message">{message}</p>}
  </section>
  <section className="pfp-panel"><div className="pfp-title"><h2>ცვლილებების ისტორია</h2><History size={19}/></div><div className="pfp-history-scroll"><table className="pfp-history"><thead><tr><th>მოქმედება</th><th>ობიექტი</th><th>შემსრულებელი</th><th>თარიღი</th></tr></thead><tbody>{history.length?history.map(a=>{const p=packages.find(p=>p.id===a.targetId),t=targets.find(t=>t.id===a.targetId);const matched=packages.find(p=>p.id===a.details?.packageId);return <tr key={a.id}><td>{actionLabels[a.action]||a.action}</td><td title={a.targetId}>{p?.name||t?.name||a.details?.name||a.targetId}{matched&&<small> · {matched.name}</small>}</td><td title={a.actorId}>{a.actorId===actor?.id?(actor.email||actor.name||'სუპერადმინი'):a.actorId===undefined?'—':a.actorId.length>22?a.actorId.slice(0,12)+'…':a.actorId}</td><td>{dateText(a.createdAt)}</td></tr>}):<tr><td colSpan={4} className="pfp-empty">ცვლილებების ისტორია ჯერ ცარიელია.</td></tr>}</tbody></table></div></section>
 </div>;
}

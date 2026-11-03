import {useEffect,useMemo,useRef,useState} from 'react';
import type {FormEvent,ReactNode} from 'react';
import {addDoc,collection,doc,getDocs,limit,orderBy,onSnapshot,query,serverTimestamp,setDoc,updateDoc,where} from 'firebase/firestore';
import {ArrowLeft,Check,CheckCheck,ChevronRight,ClipboardList,Clock3,Headset,Image as PhotoIcon,LockKeyhole,MessageCircle,Package,Search,Send,ShieldCheck,ShoppingBag,UserRound,Wrench,X} from 'lucide-react';
import {db} from './firebase';
import {chatClosed,joinChat,markChatRead,writeChatMessage} from './chat-workflow.mjs';
import './admin-messenger.css';
type Row=Record<string,any>;
type Screen='inbox'|'thread'|'info';
const ts=(x:any):number=>x?.toMillis?.()||x?.toDate?.()?.getTime?.()||(typeof x==='string'?Date.parse(x)||0:0);
const time=(x:any)=>ts(x)?new Date(ts(x)).toLocaleTimeString('ka-GE',{hour:'2-digit',minute:'2-digit'}):'—';
const money=(x:any)=>Number.isFinite(Number(x))?new Intl.NumberFormat('ka-GE').format(Number(x))+' ₾':'—';
const short=(x:any)=>String(x||'').slice(0,8);
function useRows(path:string,filters:any[],key:string,enabled=true){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
 useEffect(()=>{setRows([]);setError('');if(!enabled)return;return onSnapshot(query(collection(db,path),...filters),snap=>{setRows(snap.docs.map(d=>({...d.data(),id:d.id})));setError('')},err=>setError(err.message))},[path,key,enabled]);
 return {rows,error};
}
function useSingle(path:string,key:string,enabled=true){
 const [value,setValue]=useState<Row|null>(null),[error,setError]=useState('');
 useEffect(()=>{setValue(null);setError('');if(!enabled)return;return onSnapshot(doc(db,path),s=>{setValue(s.exists()?{...s.data(),id:s.id}:null);setError('')},err=>setError(err.message))},[path,key,enabled]);
 return {value,error};
}
function Avatar({kind='shop',name='მ'}:{kind?:string,name?:string}){
 const Icon=kind==='shop'?ShoppingBag:kind==='driver'?Wrench:kind==='service'?Wrench:UserRound;
 return <span className={'pfm-avatar pfm-avatar-'+kind} aria-hidden="true"><Icon size={20}/></span>;
}
function MessengerFrame({title,eyebrow,count,screen,setScreen,inbox,thread,info}:{title:string,eyebrow:string,count:number,screen:Screen,setScreen:(s:Screen)=>void,inbox:ReactNode,thread:ReactNode,info:ReactNode}){
 return <section className={'pfm pfm-screen-'+screen} aria-label={title}>
  <div className="pfm-heading"><div><span className="pfm-eyebrow">{eyebrow}</span><h2>{title}</h2><p>{count} საუბარი · ერთიანი სამუშაო სივრცე</p></div><span className="pfm-live"><i/> LIVE</span></div>
  <div className="pfm-shell">
   <aside className="pfm-inbox" aria-label={title+' — საუბრები'}>{inbox}</aside>
   <section className="pfm-thread" aria-label="გახსნილი საუბარი">{thread}</section>
   <aside className="pfm-info" aria-label="საუბრის დეტალები">{info}</aside>
  </div>
  <nav className="pfm-mobile-nav" aria-label="ჩატის ნავიგაცია"><button className={screen==='inbox'?'active':''} onClick={()=>setScreen('inbox')}><MessageCircle size={18}/>საუბრები</button><button className={screen==='thread'?'active':''} onClick={()=>setScreen('thread')}><Send size={18}/>მიმოწერა</button><button className={screen==='info'?'active':''} onClick={()=>setScreen('info')}><ClipboardList size={18}/>დეტალები</button></nav>
 </section>;
}
function InboxHead({title,subtitle,search,setSearch,filters,filter,setFilter}:{title:string,subtitle:string,search:string,setSearch:(v:string)=>void,filters:[string,string][],filter:string,setFilter:(v:string)=>void}){
 return <div className="pfm-inbox-head"><span className="pfm-kicker">{subtitle}</span><h3>{title}</h3><label className="pfm-search"><Search size={18}/><input aria-label="საუბრების ძებნა" value={search} onChange={e=>setSearch(e.target.value)} placeholder="მოძებნე საუბარი..."/></label><div className="pfm-filters">{filters.map(([key,name])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{name}</button>)}</div></div>;
}
function Empty({message}:{message:string}){return <div className="pfm-empty"><MessageCircle size={32}/><p>{message}</p></div>}
function MessageComposer({value,setValue,send,disabled,placeholder='შეტყობინება...',note}:{value:string,setValue:(v:string)=>void,send:(e:FormEvent)=>void,disabled?:boolean,placeholder?:string,note?:string}){
 return <div className="pfm-compose">{note&&<small>{note}</small>}<form onSubmit={send}><textarea rows={1} maxLength={2000} aria-label="შეტყობინება" placeholder={placeholder} value={value} disabled={disabled} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(value.trim()&&!disabled)e.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={disabled||!value.trim()} aria-label="შეტყობინების გაგზავნა"><Send size={19}/></button></form></div>;
}
export function AdminMessenger({mode,data,uid,targetOfferId}:{mode:'chat'|'support',data:Row,uid:string,targetOfferId?:string}){
 return mode==='chat'?<AdminBusinessMessages data={data} uid={uid} targetOfferId={targetOfferId}/>:<AdminSupportMessages uid={uid}/>;
}
function AdminBusinessMessages({data,uid,targetOfferId}:{data:Row,uid:string,targetOfferId?:string}){
 const [selected,setSelected]=useState(targetOfferId||''),[screen,setScreen]=useState<Screen>('inbox'),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[draft,setDraft]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[photo,setPhoto]=useState('');
 const activity=useRows('pf_chat_activity',[orderBy('updatedAt','desc'),limit(300)],'activity');
 const confirmations=useRows('pf_confirmations',[orderBy('updatedAt','desc'),limit(300)],'confirmations');
 const reads=useRows('pf_chat_reads/'+uid+'/threads',[],uid);
 const requests:Row[]=data.requests||[],offers:Row[]=data.offers||[];
 const requestById=useMemo(()=>new Map(requests.map(r=>[r.id,r])),[requests]);
 const summaries=useMemo(()=>new Map(activity.rows.map(r=>[r.offerId,r])),[activity.rows]);
 const cards=useMemo(()=>new Map(confirmations.rows.map(r=>[r.offerId,r])),[confirmations.rows]);
 const seen=useMemo(()=>new Map(reads.rows.map(r=>[r.id,Number(r.version||0)])),[reads.rows]);
 const conversations=offers.filter(o=>requestById.has(o.requestId)).sort((a,b)=>Math.max(ts(summaries.get(b.id)?.updatedAt),ts(b.createdAt))-Math.max(ts(summaries.get(a.id)?.updatedAt),ts(a.createdAt)));
 useEffect(()=>{if(targetOfferId&&offers.some(o=>o.id===targetOfferId)){setSelected(targetOfferId);setScreen('thread')}},[targetOfferId,offers]);
 const offer=offers.find(o=>o.id===selected),request=requestById.get(offer?.requestId),summary=summaries.get(selected),card=cards.get(selected),closed=chatClosed(request,selected);
 const joined=useSingle('pf_chat_admins/'+selected+'_'+uid,selected+uid,!!offer);
 const messages=useRows('pf_messages',[where('offerId','==',selected),orderBy('createdAt','desc'),limit(100)],'messages:'+selected,!!offer);
 const log=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages.rows,selected,screen]);
 useEffect(()=>{if(!selected||screen!=='thread'||!summary?.version||Number(seen.get(selected)||0)>=summary.version)return;void markChatRead(db,uid,selected,summary.version).catch(()=>{})},[selected,screen,summary?.version,reads.rows,uid]);
 const unread=(o:Row)=>{const a=summaries.get(o.id);return a&&a.lastSenderId!==uid?Math.max(0,Number(a.version||0)-Number(seen.get(o.id)||0)):0};
 const filtered=conversations.filter(o=>{const r=requestById.get(o.requestId),text=[o.shopName,r?.brand,r?.model,r?.part,r?.id].join(' ').toLocaleLowerCase('ka');return text.includes(search.trim().toLocaleLowerCase('ka'))&&(filter==='all'||filter==='unread'&&unread(o)>0||filter==='active'&&!chatClosed(r,o.id))});
 const choose=(id:string)=>{setSelected(id);setDraft('');setError('');setScreen('thread')};
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e:any){setError(e.message||'მოქმედება ვერ შესრულდა')}finally{setBusy(false)}}
 const send=(e:FormEvent)=>{e.preventDefault();const value=draft.trim();if(!value||!offer||!joined.value||closed||busy)return;void perform(async()=>{await writeChatMessage(db,uid,offer.id,value,{admin:true});setDraft('')})};
 const related=offers.filter(o=>o.requestId===offer?.requestId).sort((a,b)=>Number(a.price||0)-Number(b.price||0));
 const photos:Array<string>=Array.isArray(request?.photos)?request.photos.filter((p:any)=>typeof p==='string'&&(p.startsWith('https://')||p.startsWith('data:image/'))).slice(0,6):[];
 const renderedMessages=[...messages.rows].reverse();
 return <MessengerFrame title="ჩატი" eyebrow="PARTFLOW / ADMIN / MESSAGES" count={conversations.length} screen={screen} setScreen={setScreen}
 inbox={<><InboxHead title="ჩატები" subtitle="მაღაზიებისა და მომხმარებლების მიმოწერები" search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} filters={[[ 'all','ყველა'],['unread','წაუკითხავი'],['active','აქტიური']]}/><div className="pfm-inbox-label">ბოლო საუბრები</div><div className="pfm-items">{filtered.map(o=>{const r=requestById.get(o.requestId),a=summaries.get(o.id),count=unread(o);return <button key={o.id} className={'pfm-item'+(selected===o.id?' selected':'')} onClick={()=>choose(o.id)}><Avatar name={o.shopName} kind="shop"/><span className="pfm-item-main"><strong>{o.shopName||'ავტომაღაზია'}</strong><small>{a?.lastText||r?.part||'შეთავაზება'}</small><em>{r?.brand} {r?.model} · {r?.part}</em></span><span className="pfm-item-side"><time>{time(a?.updatedAt||o.createdAt)}</time>{count>0?<b>{count>99?'99+':count}</b>:<CheckCheck size={15}/>}</span></button>})}{!filtered.length&&<Empty message="ამ ფილტრით საუბრები ვერ მოიძებნა"/>}</div><div className="pfm-inbox-foot"><LockKeyhole size={15}/> მიმოწერები მხოლოდ უფლებამოსილი პირებისთვისაა</div></>}
 thread={offer&&request?<><div className="pfm-thread-head"><button className="pfm-back" onClick={()=>setScreen('inbox')} aria-label="საუბრებში დაბრუნება"><ArrowLeft size={20}/></button><Avatar name={offer.shopName} kind="shop"/><div className="pfm-person"><strong>{offer.shopName||'მაღაზია'}</strong><small>{closed?'დახურული საუბარი':'მოთხოვნა #'+short(request.id)}</small></div><button className="pfm-detail-button" aria-label="დეტალების ნახვა" onClick={()=>setScreen('info')}><ClipboardList size={19}/></button></div>
  <button className="pfm-request-strip" onClick={()=>setScreen('info')}><span className="pfm-car"><Package size={22}/></span><span><strong>{request.brand} {request.model} · {request.year||'—'}</strong><small>{request.part}</small></span><ChevronRight size={18}/></button>
  <div className="pfm-messages" ref={log} role="log" aria-label="მიმოწერის ისტორია">{messages.error&&<p className="pfm-error">{messages.error}</p>}{!renderedMessages.length&&<Empty message="ამ საუბარში შეტყობინებები ჯერ არ არის"/>}{renderedMessages.map(m=>m.kind==='admin_join'?<div className="pfm-system" key={m.id}><ShieldCheck size={15}/>{m.senderName||'ადმინისტრატორი'} ჩატში შემოუერთდა</div>:<div className={'pfm-bubble'+(m.senderId===uid?' mine':'')} key={m.id}>{m.kind==='admin'&&<small className="pfm-admin-label">{m.senderName||'ადმინისტრატორი'} · ადმინისტრატორი</small>}<p>{m.text}</p><time>{time(m.createdAt)}{m.senderId===uid?' ✓':''}</time></div>)}
  {card&&<div className="pfm-quote"><div className="pfm-quote-title"><Package size={18}/><strong>შეთანხმებული პირობები</strong><span>{card.status==='accepted'?'დადასტურებული':card.status==='pending'?'მოლოდინში':'დასრულებული'}</span></div><h4>{request.part}</h4><b>{money(card.price)}</b>{card.serviceAvailable&&<p>მომსახურება: {money(card.servicePrice)}</p>}<p>{card.condition} · {card.delivery}</p><small>ადმინისტრატორი არ ირჩევს შეთავაზებას.</small></div>}
  {photos.length>0&&<div className="pfm-photos"><small>მოთხოვნაზე დართული ფოტოები</small><div>{photos.map((p,i)=><button key={i} aria-label={'ფოტოს გახსნა '+(i+1)} onClick={()=>setPhoto(p)}><img src={p} alt={'ფოტო '+(i+1)}/></button>)}</div></div>}
  </div>
  {(error||joined.error)&&<p className="pfm-error" role="alert">{error||joined.error}</p>}
  {closed?<div className="pfm-locked"><LockKeyhole size={17}/> საუბარი დახურულია. ისტორია შენარჩუნებულია.</div>:!joined.value?<div className="pfm-compose"><button className="pfm-join" onClick={()=>void perform(()=>joinChat(db,uid,offer.id))} disabled={busy}><ShieldCheck size={18}/> ჩატში შეერთება ადმინისტრატორად</button><small>შეერთებისას ორივე მხარე დაინახავს ადმინისტრატორს.</small></div>:<MessageComposer value={draft} setValue={setDraft} send={send} disabled={busy} note="წერ როგორც ადმინისტრატორი"/>}
 </>:<Empty message="აირჩიე საუბარი მარცხენა სიიდან"/>}
 info={request?<><div className="pfm-info-head"><h3>მოთხოვნის დეტალები</h3><button onClick={()=>setScreen('thread')} aria-label="დახურვა"><X size={19}/></button></div><div className="pfm-info-body"><span className="pfm-info-icon"><Package size={30}/></span><span className="pfm-kicker">მიმდინარე მოთხოვნა</span><h3>{request.brand} {request.model}</h3><p>{request.part}</p><dl className="pfm-facts"><div><dt>მოთხოვნა</dt><dd>#{short(request.id)}</dd></div><div><dt>ქალაქი</dt><dd>{request.city||'—'}</dd></div><div><dt>სტატუსი</dt><dd>{request.acceptedOfferId?'არჩეულია':request.status==='open'?'აქტიური':request.status||'—'}</dd></div><div><dt>შეთავაზებები</dt><dd>{related.length}</dd></div></dl><h4>შეთავაზებების შედარება</h4><div className="pfm-offers">{related.map(o=><button key={o.id} className={selected===o.id?'chosen':''} onClick={()=>choose(o.id)}><span><strong>{o.shopName||'მაღაზია'}</strong><small>{o.condition||'ნაწილი'} {request.acceptedOfferId===o.id?'· ✓ არჩეული':''}</small></span><b>{money(o.price)}</b></button>)}</div><h4>მოთხოვნის მიმდინარეობა</h4><ol className="pfm-timeline"><li className="done">მოთხოვნა შეიქმნა</li><li className={related.length?'done':''}>შეთავაზებები მიღებულია ({related.length})</li><li className={request.acceptedOfferId?'done':''}>შეთავაზება {request.acceptedOfferId?'არჩეულია':'ასარჩევია'}</li><li className={request.status==='closed'?'done':''}>მოთხოვნა დასრულდა</li></ol><p className="pfm-note">ადმინისტრატორი საუბარს აკონტროლებს, მაგრამ შეთავაზების არჩევას მომხმარებელი აკეთებს.</p></div></>:<Empty message="მოთხოვნის დეტალები გამოჩნდება საუბრის არჩევისას"/>}
 />;
}
type Contact={id:string,ownerId:string,kind:string,name:string};
const kindName=(k:string)=>k==='shop'?'მაღაზია':k==='driver'?'ევაკუატორი':'მომხმარებელი';
function AdminSupportMessages({uid}:{uid:string}){
 const threads=useRows('pf_support_threads',[orderBy('updatedAt','desc'),limit(200)],'support');
 const [selected,setSelected]=useState(''),[screen,setScreen]=useState<Screen>('inbox'),[search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[people,setPeople]=useState<Contact[]>([]),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const thread=useSingle('pf_support_threads/'+selected,selected,!!selected);
 const messages=useRows('pf_support_threads/'+selected+'/messages',[orderBy('createdAt','desc'),limit(100)],'supportMessages:'+selected,!!thread.value&&!!selected);
 const log=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages.rows,selected,screen]);
 useEffect(()=>{if(!search.trim()){setPeople([]);return}let cancelled=false;const sources:[string,string][]=[['pf_members','customer'],['pf_shops','shop'],['pf_tow_drivers','driver']];void Promise.allSettled(sources.map(async([collectionName,kind])=>{const snap=await getDocs(query(collection(db,collectionName),limit(500)));return snap.docs.filter(d=>kind!=='customer'||!['admin','superadmin'].includes(d.data().role)).map(d=>({id:kind==='customer'?d.id:kind==='shop'?'shop_'+(d.data().ownerId||d.id):'driver_'+d.id,ownerId:kind==='shop'?(d.data().ownerId||d.id):d.id,kind,name:d.data().name||d.id}))})).then(results=>{if(cancelled)return;setPeople([...new Map(results.flatMap(r=>r.status==='fulfilled'?r.value:[]).map(p=>[p.id,p])).values()]);if(results.every(r=>r.status==='rejected'))setError('ადრესატების ძებნაზე წვდომა შეზღუდულია')});return()=>{cancelled=true}},[search]);
 const q=search.toLocaleLowerCase('ka').trim();
 const filtered=threads.rows.filter(t=>(filter==='all'||filter==='open'&&t.status==='open'||filter==='closed'&&t.status!=='open')&&([t.name,t.ownerId,t.id,kindName(t.kind)].join(' ').toLocaleLowerCase('ka').includes(q)));
 const extra=people.filter(p=>p.id!==selected&&!threads.rows.some(t=>t.id===p.id)&&[p.name,p.ownerId,kindName(p.kind)].join(' ').toLocaleLowerCase('ka').includes(q)).slice(0,12);
 const candidate=people.find(p=>p.id===selected);
 const label=(t:Row|null)=>t?kindName(t.kind)+' · '+(t.name||t.ownerId):candidate?kindName(candidate.kind)+' · '+candidate.name:'აირჩიე საუბარი';
 const active=thread.value?.status==='open';
 const choose=(id:string)=>{setSelected(id);setDraft('');setError('');setScreen('thread')};
 async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn()}catch(e:any){setError(e.message||'მოქმედება ვერ შესრულდა')}finally{setBusy(false)}}
 const changeSession=(open:boolean)=>void perform(async()=>{const ref=doc(db,'pf_support_threads',selected);if(open&&!thread.value){if(!candidate)throw Error('მოძებნე და აირჩიე ადრესატი');await setDoc(ref,{ownerId:candidate.ownerId,kind:candidate.kind,status:'open',session:1,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})}else if(thread.value){if((open&&active)||(!open&&!active))return;await updateDoc(ref,{status:open?'open':'closed',session:open?Number(thread.value.session||0)+1:Number(thread.value.session||1),updatedAt:serverTimestamp()})}});
 const send=(e:FormEvent)=>{e.preventDefault();const value=draft.trim();if(!value||!active||busy)return;void perform(async()=>{await addDoc(collection(db,'pf_support_threads',selected,'messages'),{senderId:uid,text:value,session:thread.value?.session||1,createdAt:serverTimestamp()});setDraft('')})};
 const rendered=[...messages.rows].reverse();
 return <MessengerFrame title="მხარდაჭერა" eyebrow="PARTFLOW / ADMIN / SUPPORT" count={threads.rows.length} screen={screen} setScreen={setScreen}
 inbox={<><InboxHead title="მხარდაჭერა" subtitle="მომხმარებლები · მაღაზიები · მძღოლები" search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} filters={[[ 'all','ყველა'],['open','აქტიური'],['closed','დასრულებული']]}/><div className="pfm-inbox-label">დახმარების საუბრები</div><div className="pfm-items">{filtered.map(t=><button key={t.id} className={'pfm-item'+(selected===t.id?' selected':'')} onClick={()=>choose(t.id)}><Avatar kind={t.kind==='driver'?'driver':t.kind==='shop'?'shop':'customer'}/><span className="pfm-item-main"><strong>{t.name||t.ownerId||t.id}</strong><small>{kindName(t.kind)} · საუბარი #{t.session||1}</small><em>{t.status==='open'?'აქტიური საუბარი':'დასრულებული საუბარი'}</em></span><span className="pfm-item-side"><time>{time(t.updatedAt)}</time><span className={'pfm-mini-status'+(t.status==='open'?' open':'')}/></span></button>)}{q&&extra.map(p=><button key={p.id} className="pfm-item" onClick={()=>choose(p.id)}><Avatar kind={p.kind==='shop'?'shop':p.kind==='driver'?'driver':'customer'}/><span className="pfm-item-main"><strong>{p.name}</strong><small>{kindName(p.kind)}</small><em>ახალი მხარდაჭერის საუბარი</em></span><ChevronRight size={16}/></button>)}{!filtered.length&&!extra.length&&<Empty message={q?'შედეგი ვერ მოიძებნა':'მხარდაჭერის ისტორია ჯერ ცარიელია'}/>}</div><div className="pfm-inbox-foot"><Headset size={16}/> ყველა სესიის ისტორია შენარჩუნებულია</div></>}
 thread={selected?<><div className="pfm-thread-head"><button className="pfm-back" onClick={()=>setScreen('inbox')} aria-label="საუბრების სიაში დაბრუნება"><ArrowLeft size={20}/></button><Avatar kind={thread.value?.kind==='shop'?'shop':thread.value?.kind==='driver'?'driver':'customer'}/><div className="pfm-person"><strong>{label(thread.value)}</strong><small>{active?'აქტიური მხარდაჭერა':thread.value?'დასრულებული საუბარი':'ახალი საუბარი'}</small></div><button className="pfm-detail-button" onClick={()=>setScreen('info')} aria-label="დეტალების ნახვა"><ClipboardList size={19}/></button></div>
  <div className="pfm-request-strip pfm-support-banner"><span className="pfm-car"><Headset size={23}/></span><span><strong>PARTFLOW მხარდაჭერა</strong><small>{thread.value?'სესია #'+(thread.value.session||1):'ახალი საუბარი'}</small></span><ChevronRight size={18}/></div>
  <div className="pfm-messages" role="log" aria-label="მხარდაჭერის მიმოწერა" ref={log}>{messages.error&&<p role="alert" className="pfm-error">{messages.error}</p>}{!rendered.length&&<Empty message="მიმოწერის ისტორია ცარიელია"/>}{rendered.map((m,i)=><div key={m.id}>{(i===0||rendered[i-1].session!==m.session)&&<div className="pfm-system"><Headset size={14}/>საუბარი #{m.session||1} დაიწყო</div>}<div className={'pfm-bubble'+(m.senderId===uid?' mine':'')}><p>{m.text}</p><time>{time(m.createdAt)}</time></div></div>)}</div>
  {error&&<p className="pfm-error" role="alert">{error}</p>}
  {!active?<div className="pfm-compose"><button className="pfm-join" disabled={busy||(!thread.value&&!candidate)} onClick={()=>changeSession(true)}><Headset size={18}/>{thread.value?'საუბრის განახლება':'ახალი საუბრის დაწყება'}</button></div>:<><div className="pfm-session-bar"><span><i/>საუბარი აქტიურია</span><button onClick={()=>changeSession(false)} disabled={busy}>საუბრის დასრულება</button></div><MessageComposer value={draft} setValue={setDraft} send={send} disabled={busy} note="მხარდაჭერის შეტყობინება — ტექსტური მიმოწერა"/></>}
 </>:<Empty message="აირჩიე საუბარი ან ძებნით მოძებნე ადრესატი"/>}
 info={selected?<><div className="pfm-info-head"><h3>მხარდაჭერის დეტალები</h3><button aria-label="დახურვა" onClick={()=>setScreen('thread')}><X size={19}/></button></div><div className="pfm-info-body"><span className="pfm-info-icon"><Headset size={30}/></span><span className="pfm-kicker">დახმარების ცენტრი</span><h3>{label(thread.value)}</h3><p>{active?'საუბარი მიმდინარეობს':'საუბარი არ არის აქტიური'}</p><dl className="pfm-facts"><div><dt>ტიპი</dt><dd>{kindName(thread.value?.kind||candidate?.kind||'customer')}</dd></div><div><dt>სესია</dt><dd>#{thread.value?.session||1}</dd></div><div><dt>სტატუსი</dt><dd>{active?'აქტიური':'დასრულებული / ახალი'}</dd></div><div><dt>ანგარიშის ID</dt><dd title={thread.value?.ownerId||candidate?.ownerId}>{short(thread.value?.ownerId||candidate?.ownerId)}</dd></div></dl><p className="pfm-note">მხარდაჭერა დამოუკიდებელია ნაწილების შეთავაზებებისა და შეკვეთების ჩატისგან. ძველი სესიების ჩანაწერები არ იშლება.</p></div></>:<Empty message="აირჩიე დახმარების საუბარი"/>}
 />;
}

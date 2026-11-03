import {useEffect,useMemo,useRef,useState} from 'react';
import {collection,doc,onSnapshot,orderBy,query,where,limit} from 'firebase/firestore';
import {ArrowLeft,Check,CheckCheck,ChevronRight,ClipboardList,Clock3,Image as ImageIcon,LockKeyhole,MapPin,MessageCircle,MoreHorizontal,Package,Paperclip,Search,Send,ShieldCheck,ShoppingCart,SlidersHorizontal,UserRound, Wrench, X} from 'lucide-react';
import {db} from './firebase';
import {chatClosed,joinChat,markChatRead,writeChatMessage} from './chat-workflow.mjs';
import './admin-chat-studio.css';

type Row=Record<string,any>;
type View='inbox'|'thread'|'status';
const stamp=(v:any):number=>v?.toMillis?.()||v?.toDate?.()?.getTime?.()||(typeof v==='string'?Date.parse(v):0)||0;
const clock=(v:any)=>stamp(v)?new Date(stamp(v)).toLocaleTimeString('ka-GE',{hour:'2-digit',minute:'2-digit'}):'ახლა';
const cash=(n:any)=>new Intl.NumberFormat('ka-GE',{maximumFractionDigits:2}).format(Number(n)||0)+' ₾';
const iconFor=(kind:string)=>kind==='auto_service'?Wrench:kind==='tow_driver'?MapPin:ShoppingCart;
function listen(path:string,key:string,parts:any[],enabled=true){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
 useEffect(()=>{setRows([]);setError('');if(!enabled)return;return onSnapshot(query(collection(db,path),...parts),s=>{setRows(s.docs.map(d=>({...d.data(),id:d.id})));setError('')},e=>setError(e.message||'მონაცემების წაკითხვა ვერ მოხერხდა'))},[key,enabled]);
 return {rows,error};
}

export function AdminChatStudio({data,uid,targetOfferId}: {data:Row,uid:string,targetOfferId?:string}){
 const [selected,setSelected]=useState(targetOfferId||''),[view,setView]=useState<View>('inbox'),[filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[statusTab,setStatusTab]=useState<'offers'|'details'>('offers'),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[lightbox,setLightbox]=useState(''),[joinOpen,setJoinOpen]=useState(false);
 const activity=listen('pf_chat_activity','activity',[orderBy('updatedAt','desc'),limit(300)]);
 const confirmations=listen('pf_confirmations','confirmations',[orderBy('updatedAt','desc'),limit(300)]);
 const reads=listen('pf_chat_reads/'+uid+'/threads',uid+':reads',[]);
 const offers:Row[]=data.offers||[],requests:Row[]=data.requests||[];
 const reqMap=useMemo(()=>new Map(requests.map(r=>[r.id,r])),[requests]);
 const summary=useMemo(()=>new Map(activity.rows.map(x=>[x.offerId,x])),[activity.rows]);
 const terms=useMemo(()=>new Map(confirmations.rows.map(x=>[x.offerId,x])),[confirmations.rows]);
 const readMap=useMemo(()=>new Map(reads.rows.map(x=>[x.id,Number(x.version||0)])),[reads.rows]);
 const conversations=useMemo(()=>offers.filter(o=>reqMap.has(o.requestId)).slice().sort((a,b)=>Math.max(stamp(summary.get(b.id)?.updatedAt),stamp(b.createdAt))-Math.max(stamp(summary.get(a.id)?.updatedAt),stamp(a.createdAt))),[offers,reqMap,summary]);
 useEffect(()=>{if(targetOfferId&&offers.some(o=>o.id===targetOfferId)){setSelected(targetOfferId);setView('thread')}},[targetOfferId,offers]);
 useEffect(()=>{if(!selected&&conversations.length)setSelected(conversations[0].id)},[selected,conversations]);
 const offer=offers.find(o=>o.id===selected),request=reqMap.get(offer?.requestId);
 const ownActivity=summary.get(selected),ownTerms=terms.get(selected),closed=chatClosed(request,selected);
 const unread=(o:Row)=>{const x=summary.get(o.id);return x?.lastSenderId!==uid&&x?.version>readMap.get(o.id)?Math.max(0,x.version-(readMap.get(o.id)||0)):0};
 const shown=conversations.filter(o=>{
  const r=reqMap.get(o.requestId);const hay=[o.shopName,r?.part,r?.brand,r?.model,r?.id,o.id].join(' ').toLocaleLowerCase('ka');
  if(!hay.includes(search.trim().toLocaleLowerCase('ka')))return false;
  if(filter==='unread')return unread(o)>0;
  if(filter==='active')return !chatClosed(r,o.id);
  if(filter==='offers')return terms.get(o.id)?.status==='pending';
  return true;
 });
 const photos=Array.isArray(request?.photos)?request.photos.filter((s:any)=>typeof s==='string'&&(s.startsWith('data:image/')||s.startsWith('https://'))).slice(0,4):[];
 const [messages,setMessages]=useState<Row[]>([]),[messagesError,setMessagesError]=useState('');
 useEffect(()=>{setMessages([]);setMessagesError('');if(!offer)return;return onSnapshot(query(collection(db,'pf_messages'),where('offerId','==',offer.id),orderBy('createdAt','desc'),limit(80)),s=>setMessages(s.docs.map(d=>({...d.data(),id:d.id})).reverse()),e=>setMessagesError(e.message))},[offer?.id]);
 const [joined,setJoined]=useState(false);
 useEffect(()=>{setJoined(false);if(!offer)return;return onSnapshot(doc(db,'pf_chat_admins',offer.id+'_'+uid),s=>setJoined(s.exists()),e=>setError(e.message))},[offer?.id,uid]);
 useEffect(()=>{if(view!=='thread'||!selected||!ownActivity?.version||readMap.get(selected)>=ownActivity.version)return;void markChatRead(db,uid,selected,ownActivity.version).catch(()=>{})},[view,selected,ownActivity?.version,readMap,uid]);
 const log=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages,selected,view]);
 const choose=(id:string,next:View='thread')=>{setSelected(id);setDraft('');setError('');setView(next)};
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task()}catch(e:any){setError(e.message||'მოქმედება ვერ შესრულდა')}finally{setBusy(false)}};
 const send=async(e:React.FormEvent)=>{e.preventDefault();const value=draft.trim();if(!value||!offer||busy||!joined||closed)return;await run(async()=>{await writeChatMessage(db,uid,offer.id,value,{admin:true});setDraft('')})};
 const selectedRequestOffers=offers.filter(o=>o.requestId===offer?.requestId).sort((a,b)=>Number(a.price||0)-Number(b.price||0));
 const winner=request?.acceptedOfferId;
 const stages=[{title:'მოთხოვნა შეიქმნა',done:!!request,at:request?.createdAt},{title:'შეთავაზებები მიღებულია ('+selectedRequestOffers.length+')',done:selectedRequestOffers.length>0,at:selectedRequestOffers[0]?.createdAt},{title:winner?'შეთავაზება არჩეულია':'შეთავაზების არჩევა',done:!!winner,at:undefined},{title:'მოთხოვნა დასრულდა',done:request?.status==='closed',at:undefined}];
 const Badge=iconFor(offer?.businessType||'');
 return <section className="pf-admin-chat" aria-label="ადმინისტრატორის ჩატი — ახალი ინტერფეისი">
  <header className="pf-admin-chat-top"><div><span className="pf-admin-chat-eyebrow">PARTFLOW / SUPERADMIN</span><h2>ჩატების მართვა <span>· ახალი სივრცე</span></h2><p>ლაივ მიმოწერები, შეთავაზებები და მოთხოვნის ისტორია — ერთ ეკრანზე.</p></div><span className="pf-admin-chat-live"><i/> LIVE</span></header>
  {(activity.error||confirmations.error||reads.error||messagesError||error)&&<p className="pf-admin-chat-error" role="alert">{error||messagesError||activity.error||confirmations.error||reads.error}</p>}
  <nav className="pf-admin-chat-mobile-tabs" aria-label="ჩატის ეკრანი"><button aria-pressed={view==='inbox'} onClick={()=>setView('inbox')}>ჩატები</button><button aria-pressed={view==='thread'} onClick={()=>setView('thread')}>მიმოწერა</button><button aria-pressed={view==='status'} onClick={()=>setView('status')}>სტატუსი</button></nav>
  <div className="pf-admin-chat-columns">
   <aside className={'pf-admin-chat-pane pf-admin-chat-inbox '+(view==='inbox'?'pf-admin-chat-visible':'')} aria-label="ჩატების სია">
    <header className="pf-admin-chat-pane-head"><div className="pf-admin-chat-brand">P<span>ARTFLOW</span></div><span className="pf-admin-chat-head-icon"><MessageCircle size={21}/></span></header>
    <div className="pf-admin-chat-title"><h3>ჩატები</h3><span>{conversations.length} საუბარი</span></div>
    <label className="pf-admin-chat-search"><Search size={19}/><input aria-label="მოძებნე ჩატი" placeholder="ჩატი, მაღაზია ან მოთხოვნა..." value={search} onChange={e=>setSearch(e.target.value)}/><SlidersHorizontal size={17}/></label>
    <div className="pf-admin-chat-filters">{[['all','ყველა'],['unread','წაუკითხავი'],['active','აქტიური'],['offers','შეთავაზებები']].map(([key,label])=><button key={key} type="button" className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}{key==='unread'&&<small>{conversations.filter(o=>unread(o)>0).length}</small>}</button>)}</div>
    <div className="pf-admin-chat-list">{shown.map(o=>{const r=reqMap.get(o.requestId),a=summary.get(o.id),count=unread(o),Icon=iconFor(o.businessType||'');return <button type="button" key={o.id} className={'pf-admin-chat-list-row '+(selected===o.id?'active':'')} onClick={()=>choose(o.id)}><span className="pf-admin-chat-avatar"><Icon size={24}/></span><span className="pf-admin-chat-list-body"><strong>{o.shopName||'მაღაზია'}</strong><small>{a?.lastText||r?.part||'შეთავაზება'}</small><em>{r?.brand} {r?.model} · {cash(o.price)}</em></span><span className="pf-admin-chat-list-meta"><time>{clock(a?.updatedAt||o.createdAt)}</time>{count>0?<b>{count>99?'99+':count}</b>:<CheckCheck size={15}/>}</span></button>})}{!shown.length&&<div className="pf-admin-chat-empty"><MessageCircle/><p>საუბარი ვერ მოიძებნა.</p></div>}</div>
    <footer className="pf-admin-chat-pane-footer"><ShieldCheck size={16}/> ადმინის ხედვა — კერძო მიმოწერები</footer>
   </aside>
   <section className={'pf-admin-chat-pane pf-admin-chat-thread '+(view==='thread'?'pf-admin-chat-visible':'')} aria-label="მიმოწერა">
    {offer&&request?<><header className="pf-admin-chat-thread-head"><button className="pf-admin-chat-back" type="button" aria-label="ჩატების სიაში დაბრუნება" onClick={()=>setView('inbox')}><ArrowLeft size={20}/></button><span className="pf-admin-chat-avatar"><Badge size={24}/></span><div className="pf-admin-chat-person"><strong>{offer.shopName||'მაღაზია'}</strong><small><i/>{closed?'დახურული ჩატი':'აქტიური მიმოწერა'}</small></div><button className="pf-admin-chat-back" type="button" title="სტატუსის ნახვა" onClick={()=>setView('status')}><ClipboardList size={20}/></button></header>
      <div className="pf-admin-chat-car-card"><div className="pf-admin-chat-car-icon">{photos[0]?<img src={photos[0]} alt="მოთხოვნის ფოტო"/>:<Package size={25}/>}</div><div><strong>{request.brand} {request.model} ({request.year||'—'})</strong><small>{request.part}</small></div><ChevronRight size={17}/></div>
      <button type="button" className="pf-admin-chat-context" onClick={()=>setView('status')}><Package size={21}/><span><strong>მოთხოვნა #{request.id.slice(0,8)}</strong><small>{request.part}</small></span><span className="pf-admin-chat-active">{closed?'დახურული':'აქტიური'}</span></button>
      <div className="pf-admin-chat-messages" ref={log} role="log" aria-label="შეტყობინებების ისტორია">{!messages.length&&<div className="pf-admin-chat-empty"><MessageCircle size={27}/><p>შეტყობინებები ჯერ არ არის</p></div>}{messages.map(m=>m.kind==='admin_join'?<div className="pf-admin-chat-system" key={m.id}><ShieldCheck size={15}/> {m.senderName||'ადმინისტრატორი'} შემოუერთდა ჩატს</div>:<article key={m.id} className={'pf-admin-chat-bubble '+(m.senderId===uid?'mine':'')+(m.kind==='admin'?' admin':'')}><span>{m.kind==='admin'?((m.senderName||'ადმინი')+' · ადმინისტრატორი'):m.senderId===offer.ownerId?'მომხმარებელი':m.senderId===offer.shopId?'მაღაზია':''}</span><p>{m.text}</p><time>{clock(m.createdAt)} {m.senderId===uid?'✓':''}</time></article>)}
      {ownTerms&&<div className="pf-admin-chat-quote"><div><Package size={19}/><strong>შეთანხმებული პირობები</strong></div><p>{request.part} · {ownTerms.condition}</p><b>{cash(ownTerms.price)}</b>{ownTerms.serviceAvailable&&<small>მომსახურება: {cash(ownTerms.servicePrice)}</small>}<span className="pf-admin-chat-quote-state">{ownTerms.status==='accepted'?'✓ დადასტურებულია':ownTerms.status==='pending'?'დადასტურების მოლოდინშია':'სტატუსი: '+ownTerms.status}</span><button onClick={()=>setView('status')}>შეთავაზებების ნახვა <ChevronRight size={16}/></button></div>}
      {photos.length>0&&<div className="pf-admin-chat-gallery"><small>მოთხოვნაზე დართული ფოტოები</small><div>{photos.map((p:string,i:number)=><button type="button" key={i} onClick={()=>setLightbox(p)} aria-label={'ფოტოს გახსნა '+(i+1)}><img src={p} alt={'ავტონაწილის ფოტო '+(i+1)}/></button>)}</div></div>}
      </div>
      <div className="pf-admin-chat-compose">{closed?<div className="pf-admin-chat-locked"><LockKeyhole size={18}/> საუბარი დახურულია — ისტორია ხელმისაწვდომია.</div>:!joined?<button type="button" className="pf-admin-chat-join" disabled={busy} onClick={()=>run(async()=>{await joinChat(db,uid,offer.id);setJoinOpen(true)})}><ShieldCheck size={18}/> ჩატში შეერთება ადმინისტრატორად</button>:<form onSubmit={send}><textarea aria-label="შეტყობინება" maxLength={2000} placeholder="ადმინისტრატორის შეტყობინება..." rows={1} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(draft.trim())void send(e as any)}}}/><button type="submit" disabled={busy||!draft.trim()} aria-label="გაგზავნა"><Send size={21}/></button></form>}{!closed&&<small>{joined||joinOpen?'შენ წერ როგორც ადმინისტრატორი':'მონიტორინგის რეჟიმი · შეერთება აღირიცხება ორივე მხარისთვის'}</small>}</div>
     </>:<div className="pf-admin-chat-empty"><MessageCircle size={40}/><h3>აირჩიე საუბარი</h3></div>}
   </section>
   <aside className={'pf-admin-chat-pane pf-admin-chat-status '+(view==='status'?'pf-admin-chat-visible':'')} aria-label="მოთხოვნის სტატუსი და შეთავაზებები">
    <header className="pf-admin-chat-status-head"><button className="pf-admin-chat-back" type="button" onClick={()=>setView('thread')} aria-label="უკან"><ArrowLeft size={20}/></button><div><h3>მოთხოვნის სტატუსი</h3><small>{request?'#'+request.id.slice(0,8):'აირჩიე მოთხოვნა'}</small></div><MoreHorizontal size={20}/></header>
    {request?<><div className="pf-admin-chat-timeline">{stages.map((s,i)=><div key={i} className={'pf-admin-chat-stage '+(s.done?'done':i===2?'current':'')}><span className="pf-admin-chat-stage-icon">{s.done?<Check size={17}/>:<span/>}</span><div><strong>{s.title}</strong>{s.at&&<small>{clock(s.at)}</small>}</div></div>)}</div>
     <div className="pf-admin-chat-status-tabs"><button className={statusTab==='offers'?'active':''} onClick={()=>setStatusTab('offers')}>შეთავაზებები ({selectedRequestOffers.length})</button><button className={statusTab==='details'?'active':''} onClick={()=>setStatusTab('details')}>დეტალები</button></div>
     {statusTab==='offers'?<div className="pf-admin-chat-offer-list">{selectedRequestOffers.map(o=>{const Icon=iconFor(o.businessType||''),picked=o.id===offer?.id,won=o.id===winner;return <button className={'pf-admin-chat-offer '+(picked?'selected':'')} type="button" key={o.id} onClick={()=>choose(o.id,'thread')}><span className="pf-admin-chat-avatar"><Icon size={22}/></span><span><strong>{o.shopName||'მაღაზია'}</strong><small>{o.condition||'ნაწილი'} · {o.delivery||'მიწოდება'}</small>{won&&<em>✓ მომხმარებლის მიერ არჩეული</em>}</span><b>{cash(o.price)}</b><span className="pf-admin-chat-radio">{picked?<Check size={16}/>:null}</span></button>})}{!selectedRequestOffers.length&&<p className="pf-admin-chat-muted">შეთავაზებები ჯერ არ არის.</p>}</div>:<div className="pf-admin-chat-details"><h4>{request.part}</h4><p>ავტომობილი: {request.brand} {request.model}</p><p>წელი: {request.year||'—'}</p><p>ქალაქი: {request.city||'—'}</p><p>მდგომარეობა: {request.condition||'—'}</p><p>სტატუსი: {request.status||'—'}</p></div>}
     <div className="pf-admin-chat-admin-note"><ShieldCheck size={18}/><p>ადმინი შეთავაზებებს ამოწმებს; საბოლოო არჩევანს მხოლოდ მომხმარებელი აკეთებს.</p></div>
     </>:<div className="pf-admin-chat-empty"><ClipboardList size={28}/><p>აირჩიე მოთხოვნა.</p></div>}
   </aside>
  </div>
  {lightbox&&<div className="pf-admin-chat-lightbox" role="dialog" aria-modal="true" aria-label="ფოტოს ნახვა" onClick={()=>setLightbox('')}><button type="button" aria-label="დახურვა" onClick={()=>setLightbox('')}><X/></button><img src={lightbox} alt="მოთხოვნის ფოტო"/></div>}
 </section>;
}

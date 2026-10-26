import {useEffect,useMemo,useRef,useState} from 'react';
import {collection,doc,onSnapshot,query,where,orderBy,limit,getDocs,startAfter,setDoc,serverTimestamp,writeBatch} from 'firebase/firestore';
import {ArrowLeft,ChevronDown,ChevronRight,Package,Send,ShieldCheck,LockKeyhole,ClipboardCheck,CheckCheck,MessageSquare} from 'lucide-react';
import {db} from './firebase';
import {chatClosed,writeChatMessage,joinChat,requestConfirmation,declineConfirmation,markChatRead} from './chat-workflow.mjs';
import {confirmOrder} from './commerce.mjs';
import './chat-workspace.css';
type Row=Record<string,any>;
function useRows(path:string[],filters:any[],key:string){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
 useEffect(()=>{setRows([]);setError('');return onSnapshot(query(collection(db,path[0],...path.slice(1)),...filters),s=>{setRows(s.docs.map(d=>({...d.data(),id:d.id})));setError('')},e=>setError(e.message))},[key]);
 return {rows,error};
}
const millis=(v:any)=>v?.toMillis?.()||(typeof v==='string'?Date.parse(v):0)||0;
const time=(v:any)=>{const d=millis(v);return d?new Date(d).toLocaleString('ka-GE',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'იგზავნება…'};
const money=(v:any)=>new Intl.NumberFormat('ka-GE').format(Number(v))+' ₾';

export function ChatWorkspace({data,uid,admin,targetOfferId,notificationReceipts=[]}:any){
 const isShop=document.documentElement.dataset.role==='shop';
 const scope=admin?[]:[where(isShop?'shopId':'ownerId','==',uid)];
 const activity=useRows(['pf_chat_activity'],[...scope,orderBy('updatedAt','desc'),limit(300)],uid+':'+admin+':'+isShop+':activity');
 const confirmations=useRows(['pf_confirmations'],[...scope,orderBy('updatedAt','desc'),limit(300)],uid+':'+admin+':'+isShop+':confirmations');
 const reads=useRows(['pf_chat_reads',uid,'threads'],[],uid+':reads');
 const [expanded,setExpanded]=useState<Set<string>>(new Set()),[selected,setSelected]=useState(''),[detail,setDetail]=useState(false),[error,setError]=useState('');
 const mobile=document.documentElement.dataset.role==='mobile-customer';
 const [narrow,setNarrow]=useState(()=>mobile||matchMedia('(max-width: 760px)').matches);
 const rows=data.offers||[];
 const summaries=new Map(activity.rows.map(a=>[a.offerId,a])),cards=new Map(confirmations.rows.map(c=>[c.offerId,c])),readVersions=new Map(reads.rows.map(r=>[r.id,r.version]));
 const seenNotifications=new Set(notificationReceipts.map((r:Row)=>r.id));
 const cardReceipt=(c:Row)=>'confirmation_'+c.id+'_'+c.version+'_'+c.status;
 const shouldNotify=(c:Row)=>c&&(c.status==='pending'||c.status==='withdrawn'?c.ownerId===uid:c.shopId===uid);
 const groups=useMemo(()=>data.requests.filter((r:Row)=>rows.some((o:Row)=>o.requestId===r.id)||(!isShop&&!admin&&r.ownerId===uid)).map((r:Row)=>({...r,conversations:rows.filter((o:Row)=>o.requestId===r.id)})).sort((a:Row,b:Row)=>{
  const latest=(r:Row)=>Math.max(millis(r.createdAt),...r.conversations.flatMap((o:Row)=>[millis(activity.rows.find(a=>a.offerId===o.id)?.updatedAt||o.createdAt),millis(confirmations.rows.find(c=>c.offerId===o.id)?.updatedAt)]));
  return latest(b)-latest(a);
 }),[data.requests,rows,activity.rows,confirmations.rows,isShop,admin,uid]);
 useEffect(()=>{const media=matchMedia('(max-width: 760px)'),change=()=>setNarrow(mobile||media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[]);
 useEffect(()=>{if(!selected&&groups.length){const firstGroup=groups.find((g:Row)=>g.conversations.length)||groups[0];setExpanded(new Set([firstGroup.id]));const first=firstGroup.conversations[0];if(first)setSelected(first.id)}},[groups,selected]);
 useEffect(()=>{if(targetOfferId){const o=rows.find((o:Row)=>o.id===targetOfferId);if(o){setSelected(o.id);setExpanded(old=>new Set([...old,o.requestId]));setDetail(true)}}},[targetOfferId,rows]);
 useEffect(()=>{if(selected&&!rows.some((o:Row)=>o.id===selected)){setSelected('');setDetail(false)}},[rows,selected]);
 useEffect(()=>{const back=(e:Event)=>{if(narrow&&detail){e.preventDefault();setDetail(false)}};document.addEventListener('pf-chat-back',back);return()=>document.removeEventListener('pf-chat-back',back)},[narrow,detail]);
 // The bridge-free Android WebView already uses web history for its back key.
 // A same-page entry lets it return from the thread to the list without a new APK.
 useEffect(()=>{
  if(!narrow||!detail)return;
  const marker=crypto.randomUUID();
  history.pushState({...history.state,pfChat:marker},'');
  const pop=(e:PopStateEvent)=>{if(e.state?.pfChat!==marker)setDetail(false)};
  window.addEventListener('popstate',pop);
  return()=>{window.removeEventListener('popstate',pop);if(history.state?.pfChat===marker)history.back()};
 },[narrow,detail]);
 const offer=rows.find((o:Row)=>o.id===selected),request=data.requests.find((r:Row)=>r.id===offer?.requestId),a=summaries.get(selected),selectedCard=cards.get(selected);
 useEffect(()=>{
  if(!selected||narrow&&!detail||seenNotifications.has('offer_'+selected))return;
  if(document.visibilityState==='visible')void setDoc(doc(db,'pf_inbox',uid,'receipts','offer_'+selected),{createdAt:serverTimestamp()}).catch(e=>setError(e.message));
 },[selected,notificationReceipts,narrow,detail,uid]);
 useEffect(()=>{
  if(!selectedCard||narrow&&!detail||!shouldNotify(selectedCard)||seenNotifications.has(cardReceipt(selectedCard)))return;
  const mark=()=>{if(document.visibilityState==='visible')void setDoc(doc(db,'pf_inbox',uid,'receipts',cardReceipt(selectedCard)),{createdAt:serverTimestamp()}).catch(e=>setError(e.message))};
  mark();document.addEventListener('visibilitychange',mark);return()=>document.removeEventListener('visibilitychange',mark);
 },[selected,selectedCard?.version,selectedCard?.status,notificationReceipts,narrow,detail,uid]);
 useEffect(()=>{
  if(!a||!selected||narrow&&!detail)return;
  const mark=()=>{if(document.visibilityState==='visible'&&Number(readVersions.get(selected)||0)<a.version)void markChatRead(db,uid,selected,a.version).catch(e=>setError(e.message))};
  mark();document.addEventListener('visibilitychange',mark);return()=>document.removeEventListener('visibilitychange',mark);
 },[selected,a?.version,reads.rows,narrow,detail,uid]);
 function select(o:Row){setSelected(o.id);setDetail(true);setError('')}
 function toggle(id:string){setExpanded(old=>{const n=new Set(old);n.has(id)?n.delete(id):n.add(id);return n})}
 return <div className={'pf-chat-shell '+(detail?'is-detail':'is-list')}>
  <aside className="pf-chat-list" aria-label="მოთხოვნები და საუბრები">
   <div className="pf-chat-list-heading"><h2>{admin?'ჩატების მართვა':isShop?'მომხმარებლის ჩატები':'ჩემი ჩატები'}</h2><span>{groups.length} მოთხოვნა</span></div>
   {[activity.error,confirmations.error,reads.error,error].filter(Boolean).map((e,i)=><p className="pf-chat-error" role="alert" key={i}>{e}</p>)}
   {!groups.length&&<div className="pf-chat-empty"><MessageSquare size={30}/><p>საუბრები აქ გამოჩნდება მაღაზიის შეთავაზების შემდეგ.</p></div>}
   {groups.map((r:Row)=><div className="pf-chat-group" key={r.id}>
    <button type="button" className="pf-chat-group-toggle" aria-expanded={expanded.has(r.id)} aria-controls={'chat-group-'+r.id} onClick={()=>toggle(r.id)}><Package size={18}/><span><strong>{r.part}</strong><small>{r.brand} {r.model} · {r.year} · #{r.id.slice(0,6)}</small>{r.acceptedOfferId&&<em>✓ შეკვეთა დადასტურებულია</em>}</span>{expanded.has(r.id)?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</button>
    {expanded.has(r.id)&&<div id={'chat-group-'+r.id}>{!r.conversations.length&&<p className="pf-chat-no-offer">შეთავაზებები ჯერ არ არის.</p>}{r.conversations.map((o:Row)=>{
     const s=summaries.get(o.id),c=cards.get(o.id),closed=chatClosed(r,o.id),won=r.acceptedOfferId===o.id;
     const unread=(s&&s.lastSenderId!==uid?Math.max(0,s.version-Number(readVersions.get(o.id)||0)):0)+(c&&shouldNotify(c)&&!seenNotifications.has(cardReceipt(c))&&!closed?1:0);
     const cardIsLatest=c&&millis(c.updatedAt)>=millis(s?.updatedAt);
     const last=closed?(r.acceptedOfferId?'არჩეულია სხვა მაღაზია':r.status==='hidden'?'მოთხოვნა დამალულია':'მოთხოვნა დახურულია'):cardIsLatest?({pending:'შეკვეთის დადასტურების მოთხოვნა',accepted:'შეკვეთა დადასტურებულია · ჩატი აქტიურია',declined:'დადასტურება უარყოფილია · საუბარი გრძელდება',withdrawn:'დადასტურების მოთხოვნა გაუქმდა'}[c.status]):s?.lastKind==='admin_join'?'ადმინისტრატორი შემოუერთდა':s?.lastText||o.note;
     return <button type="button" key={o.id} className={'pf-chat-row '+(selected===o.id?'selected':'')} aria-current={selected===o.id?'true':undefined} onClick={()=>select(o)}>
      <span className="pf-chat-avatar">{isShop?'მ':(o.shopName||'მაღაზია').slice(0,2)}</span><span className="pf-chat-row-main"><strong>{isShop?'მომხმარებელი #'+o.ownerId.slice(0,6):o.shopName}</strong><small>{last}</small><em className={won?'confirmed':c?.status==='pending'&&!closed?'pending':''}>{closed?'დახურული · ისტორია':won?'არჩეული მაღაზია':c?.status==='pending'?'დადასტურების მოლოდინი':'მოლაპარაკება'}</em></span><span className="pf-chat-row-meta"><time>{time(cardIsLatest?c.updatedAt:s?.updatedAt||o.createdAt)}</time>{unread>0&&<b aria-label={unread+' წაუკითხავი შეტყობინება'}>{unread>99?'99+':unread}</b>}</span>
     </button>;
    })}</div>}
   </div>)}
  </aside>
  {offer&&request?<Thread key={offer.id} active={!narrow||detail} notificationReceipts={notificationReceipts} offer={offer} request={request} uid={uid} user={data.user} admin={admin} isShop={isShop} summary={a} card={cards.get(offer.id)} back={()=>setDetail(false)}/>:<div className="pf-chat-thread pf-chat-empty"><MessageSquare size={38}/><h3>აირჩიე საუბარი</h3><p>გახსენი მოთხოვნა და აირჩიე მაღაზია.</p></div>}
 </div>;
}

function Thread({offer:o,request:r,uid,user,admin,isShop,summary,card,back,active,notificationReceipts}:any){
 const closed=chatClosed(r,o.id),won=r.acceptedOfferId===o.id;
 const scope=admin?[]:[where(isShop?'shopId':'ownerId','==',uid)];
 const filters=[where('offerId','==',o.id),...scope,orderBy('createdAt','desc')];
 const admins=useRows(['pf_chat_admins'],[where('offerId','==',o.id),...scope,orderBy('createdAt','asc')],o.id+':'+admin+':admins');
 const [messages,setMessages]=useState<Row[]>([]),[older,setOlder]=useState<Row[]>([]),[cursor,setCursor]=useState<any>(null),[olderCursor,setOlderCursor]=useState<any>(null),[more,setMore]=useState(false),[loadingOld,setLoadingOld]=useState(false);
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[showTerms,setShowTerms]=useState(false),[serviceQuote,setServiceQuote]=useState(Boolean(o.serviceAvailable));
 const log=useRef<HTMLDivElement>(null),previousLive=useRef<Row[]>([]),loadedOlder=useRef(false),pendingReceipts=useRef(new Set<string>());
 useEffect(()=>onSnapshot(query(collection(db,'pf_messages'),...filters,limit(60)),s=>{const incoming=s.docs.map(d=>({...d.data(),id:d.id}));if(loadedOlder.current)setOlder(old=>[...new Map([...old,...previousLive.current].map(m=>[m.id,m])).values()]);previousLive.current=incoming;setMessages(incoming);setCursor(s.docs.at(-1)||null);if(!loadedOlder.current)setMore(s.size===60);setError('')},e=>setError(e.message)),[o.id,admin,uid,isShop]);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages,card?.version,card?.status]);
 const customerProof=[...older,...messages].find(m=>m.senderId===o.ownerId&&!m.kind),shopProof=[...older,...messages].find(m=>m.senderId===o.shopId&&!m.kind);
 const canRequest=!!(summary?.customerReplied&&summary?.shopReplied||customerProof&&shopProof);
 const joined=admins.rows.some(a=>a.adminId===uid);
 const combined=[...new Map([...older,...messages].map(m=>[m.id,m])).values()].sort((a,b)=>millis(a.createdAt)-millis(b.createdAt)||a.id.localeCompare(b.id));
 useEffect(()=>{
  if(!active)return;
  const seen=new Set(notificationReceipts.map((r:Row)=>r.id));
  const mark=()=>{
   if(document.visibilityState!=='visible')return;
   const ids=[...older,...messages].filter(m=>m.senderId!==uid).map(m=>'message_'+m.id).filter(id=>!seen.has(id)&&!pendingReceipts.current.has(id));
   const unique=[...new Set(ids)];
   for(let offset=0;offset<unique.length;offset+=100){const page=unique.slice(offset,offset+100),batch=writeBatch(db);for(const id of page){pendingReceipts.current.add(id);batch.set(doc(db,'pf_inbox',uid,'receipts',id),{createdAt:serverTimestamp()})}void batch.commit().catch(e=>{page.forEach(id=>pendingReceipts.current.delete(id));setError(e.message)})}
  };
  mark();document.addEventListener('visibilitychange',mark);return()=>document.removeEventListener('visibilitychange',mark);
 },[messages,older,notificationReceipts,active,uid]);
 async function run(fn:()=>Promise<any>){setBusy(true);setError('');try{await fn();return true}catch(e:any){setError(e.message);return false}finally{setBusy(false)}}
 async function loadOlder(){const nextCursor=olderCursor||cursor;if(!nextCursor)return;setLoadingOld(true);try{const s=await getDocs(query(collection(db,'pf_messages'),...filters,startAfter(nextCursor),limit(60)));loadedOlder.current=true;setOlder(old=>[...new Map([...old,...messages,...s.docs.map(d=>({...d.data(),id:d.id}))].map(m=>[m.id,m])).values()]);setOlderCursor(s.docs.at(-1)||null);setMore(s.size===60)}catch(e:any){setError(e.message)}finally{setLoadingOld(false)}}
 const title=isShop?'მომხმარებელი #'+o.ownerId.slice(0,6):o.shopName;
 return <section className="pf-chat-thread" aria-label={'ჩატი · '+title}>
  <div className="pf-chat-thread-head"><button type="button" className="pf-chat-back" aria-label="საუბრების სიაში დაბრუნება" onClick={back}><ArrowLeft size={20}/></button><div className="pf-chat-avatar">{isShop?'მ':title.slice(0,2)}</div><div className="pf-chat-person"><h3>{title}</h3><small>მოთხოვნა #{r.id.slice(0,6)}</small></div>{admins.rows.length>0&&<span className="pf-chat-admin-badge"><ShieldCheck size={14}/>ადმინი ჩართულია</span>}</div>
  <div className="pf-chat-request-strip"><Package size={19}/><div><strong>{r.part}</strong><small>{r.brand} {r.model} · {r.year} · {r.category}</small></div><span>{won?'შეკვეთა დადასტურებულია':closed?'საუბარი დახურულია':'მოლაპარაკება'}</span></div>
  <div className="pf-chat-message-area" ref={log} role="log" aria-live="polite" aria-label="მიმოწერა">
   {more&&<button type="button" className="pf-chat-older" disabled={loadingOld} onClick={()=>void loadOlder()}>{loadingOld?'იტვირთება…':'ძველი შეტყობინებები'}</button>}
   {!combined.length&&<div className="pf-chat-empty"><p>დაიწყე საუბარი შეთავაზების შესახებ.</p></div>}
   {combined.map(m=>m.kind==='admin_join'?<div className="pf-chat-admin-event" key={m.id}><ShieldCheck size={14}/><span>{m.senderName} · ადმინისტრატორი შემოუერთდა ჩატს</span><time>{time(m.createdAt)}</time></div>:<div key={m.id} className={'pf-chat-message '+(m.kind==='admin'?'admin-message':m.senderId===uid?'mine':'')}>
    {m.kind==='admin'&&<strong className="pf-chat-admin-label"><ShieldCheck size={13}/>{m.senderName} · ადმინისტრატორი</strong>}<p>{m.text}</p><time>{time(m.createdAt)}{m.senderId===uid?' · ✓':''}</time>
   </div>)}
   {card&&<div className="pf-chat-confirm-card"><h3><ClipboardCheck size={20}/>{won?'შეკვეთა დადასტურებულია':'შეკვეთის დადასტურების მოთხოვნა'}</h3><small>{o.shopName} · {card.version>1?'განახლებული პირობები':'შეთავაზებული პირობები'}</small><h4>{r.part}</h4><strong className="pf-chat-price">ნაწილი: {money(card.price)}</strong>{card.serviceAvailable===true&&<div className="pf-chat-service-price"><span>შეცვლა / მომსახურება</span><strong>{Number(card.servicePrice||0)===0?'უფასო':money(Number(card.servicePrice))}</strong><span>ჯამი</span><strong>{money(Number(card.price)+Number(card.servicePrice||0))}</strong></div>}<div className="pf-chat-terms"><span>{card.condition}</span><span>{card.delivery}</span></div><p>{card.note}</p>
    {won?<div className="pf-chat-confirmed"><CheckCheck size={19}/><span>შეთანხმება დაფიქსირდა.<br/>ამ მაღაზიასთან ჩატი აქტიურია.</span></div>:closed?<p className="pf-chat-muted">ამ მოთხოვნაზე სხვა მაღაზიაა არჩეული ან მოთხოვნა დაიხურა.</p>:card.status==='pending'?admin?<p className="pf-chat-muted">მომხმარებლის თანხმობის მოლოდინშია. ადმინი არჩევანში არ მონაწილეობს.</p>:uid===o.ownerId?<><div className="pf-chat-card-actions"><button className="pf-chat-primary" disabled={busy} onClick={()=>void run(()=>confirmOrder(db,uid,o.id,card.version))}>ვადასტურებ</button><button disabled={busy} onClick={()=>void run(()=>declineConfirmation(db,uid,o.id,'declined'))}>უარყოფა</button></div><small>დადასტურებისას ამ მოთხოვნის სხვა მაღაზიებთან ჩატები დაიხურება.</small></>:<><p className="pf-chat-muted">მოთხოვნა გაგზავნილია. ველოდებით მომხმარებელს.</p><button disabled={busy} onClick={()=>void run(()=>declineConfirmation(db,uid,o.id,'withdrawn'))}>მოთხოვნის გაუქმება</button></>:<p className="pf-chat-muted">{card.status==='declined'?'მომხმარებელმა მოთხოვნა უარყო. საუბარი გრძელდება.':card.status==='withdrawn'?'მაღაზიამ მოთხოვნა გააუქმა. საუბარი გრძელდება.':'დადასტურებულია'}</p>}
   </div>}
   {won&&!card&&<div className="pf-chat-confirmed"><CheckCheck size={19}/>შეთავაზება არჩეულია. ჩატი აქტიურია.</div>}
  </div>
  {(error||admins.error)&&<p className="pf-chat-error" role="alert">{error||admins.error}</p>}
  {closed?<div className="pf-chat-closed"><LockKeyhole size={20}/><div><strong>ეს საუბარი დახურულია</strong><small>{r.acceptedOfferId?'მომხმარებელმა სხვა მაღაზია აირჩია. ისტორია შენარჩუნებულია.':'მოთხოვნა დახურულია ან დამალულია. ისტორია შენარჩუნებულია.'}</small></div></div>:<div className="pf-chat-compose-area">
   {admin&&!joined?<div className="pf-chat-admin-join"><p>მონიტორინგის რეჟიმი · შეერთებისას ორივე მხარე დაინახავს შენს სახელსა და როლს.</p><button className="pf-chat-primary" disabled={busy} onClick={()=>void run(()=>joinChat(db,uid,o.id))}><ShieldCheck size={17}/>ჩატში შეერთება</button></div>:<>
    {admin&&<p className="pf-chat-writing-as">წერ როგორც {user.name} · ადმინისტრატორი</p>}
    {!admin&&uid===o.shopId&&r.status==='open'&&card?.status!=='pending'&&<div className="pf-chat-store-action"><button className="pf-chat-primary" disabled={busy||!canRequest} onClick={()=>setShowTerms(v=>!v)}><ClipboardCheck size={17}/>შეკვეთის დადასტურების მოთხოვნა</button>{!canRequest&&<small>დადასტურებამდე მომხმარებელმაც და მაღაზიამაც უნდა დაწერონ ჩატში.</small>}</div>}
    {showTerms&&r.status==='open'&&card?.status!=='pending'&&<form className="pf-chat-terms-form" onSubmit={async e=>{e.preventDefault();const terms=Object.fromEntries(new FormData(e.currentTarget)),serviceAvailable=terms.serviceAvailable==='true';if(await run(()=>requestConfirmation(db,uid,o.id,{...terms,serviceAvailable,servicePrice:serviceAvailable?terms.servicePrice:0,...(customerProof&&shopProof?{customerMessageId:customerProof.id,shopMessageId:shopProof.id}:{})})))setShowTerms(false)}}><h3>შეთანხმებული პირობები</h3><div><label>ნაწილის ფასი, ₾<input name="price" type="number" min="0.01" max="1000000" step="0.01" required defaultValue={card?.price||o.price}/></label><label>მდგომარეობა<select name="condition" defaultValue={card?.condition||o.condition}><option>მეორადი</option><option>ახალი</option></select></label></div><label className="pf-chat-service-toggle"><input name="serviceAvailable" type="checkbox" value="true" checked={serviceQuote} onChange={e=>setServiceQuote(e.target.checked)}/>შეცვლა / მომსახურება {o.serviceAvailable&&`(${Number(o.servicePrice||0)===0?'უფასო':money(Number(o.servicePrice))})`}</label><label>მომსახურების ფასი, ₾<input name="servicePrice" type="number" disabled={!serviceQuote} min="0" max="1000000" step="0.01" defaultValue={card?.servicePrice??o.servicePrice??0}/></label><label>მიწოდება<input name="delivery" required maxLength={120} defaultValue={card?.delivery||o.delivery}/></label><label>აღწერა<textarea name="note" required maxLength={1000} defaultValue={card?.note||o.note}/></label><button className="pf-chat-primary" disabled={busy}>დადასტურების გაგზავნა</button></form>}
    <form className="pf-chat-composer" onSubmit={async e=>{e.preventDefault();const area=e.currentTarget.querySelector('textarea');if(await run(()=>writeChatMessage(db,uid,o.id,text,{admin}))){setText('');if(area)area.style.height='45px'}}}><label className="pf-chat-sr-only" htmlFor={'message-'+o.id}>შეტყობინება</label><textarea id={'message-'+o.id} rows={1} maxLength={2000} placeholder={admin?'ადმინისტრატორის შეტყობინება…':'შეტყობინება…'} value={text} onChange={e=>{setText(e.target.value);e.currentTarget.style.height='auto';e.currentTarget.style.height=Math.min(e.currentTarget.scrollHeight,140)+'px'}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} required/><button type="submit" className="pf-chat-send" disabled={busy||!text.trim()} aria-label="შეტყობინების გაგზავნა"><Send size={18}/></button></form>
   </>}
  </div>}
 </section>;
}

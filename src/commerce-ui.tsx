import {useEffect,useState} from 'react';
import {collection,doc,onSnapshot,query,where,orderBy,limit,setDoc,serverTimestamp} from 'firebase/firestore';
import {db} from './firebase';
import {confirmOrder,changeOrder,nextStatuses,orderLabels} from './commerce.mjs';
import {ChatWorkspace} from './chat-workspace';
import {enableAndroidPush} from './push';
import './commerce.css';
type Row=Record<string,any>;
function useRows(path:string[],filters:any[],key:string){
 const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('');
 useEffect(()=>{setRows([]);setError('');return onSnapshot(query(collection(db,path[0],...path.slice(1)),...filters),s=>{setRows(s.docs.map(d=>({...d.data(),id:d.id})));setError('')},e=>setError(e.message))},[key]);
 return {rows,error};
}
const date=(v:any)=>v?.toDate?.().toLocaleString('ka-GE')||'იგზავნება…';
export function CommerceHub({data,admin=false,demo=false,onOpenRequest,target}:any){
 const uid=data.user?.id;
 return demo?<p>ჩატი და შეკვეთები ხელმისაწვდომია ანგარიშით შესვლის შემდეგ.</p>:uid?<Hub key={uid+':'+admin} data={data} uid={uid} admin={admin} onOpenRequest={onOpenRequest} target={target}/>:null;
}
function Hub({data,uid,admin,onOpenRequest,target}:any){
 const [tab,setTab]=useState('chat'),[offerId,setOfferId]=useState(''),[selected,setSelected]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(target?.orderId){setSelected(target.orderId);setTab('orders')}else if(target?.offerId){setOfferId(target.offerId);setTab('chat')}},[target]);
 const orders=useRows(['pf_orders'],[...(admin?[]:[where(data.shop?'shopId':'ownerId','==',uid)]),orderBy('createdAt','desc'),limit(300)],uid+':orders');
 const receipts=useRows(['pf_inbox',uid,'receipts'],[],uid+':receipts');
 const incoming=useRows(['pf_messages'],[where(document.documentElement.dataset.role==='shop'?'shopId':'ownerId','==',uid),orderBy('createdAt','desc'),limit(100)],uid+':incoming');
 const confirmations=useRows(['pf_confirmations'],[...(admin?[]:[where(document.documentElement.dataset.role==='shop'?'shopId':'ownerId','==',uid)]),orderBy('updatedAt','desc'),limit(300)],uid+':confirmations');
 const read=new Set(receipts.rows.map(r=>r.id));
 const notices=[...confirmations.rows.filter(c=>(c.status==='pending'||c.status==='withdrawn'?c.ownerId===uid:c.shopId===uid)&&(c.status!=='pending'||data.requests.some((r:Row)=>r.id===c.requestId&&(r.status==='open'||r.acceptedOfferId===c.offerId)))).map(c=>({id:'confirmation_'+c.id+'_'+c.version+'_'+c.status,label:c.status==='pending'?'შეკვეთის დადასტურების მოთხოვნა':'შეკვეთის პასუხი: '+({accepted:'დადასტურებული',declined:'უარყოფილი',withdrawn:'გაუქმებული'}[c.status]||c.status),requestId:c.requestId,offerId:c.offerId})),...incoming.rows.filter(m=>m.senderId!==uid).map(m=>({id:'message_'+m.id,label:'ახალი შეტყობინება',requestId:m.requestId,offerId:m.offerId})),...data.offers.filter((o:Row)=>o.ownerId===uid).map((o:Row)=>({id:'offer_'+o.id,label:'ახალი შეთავაზება',requestId:o.requestId,offerId:o.id})),...orders.rows.filter(o=>o.version>0||o.shopId===uid).map(o=>({id:'order_'+o.id+'_'+o.version,label:'შეკვეთა: '+orderLabels[o.status]+(o.dispute==='open'?' · დავა':''),requestId:o.requestId,orderId:o.id}))];
 const unread=notices.filter(n=>!read.has(n.id)).length;
 async function openNotice(n:any){try{await setDoc(doc(db,'pf_inbox',uid,'receipts',n.id),{createdAt:serverTimestamp()});if(n.orderId){setSelected(n.orderId);setTab('orders')}else{setOfferId(n.offerId);setTab('chat')}onOpenRequest?.(n.requestId)}catch(e:any){setError(e.message)}}
 return <section className="commerce"><div className="commerce-tabs">{[['chat',admin?'ჩატების მართვა':'ჩატი'],['orders','შეკვეთები'],['notifications','შეტყობინებები ('+unread+')']].map(([t,l])=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{l}</button>)}</div>{[orders.error,receipts.error,incoming.error,confirmations.error,error].filter(Boolean).map((e,i)=><p role="alert" key={i}>{e}</p>)}
 {tab==='notifications'&&<><button type="button" onClick={async()=>{try{await enableAndroidPush(uid);setError('Android Push ჩართულია')}catch(e:any){setError(e.message)}}}>Android Push-ის ჩართვა</button>{!notices.length&&<p>შეტყობინებები ჯერ არ არის.</p>}{notices.map(n=><button className="commerce-notice" type="button" key={n.id} onClick={()=>void openNotice(n)}>{read.has(n.id)?'✓':'●'} {n.label} · #{n.requestId.slice(0,6)}</button>)}</>}
 {tab==='chat'&&<ChatWorkspace notificationReceipts={receipts.rows} data={data} uid={uid} admin={admin} targetOfferId={offerId}/>}
 {tab==='orders'&&<><label>შეკვეთის ძებნა / სტატუსი<input placeholder="მოთხოვნა, სტატუსი ან დავა" onChange={e=>setSelected('search:'+e.target.value)}/></label>{!orders.rows.length&&<p>შეკვეთები ჯერ არ არის.</p>}{orders.rows.filter(o=>!selected.startsWith('search:')||[o.id,orderLabels[o.status],o.dispute==='open'?'დავა':''].join(' ').includes(selected.slice(7))).map(o=><Order key={o.id} order={o} uid={uid} admin={admin} request={data.requests.find((r:Row)=>r.id===o.requestId)} expanded={selected===o.id} select={()=>setSelected(selected===o.id?'':o.id)}/>)}
 {!admin&&data.offers.filter((o:Row)=>o.ownerId===uid&&data.requests.some((r:Row)=>r.acceptedOfferId===o.id)&&!orders.rows.some(x=>x.offerId===o.id)).map((o:Row)=><button key={o.id} type="button" onClick={async()=>{try{await confirmOrder(db,uid,o.id)}catch(e:any){setError(e.message)}}}>არჩეული შეთავაზებიდან შეკვეთის შექმნა · {o.shopName}</button>)}</>}
 </section>;
}
function Order({order:o,uid,admin,request,expanded,select}:any){
 const [note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function change(kind:string){setBusy(true);setError('');try{await changeOrder(db,uid,o.id,kind,note);setNote('')}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 return <article className="commerce-order"><button type="button" className="commerce-summary" onClick={select} aria-expanded={expanded}>{request?.part||'#'+o.id} · {orderLabels[o.status]}{o.dispute==='open'?' · ღია დავა':''}</button>{expanded&&<><p>შეკვეთა #{o.id} · {date(o.createdAt)}</p><label>კომენტარი / მიზეზი<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><div className="commerce-actions">{nextStatuses(o,uid,admin).map(s=><button key={s} disabled={busy||!note.trim()} onClick={()=>void change(s)}>{orderLabels[s]}</button>)}{!admin&&o.dispute==='none'&&<button disabled={busy||!note.trim()} onClick={()=>void change('dispute')}>დავის გახსნა</button>}{admin&&o.dispute==='open'&&<button disabled={busy||!note.trim()} onClick={()=>void change('resolve')}>დავის გადაწყვეტა</button>}</div>{error&&<p role="alert">{error}</p>}<History id={o.id}/></>}</article>;
}
function History({id}:any){const events=useRows(['pf_orders',id,'events'],[orderBy('version','desc'),limit(200)],id);return <div><h3>უცვლელი ისტორია</h3>{events.error&&<p role="alert">{events.error}</p>}{events.rows.map(e=><p key={e.id}>{date(e.createdAt)} · {orderLabels[e.status]} · {e.kind} · {e.actorId}<br/>{e.note}</p>)}</div>}

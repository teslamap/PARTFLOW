import {useEffect,useState} from 'react';
import {collection,doc,onSnapshot,orderBy,query,setDoc} from 'firebase/firestore';
import {db} from './firebase';
export function useSupportUnread(uid:string,enabled:boolean){
 const [count,setCount]=useState(0);
 useEffect(()=>{if(!enabled||!uid){setCount(0);return}
 const stops=new Map<string,()=>void>(),totals=new Map<string,number>();
 const refresh=()=>setCount([...totals.values()].reduce((a,b)=>a+b,0));
 const root=onSnapshot(collection(db,'pf_support_threads'),snap=>{
  const ids=new Set(snap.docs.map(d=>d.id));
  for(const [id,stop] of stops)if(!ids.has(id)){stop();stops.delete(id);totals.delete(id)}
  for(const d of snap.docs){if(stops.has(d.id))continue;const id=d.id;
   const stop=onSnapshot(query(collection(db,'pf_support_threads',id,'messages'),orderBy('createdAt','asc')),messages=>{
    const seen=Number(localStorage.getItem('pf_support_seen_'+uid+'_'+id)||0);
    totals.set(id,messages.docs.filter(m=>m.data().senderId!==uid&&((m.data().createdAt?.toMillis?.()||0)>seen)).length);refresh();
   },()=>{totals.set(id,0);refresh()});stops.set(id,stop)
  }refresh();
 },()=>setCount(0));
 return()=>{root();for(const stop of stops.values())stop()}
 },[uid,enabled]);
 return count;
}
export function markSupportRead(uid:string,threadId:string){
 if(!uid||!threadId)return;
 localStorage.setItem('pf_support_seen_'+uid+'_'+threadId,String(Date.now()));
 window.dispatchEvent(new Event('pf-support-read'));
}

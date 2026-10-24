import {useEffect,useState} from 'react';
import {collection,onSnapshot,query,where} from 'firebase/firestore';
import {db} from './firebase';
export function DeletionQueue({act,busy}:any){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>onSnapshot(query(collection(db,'pf_deletions'),where('status','==','pending')),s=>{setRows(s.docs.map(d=>({id:d.id,...d.data()})));setError('')},e=>setError(e.message)),[]);
 if(!rows.length&&!error)return null;
 return <section className="panel"><h2>დასასრულებელი წაშლა</h2><p>თუ პროცესი შეწყდა, გააგრძელე აქედან. დაკავშირებული მონაცემების ახალი ჩანაწერები შეჩერებულია.</p>{error&&<p role="alert">{error}</p>}{rows.map(r=><p key={r.id}>#{r.id} <button className="danger" disabled={busy} onClick={()=>{if(window.confirm('გაგრძელდეს მოთხოვნისა და ყველა დაკავშირებული შეთავაზების, ჩატის, შეკვეთისა და ისტორიის სამუდამოდ წაშლა?'))void act({action:'deleteRequest',id:r.id})}}>წაშლის გაგრძელება</button></p>)}</section>;
}

import {useEffect,useState} from 'react';
import {collection,onSnapshot,query,where,orderBy,limit} from 'firebase/firestore';
import {db} from './firebase';
export function Services(){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>onSnapshot(query(collection(db,'pf_shops'),where('businessType','==','auto_service'),where('status','==','approved'),orderBy('createdAt','desc'),limit(300)),s=>{setRows(s.docs.map(d=>({id:d.id,...d.data()})));setError('');setLoading(false)},()=>{setRows([]);setError('ავტოსერვისების ჩატვირთვა ვერ მოხერხდა');setLoading(false)}),[]);
 return <section className="panel"><div className="section-title"><h1>ავტოსერვისები</h1><a className="primary" href="shop.html?businessType=auto_service">ავტოსერვისის რეგისტრაცია</a></div><p className="muted">სუპერადმინის მიერ დამტკიცებული ავტოსერვისები</p>{loading&&<p role="status">იტვირთება...</p>}{error&&<p role="alert">{error}</p>}{!loading&&!error&&!rows.length&&<p>დამტკიცებული ავტოსერვისები ჯერ არ არის.</p>}{rows.map(s=><article className="shop-row" key={s.id}><div className="grow"><h2>{s.name}</h2><p>{s.city}</p><a href={'tel:'+s.phone.replace(/\s/g,'')}>{s.phone}</a></div><span className="badge approved">დამტკიცებული</span></article>)}</section>;
}

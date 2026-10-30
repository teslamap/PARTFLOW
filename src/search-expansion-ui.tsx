import {useEffect,useState} from 'react';
import {searchExpanded,EXPANSION_DELAY} from './search-expansion.mjs';
export function SearchExpansion({request:r,owner,busy,expand}:any){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 if(r.searchScope!=='city')return null;
 if(r.acceptedOfferId)return <p>შეთავაზება დადასტურებულია — ძებნის გაფართოება შეჩერებულია.</p>;
 if(r.status!=='open')return null;
 const wide=searchExpanded(r,now),remaining=Math.max(0,Math.ceil((Date.parse(r.createdAt)+EXPANSION_DELAY-now)/60000));
 return <div className="info-box"><p>{wide?'ძებნა გაფართოებულია სხვა ქალაქებშიც.':`ძებნა: ${r.city}. დადასტურების გარეშე გაფართოვდება დაახლოებით ${remaining} წუთში.`} არსებული შეთავაზებები შენარჩუნდება.</p>{owner&&!wide&&<button type="button" className="secondary" disabled={busy} onClick={expand}>სხვა ქალაქებშიც ძებნა ახლავე</button>}</div>;
}

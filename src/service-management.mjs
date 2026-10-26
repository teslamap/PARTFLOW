import {collection,doc,runTransaction,serverTimestamp,Timestamp} from 'firebase/firestore';

export const WEEKDAYS=['ორშაბათი','სამშაბათი','ოთხშაბათი','ხუთშაბათი','პარასკევი','შაბათი','კვირა'];
export const defaultWeek=()=>WEEKDAYS.map((_,i)=>({open:i<5,start:i<5?540:0,end:i<5?1080:0}));
const text=(value,max,required=true)=>{if(typeof value!=='string')throw Error('ტექსტი არასწორია');const v=value.trim();if((required&&!v)||v.length>max)throw Error('ტექსტის სიგრძე არასწორია');return v;};
export function validateWeek(days){
 if(!Array.isArray(days)||days.length!==7)throw Error('შეავსე კვირის შვიდივე დღე');
 return days.map(day=>{
  if(!day||typeof day.open!=='boolean'||!Number.isInteger(day.start)||!Number.isInteger(day.end)||day.start<0||day.end>1439||day.start>1439||day.end<0||(day.open?day.end<=day.start:day.start!==0||day.end!==0))throw Error('სამუშაო საათები არასწორია');
  return {open:day.open,start:day.start,end:day.end};
 });
}
export function catalogValue(input){
 const durationMinutes=Number(input.durationMinutes);
 if(!Number.isInteger(durationMinutes)||durationMinutes<15||durationMinutes>480||durationMinutes%15)throw Error('ხანგრძლივობა: 15–480 წუთი, 15-წუთიანი ნაბიჯით');
 if(typeof input.active!=='boolean')throw Error('აქტიურობის მნიშვნელობა არასწორია');
 return {name:text(input.name,100),description:text(input.description,1000,false),durationMinutes,active:input.active};
}
export function staffValue(input){
 if(!Array.isArray(input.serviceIds)||input.serviceIds.length<1||input.serviceIds.length>8||new Set(input.serviceIds).size!==input.serviceIds.length||input.serviceIds.some(id=>typeof id!=='string'||!/^[-\w]{1,128}$/.test(id)))throw Error('აირჩიე 1–8 განსხვავებული მომსახურება');
 if(typeof input.active!=='boolean')throw Error('აქტიურობის მნიშვნელობა არასწორია');
 return {name:text(input.name,100),specialty:text(input.specialty,200,false),serviceIds:input.serviceIds,days:validateWeek(input.days),active:input.active};
}
export function closureValue(input){
 const date=text(input.date,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('თარიღი არასწორია');
 if(typeof input.staffId!=='string')throw Error('ხელოსანი არასწორია');
 if(input.staffId!==''&&!/^[-\w]{1,128}$/.test(input.staffId))throw Error('ხელოსანი არასწორია');
 if(typeof input.active!=='boolean')throw Error('აქტიურობის მნიშვნელობა არასწორია');
 return {date,day:Timestamp.fromDate(new Date(date+'T00:00:00Z')),staffId:input.staffId,active:input.active};
}
// A missing document is readable by the owner, so a transaction safely preserves
// createdAt on edits and retries without overwriting an existing creation time.
export async function saveServiceRecord(db,businessId,kind,id,input){
 if(!['catalog','staff','hours','closures'].includes(kind))throw Error('ჩანაწერის ტიპი არასწორია');
 let value=kind==='catalog'?catalogValue(input):kind==='staff'?staffValue(input):kind==='closures'?closureValue(input):{timezone:'Asia/Tbilisi',days:validateWeek(input.days)};
 if(kind==='hours')id='weekly';
 if(id&&!/^[-\w]{1,128}$/.test(id))throw Error('ჩანაწერის კოდი არასწორია');
 const ref=id?doc(db,'pf_shops',businessId,kind,id):doc(collection(db,'pf_shops',businessId,kind));
 await runTransaction(db,async tx=>{const existing=await tx.get(ref);tx.set(ref,{...value,createdAt:existing.exists()?existing.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});});
 return ref.id;
}

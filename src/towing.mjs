import {collection,doc,addDoc,setDoc,updateDoc,runTransaction,serverTimestamp,Timestamp} from 'firebase/firestore';
export const TOW_CITIES=['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','თელავი','ახალციხე','ახალქალაქი','ბორჯომი','ხაშური','ქობულეთი','ოზურგეთი','სენაკი','მარტვილი','სამტრედია','ზესტაფონი','ჭიათურა','საჩხერე','ამბროლაური','ონი','მესტია','ლენტეხი','ცაგერი','დუშეთი','მცხეთა','ყაზბეგი','გურჯაანი','სიღნაღი','ლაგოდეხი','ყვარელი','დედოფლისწყარო','საგარეჯო','ბოლნისი','მარნეული','დმანისი','წალკა','თეთრიწყარო','ნინოწმინდა','ადიგენი','ასპინძა','ლანჩხუთი','ჩოხატაური','ხობი','წალენჯიხა','ჩხოროწყუ','აბაშა','წყალტუბო','ტყიბული','თერჯოლა','ბაღდათი','ვანი','ხარაგაული','ქარელი','კასპი','თიანეთი','ახმეტა','ხელვაჩაური','ქედა','შუახევი','ხულო','სოხუმი','გაგრა','გუდაუთა','ოჩამჩირე','გალი','ტყვარჩელი','ცხინვალი','ჯავა','ახალგორი'];
export const TOW_STATES={searching:'მძღოლის ძებნა',offered:'მძღოლი ელოდება დადასტურებას',confirmed:'დადასტურებულია',en_route:'მძღოლი გზაშია',transporting:'გადაყვანა მიმდინარეობს',completed:'დასრულებულია',cancelled:'გაუქმებულია'};
export const EXPAND_AFTER=15*60*1000;
export const canExpand=(r,now=Date.now())=>r.mode==='sos'&&r.status==='searching'&&r.scope==='city'&&r.createdAt?.toMillis?.()+EXPAND_AFTER<=now;
const text=(v,max)=>{const s=String(v||'').trim();if(!s||s.length>max)throw Error('შეავსე სავალდებულო ველები');return s};
export function requestFields(d,now=Date.now()){
 if(!['sos','intercity'].includes(d.mode)||!TOW_CITIES.includes(d.city)||!TOW_CITIES.includes(d.destinationCity))throw Error('აირჩიე ქალაქები');
 if(!/^\+9955\d{8}$/.test(d.phone))throw Error('ნომრის ფორმატი: +9955XXXXXXXX');
 const notes=String(d.notes||'').trim();if(notes.length>1000)throw Error('შენიშვნა ზედმეტად გრძელია');
 const pickupAt=d.mode==='intercity'?Timestamp.fromMillis(new Date(d.pickupAt).getTime()):null;
 if(d.mode==='intercity'&&(!Number.isFinite(pickupAt.toMillis())||pickupAt.toMillis()<=now))throw Error('აირჩიე მომავალი თარიღი და დრო');
 const location=d.mode==='sos'?d.location:null;
 if(d.mode==='sos'&&(!location||!Number.isFinite(location.lat)||!Number.isFinite(location.lng)||Math.abs(location.lat)>90||Math.abs(location.lng)>180))throw Error('მიუთითე შენი მდებარეობა');
 if(!['rolls','blocked','accident'].includes(d.condition))throw Error('აირჩიე მანქანის მდგომარეობა');
 return {mode:d.mode,city:d.city,destinationCity:d.destinationCity,origin:text(d.origin,300),destination:text(d.destination,300),vehicle:text(d.vehicle,160),condition:d.condition,notes,phone:d.phone,pickupAt,location,scope:d.mode==='sos'?'city':'all'};
}
export async function createTowRequest(db,uid,d){return addDoc(collection(db,'pf_tow_requests'),{...requestFields(d),ownerId:uid,status:'searching',driverId:null,quote:null,driverName:null,driverPhone:null,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),expandedAt:null})}
export async function applyTowDriver(db,uid,d){if(!TOW_CITIES.includes(d.city)||!/^\+9955\d{8}$/.test(d.phone))throw Error('ქალაქი ან ნომერი არასწორია');return setDoc(doc(db,'pf_tow_drivers',uid),{ownerId:uid,name:text(d.name,100),phone:d.phone,city:d.city,truck:text(d.truck,160),status:'pending',updatedAt:serverTimestamp()})}
export const moderateTowDriver=(db,id,status)=>updateDoc(doc(db,'pf_tow_drivers',id),{status,updatedAt:serverTimestamp()});
export async function claimTow(db,id,uid,price){if(!Number.isFinite(price)||price<=0||price>1000000)throw Error('მიუთითე მომსახურების ფასი');return runTransaction(db,async tx=>{const ref=doc(db,'pf_tow_requests',id),r=await tx.get(ref),driver=await tx.get(doc(db,'pf_tow_drivers',uid));if(!r.exists()||r.data().status!=='searching')throw Error('გამოძახება უკვე მიღებულია');if(!driver.exists()||driver.data().status!=='approved')throw Error('საჭიროა ადმინის დამტკიცება');const d=driver.data(),request=r.data();if(request.ownerId===uid||(request.scope==='city'&&request.city!==d.city))throw Error('გამოძახება მიუწვდომელია');tx.update(ref,{status:'offered',driverId:uid,driverName:d.name,driverPhone:d.phone,quote:price,updatedAt:serverTimestamp()})})}
export async function towAction(db,id,uid,action){return runTransaction(db,async tx=>{const ref=doc(db,'pf_tow_requests',id),s=await tx.get(ref);if(!s.exists())throw Error('გამოძახება ვერ მოიძებნა');const r=s.data();let patch;
 if(r.ownerId===uid){if(action==='expand'&&canExpand(r))patch={scope:'all',expandedAt:serverTimestamp()};else if(action==='confirm'&&r.status==='offered')patch={status:'confirmed'};else if(action==='cancel'&&['searching','offered','confirmed'].includes(r.status))patch={status:'cancelled'};else if(action==='complete'&&r.status==='transporting')patch={status:'completed'};}
 if(r.driverId===uid){const next={confirmed:'en_route',en_route:'transporting'}[r.status];if(action==='advance'&&next)patch={status:next};}
 if(!patch)throw Error('ეს მოქმედება ამ სტატუსში დაუშვებელია');tx.update(ref,{...patch,updatedAt:serverTimestamp()});})}

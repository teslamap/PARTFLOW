import {ContextTarget} from './context-menu';
import {Archive,ArchiveRestore,Trash2} from 'lucide-react';
export const entityNames:Record<string,string>={requests:'მოთხოვნა',offers:'შეთავაზება',shops:'მაღაზია',members:'ანგარიში',categories:'კატეგორია',support:'მხარდაჭერა',chat:'ჩატი',drivers:'ევაკუატორი',services:'ავტოსერვისი'};
export function archiveKey(type:string,id:string){return type+'_'+id}
export function isArchived(data:any,type:string,id:string){return (data.archives||[]).some((a:any)=>a.type===type&&a.targetId===id)}
// Archiving is private to this account AND panel. It never withdraws a shared
// request/offer or disables an account; existing moderation controls do that.
export function RecordActions({type,id,label,data,act,busy,restore=false}:any){
 const admin=data.user?.role==='superadmin';
 const actions:any[]=[{label:restore?'არქივიდან აღდგენა':'არქივში გადატანა',icon:restore?'restore':'archive',run:()=>act({action:restore?'restore':'archive',type,id,label})},{label:'ID-ის კოპირება',icon:'copy',run:()=>void navigator.clipboard?.writeText(id)}];
 if(admin&&restore)actions.push({label:'არქივის ჩანაწერის წაშლა',icon:'delete',danger:true,run:()=>{if(window.confirm('წაიშალოს მხოლოდ არქივის ჩანაწერი?'))void act({action:'restore',type,id,label})}});
 if(admin&&type==='requests'&&!data.demo)actions.push({label:'მოთხოვნის სამუდამოდ წაშლა',icon:'delete',danger:true,run:()=>{if(window.confirm('სამუდამოდ წაიშალოს „'+label+'“ და მისი დაკავშირებული მონაცემები?'))void act({action:'deleteRequest',id})}});
 return <ContextTarget actions={actions}><div className="record-actions">
  <button className="secondary" disabled={busy} onClick={()=>act({action:restore?'restore':'archive',type,id,label})}>{restore?<ArchiveRestore size={15}/>:<Archive size={15}/>} {restore?'აღდგენა':'არქივში გადატანა'}</button>
  {type==='requests'&&!data.demo&&data.user?.role==='superadmin'&&<button className="danger" disabled={busy} onClick={()=>{if(window.confirm('სამუდამოდ წაიშალოს მხოლოდ არჩეული მოთხოვნა „'+label+'“ და მისი დაკავშირებული შეთავაზებები/ჩატები/შეკვეთა? სხვა მოთხოვნები უცვლელი დარჩება.'))void act({action:'deleteRequest',id})}}><Trash2 size={15}/> წაშლა</button>}
  {restore&&data.user?.role==='superadmin'&&<button className="danger" disabled={busy} onClick={()=>{if(window.confirm('წაიშალოს მხოლოდ ეს ჩანაწერი არქივის სიიდან? ორიგინალი ობიექტი უცვლელი დარჩება.'))void act({action:'restore',type,id,label})}}><Trash2 size={15}/> არქივიდან წაშლა</button>}
 </div></ContextTarget>
}
export function ArchiveView({data,act,busy}:any){return <section className="panel archive-panel"><h2>არქივი</h2><p>აქ გადატანილი ჩანაწერები მხოლოდ ამ პანელშია დამალული. ანგარიშები არ იბლოკება და სხვა მონაწილეების მონაცემები უცვლელია.</p>{!(data.archives||[]).length&&<p>არქივი ცარიელია.</p>}{(data.archives||[]).map((a:any)=><article className="archive-row" key={a.id}><div><small>{entityNames[a.type]}</small><h3>{a.label}</h3></div><RecordActions type={a.type} id={a.targetId} label={a.label} data={data} act={act} busy={busy} restore/></article>)}</section>}

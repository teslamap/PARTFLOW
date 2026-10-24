import {Archive,ArchiveRestore} from 'lucide-react';
export const entityNames:Record<string,string>={requests:'მოთხოვნა',offers:'შეთავაზება',shops:'მაღაზია',members:'ანგარიში',categories:'კატეგორია'};
export function archiveKey(type:string,id:string){return type+'_'+id}
export function isArchived(data:any,type:string,id:string){return (data.archives||[]).some((a:any)=>a.type===type&&a.targetId===id)}
// Archiving is private to this account AND panel. It never withdraws a shared
// request/offer or disables an account; existing moderation controls do that.
export function RecordActions({type,id,label,data,act,busy,restore=false}:any){
 return <div className="record-actions">
  <button className="secondary" disabled={busy} onClick={()=>act({action:restore?'restore':'archive',type,id,label})}>{restore?<ArchiveRestore size={15}/>:<Archive size={15}/>} {restore?'აღდგენა':'არქივში გადატანა'}</button>
  {type==='requests'&&!data.demo&&data.user?.role==='superadmin'&&<button className="danger" disabled={busy} onClick={()=>{if(window.confirm('სამუდამოდ წაიშალოს „'+label+'“? წაიშლება ყველა დაკავშირებული შეთავაზება, ჩატი, შეკვეთა და ისტორია, მათ შორის მაღაზიების პანელებიდან. აღდგენა შეუძლებელია.'))void act({action:'deleteRequest',id})}}>სრულად წაშლა</button>}
 </div>
}
export function ArchiveView({data,act,busy}:any){return <section className="panel archive-panel"><h2>არქივი</h2><p>აქ გადატანილი ჩანაწერები მხოლოდ ამ პანელშია დამალული. ანგარიშები არ იბლოკება და სხვა მონაწილეების მონაცემები უცვლელია.</p>{!(data.archives||[]).length&&<p>არქივი ცარიელია.</p>}{(data.archives||[]).map((a:any)=><article className="archive-row" key={a.id}><div><small>{entityNames[a.type]}</small><h3>{a.label}</h3></div><RecordActions type={a.type} id={a.targetId} label={a.label} data={data} act={act} busy={busy} restore/></article>)}</section>}

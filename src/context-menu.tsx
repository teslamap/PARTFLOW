import {useEffect,useState} from 'react';
import type {ReactNode,MouseEvent} from 'react';
import {Archive,ArchiveRestore,Copy,Eye,Trash2,X} from 'lucide-react';
type Action={label:string,icon?:'archive'|'restore'|'copy'|'view'|'delete',danger?:boolean,disabled?:boolean,run:()=>void};
export function ContextTarget({children,actions,className='',style}:{children:ReactNode,actions:Action[],className?:string,style?:any}){
 const [at,setAt]=useState<{x:number,y:number}|null>(null);
 useEffect(()=>{if(!at)return;const close=()=>setAt(null);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};document.addEventListener('pointerdown',close);document.addEventListener('scroll',close,true);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('scroll',close,true);document.removeEventListener('keydown',key)}},[at]);
 function open(e:MouseEvent){if(!actions.length)return;e.preventDefault();setAt({x:Math.min(e.clientX,window.innerWidth-230),y:Math.min(e.clientY,window.innerHeight-Math.min(actions.length*42+20,340))})}
 const icons={archive:Archive,restore:ArchiveRestore,copy:Copy,view:Eye,delete:Trash2};
 return <div className={className} style={style} onContextMenu={open}>{children}{at&&<div role="menu" aria-label="ობიექტის მოქმედებები" onPointerDown={e=>e.stopPropagation()} style={{position:'fixed',left:Math.max(8,at.x),top:Math.max(8,at.y),zIndex:10000,minWidth:210,background:'#122336',color:'#fff',border:'1px solid #38516b',borderRadius:12,padding:6,boxShadow:'0 12px 36px #0007'}}>{actions.map((a,i)=>{const Icon=icons[a.icon||'view'];return <button key={i} role="menuitem" disabled={a.disabled} onClick={()=>{setAt(null);a.run()}} style={{display:'flex',alignItems:'center',gap:10,width:'100%',border:0,borderRadius:7,padding:'10px 12px',background:'transparent',color:a.danger?'#ff7777':'#fff',textAlign:'left',cursor:'pointer',fontSize:13}}><Icon size={16}/>{a.label}</button>})}<button onClick={()=>setAt(null)} style={{display:'flex',alignItems:'center',gap:8,background:'transparent',border:0,color:'#9eafc0',padding:8,cursor:'pointer'}}><X size={14}/> დახურვა</button></div>}</div>
}

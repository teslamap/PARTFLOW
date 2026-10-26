import {useEffect,useRef} from 'react';
import {MessageSquare,X} from 'lucide-react';
import {CommerceHub} from './commerce-ui';

export function MobileChat({open,onClose,onOpen,data,demo,target}:any){
 const dialog=useRef<HTMLDialogElement>(null),launcher=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const el=dialog.current;if(!el)return;
  if(!open){if(el.open)el.close();return}
  el.showModal();
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const resize=()=>{
   const viewport=window.visualViewport;
   const top=Math.max(document.querySelector('.mc-header')?.getBoundingClientRect().bottom||0,viewport?.offsetTop||0)+8;
   el.style.top=top+'px';
   el.style.height=Math.max(0,(viewport?.height||window.innerHeight)+(viewport?.offsetTop||0)-top-8)+'px';
  };
  resize();const observer=new ResizeObserver(resize);const header=document.querySelector('.mc-header');if(header)observer.observe(header);
  window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);window.addEventListener('resize',resize);
  return()=>{document.body.style.overflow=previous;observer.disconnect();window.visualViewport?.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('scroll',resize);window.removeEventListener('resize',resize)};
 },[open]);
 return <>
  <button ref={launcher} type="button" className="mc-chat-launcher" aria-label="ჩატის გახსნა" aria-haspopup="dialog" aria-expanded={open} aria-controls="customer-chat" hidden={open} onClick={onOpen}><MessageSquare size={26}/></button>
  <dialog ref={dialog} id="customer-chat" className="mc-chat-popup" aria-labelledby="customer-chat-title" onCancel={e=>{e.preventDefault();onClose()}} onClose={()=>{onClose();launcher.current?.focus()}}>
   <div className="mc-chat-popup-head"><h2 id="customer-chat-title">ჩატი</h2><button type="button" className="mc-icon" aria-label="ჩატის დახურვა" onClick={onClose}><X size={22}/></button></div>
   {open&&<CommerceHub data={data} demo={demo} target={target}/>}
  </dialog>
 </>;
}

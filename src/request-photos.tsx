import React,{useEffect,useState} from 'react';
import {getBlob,ref,uploadString,deleteObject} from 'firebase/storage';
import {auth,storage} from './firebase';
const marker=/^pf-storage:([0-3])$/;
const safe=/^[A-Za-z0-9_-]{1,128}$/;
export async function storeRequestPhotos(uid:string,id:string,photos:string[]){
 if(!safe.test(uid)||!safe.test(id))throw Error('Invalid photo path');
 const written:string[]=[];
 try{
  for(const [i,photo] of photos.entries()){
   if(auth.currentUser?.uid!==uid)throw Error('Account changed');
   const path='requestPhotos/'+uid+'/'+id+'/'+i+'.jpg';
   await uploadString(ref(storage,path),photo,'data_url',{contentType:'image/jpeg'});
   written.push(path);
  }
  return photos.map((_,i)=>'pf-storage:'+i);
 }catch(e){await Promise.allSettled(written.map(path=>deleteObject(ref(storage,path))));throw e}
}
export function RequestPhoto({photo,request,alt,link=false}:any){
 const [url,setUrl]=useState('');const [failed,setFailed]=useState(false);
 const stored=typeof photo==='string'?marker.exec(photo):null;
 const uid=request?.ownerId,id=request?.id;
 useEffect(()=>{
  let active=true,objectUrl='';
  setUrl('');setFailed(false);
  if(!stored)return;
  if(!safe.test(uid||'')||!safe.test(id||'')){setFailed(true);return}
  getBlob(ref(storage,'requestPhotos/'+uid+'/'+id+'/'+stored[1]+'.jpg'),200000).then(blob=>{if(!active)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)},()=>{if(active)setFailed(true)});
  return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)};
 },[photo,uid,id,auth.currentUser?.uid]);
 const src=stored?url:typeof photo==='string'&&photo.startsWith('data:image/jpeg;base64,')?photo:'';
 if(!src)return <span role="img" aria-label={alt}>{failed?'ფოტო მიუწვდომელია':'იტვირთება…'}</span>;
 const image=<img src={src} alt={alt} loading="lazy" decoding="async"/>;
 return link?<a href={src} target="_blank" rel="noreferrer">{image}</a>:image;
}

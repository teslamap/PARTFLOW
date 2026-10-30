import {createWorker} from 'tesseract.js';
import {certificateFields} from './certificate.mjs';
export async function recognizeCertificate(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error('აირჩიე JPG, PNG ან WebP ფოტო, მაქსიმუმ 8 MB.');
 const image=await createImageBitmap(file);
 try{if(image.width*image.height>24000000)throw Error('ფოტო ძალიან დიდია. აირჩიე მცირე ზომის ფოტო.')}finally{image.close()}
 let worker:Awaited<ReturnType<typeof createWorker>>|undefined,timer:ReturnType<typeof setTimeout>;
 let expired=false;
 const base=new URL('ocr/',location.href).href;
 const work=(async()=>{worker=await createWorker(['eng','kat'],1,{cacheMethod:'none',workerPath:base+'worker.min.js',corePath:base});if(expired){await worker.terminate();throw Error('OCR expired')}return worker.recognize(file,{}, {text:true,blocks:true})})();
 try{
  const result=await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('ამოცნობას დრო დასჭირდა. სცადე ხელახლა ან შეავსე ხელით.')),60000)})]);
  const safeText=(result.data.blocks||[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.map(l=>l.words.map(w=>w.confidence>=80?w.text:'?').join(' ')))).join('\n');
  return certificateFields(safeText,result.data.confidence);
 }finally{
  expired=true;clearTimeout(timer!);
  if(worker)await worker.terminate();
  else void work.then(()=>worker?.terminate(),()=>worker?.terminate());
 }
}

import {mkdir,copyFile,cp,stat} from 'node:fs/promises';
await mkdir('dist-mobile',{recursive:true});
await copyFile('dist/mobile-customer.html','dist-mobile/index.html');
await copyFile('dist/mobile-customer.html','dist-mobile/mobile-customer.html');
for(const name of ['assets','ocr','vendor','icons','manifest.webmanifest','favicon.svg']){
 if(await stat('dist/'+name).catch(()=>null))await cp('dist/'+name,'dist-mobile/'+name,{recursive:true});
}
console.log('Bundled mobile customer and its required local assets prepared for Capacitor.');

import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist-mobile',{recursive:true});
await copyFile('dist/mobile-customer.html','dist-mobile/index.html');
await copyFile('dist/mobile-customer.html','dist-mobile/mobile-customer.html');
console.log('Bundled mobile customer prepared for Capacitor.');

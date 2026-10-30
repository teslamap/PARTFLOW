import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
// Reproducible self-contained upload; no client bundles, .env files or credentials.
await mkdir('api-runtime/server',{recursive:true});await mkdir('api-runtime/src',{recursive:true});
for(const file of ['functions-entry.mjs','service.mjs','batch.mjs','batch-policy.mjs','reward-policy.mjs'])await copyFile('server/'+file,'api-runtime/server/'+file);
for(const file of ['core.mjs','feature-policy.mjs'])await copyFile('src/'+file,'api-runtime/src/'+file);
const pkg=JSON.parse(await readFile('functions/package.json','utf8')),lock=JSON.parse(await readFile('functions/package-lock.json','utf8'));
pkg.name='partflow-batch-api';pkg.main='server/functions-entry.mjs';pkg.engines={node:'24'};lock.name=pkg.name;Object.assign(lock.packages[''],{name:pkg.name,engines:pkg.engines});
await writeFile('api-runtime/package.json',JSON.stringify(pkg,null,2)+'\n');await writeFile('api-runtime/package-lock.json',JSON.stringify(lock,null,2)+'\n');
console.log('Prepared isolated partflow-batch-api codebase (all product switches default OFF).');

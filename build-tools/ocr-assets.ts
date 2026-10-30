import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
// Self-host executable OCR assets; only public language data is downloaded externally.
export function ocrAssets():Plugin{
 const assets=new Map<string,string>([['ocr/worker.min.js','tesseract.js/dist/worker.min.js'],...['','-simd','-relaxedsimd'].map((s):[string,string]=>[`ocr/tesseract-core${s}-lstm.wasm.js`,`tesseract.js-core/tesseract-core${s}-lstm.wasm.js`])]);
 return {name:'partflow-ocr-assets',generateBundle(){for(const [fileName,path] of assets)this.emitFile({type:'asset',fileName,source:readFileSync(resolve('node_modules',path))})},configureServer(server){server.middlewares.use((req,res,next)=>{const key=req.url?.replace(/^\//,'');const path=key&&assets.get(key);if(!path)return next();res.setHeader('Content-Type','application/javascript');res.end(readFileSync(resolve('node_modules',path)))})}};
}

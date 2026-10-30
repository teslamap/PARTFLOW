import {ocrAssets} from './build-tools/ocr-assets';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {standaloneHTML} from './build-tools/standalone-html';
export default defineConfig({plugins:[react(),ocrAssets(),standaloneHTML()],build:{rollupOptions:{input:Object.fromEntries(['index','customer','shop','admin','superadmin','mobile-customer','app','services'].map(r=>[r,resolve(import.meta.dirname,'entries',r+'.html')]))}}});

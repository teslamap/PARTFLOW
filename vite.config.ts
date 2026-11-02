import {mapAssets} from './build-tools/map-assets';
import {ocrAssets} from './build-tools/ocr-assets';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
import {standaloneHTML} from './build-tools/standalone-html';
export default defineConfig({plugins:[mapAssets(),react(),ocrAssets(),standaloneHTML()],build:{rollupOptions:{input:Object.fromEntries(['index','customer','shop','admin','superadmin','mobile-customer','app','services','towing'].map(r=>[r,resolve(import.meta.dirname,'entries',r+'.html')]))}}});

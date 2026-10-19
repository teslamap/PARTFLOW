import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({plugins:[react()],build:{rollupOptions:{input:Object.fromEntries(['index','customer','shop','admin','superadmin'].map(r=>[r,resolve(import.meta.dirname,r+'.html')]))}}});

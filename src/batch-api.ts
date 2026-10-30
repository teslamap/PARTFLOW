import {api} from './api';
export const batchEndpoint=import.meta.env.VITE_BATCH_API_BASE||import.meta.env.VITE_API_BASE||'';
export const batchApi=(action:string,data:any,anonymous=false)=>api(action,data,anonymous,batchEndpoint);

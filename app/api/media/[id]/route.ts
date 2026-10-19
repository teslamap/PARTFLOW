import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {getDb} from '../../../../db';
import {uploads,profiles,shops,requests} from '../../../../db/schema';
import {eq} from 'drizzle-orm';
import {visibleRequest} from '../../../core.mjs';
export async function GET(req:Request,{params}:any){const identity=await getChatGPTUser();if(!identity)return new Response('',{status:401});const {id}=await params;const db=getDb();const [u]=await db.select().from(uploads).where(eq(uploads.id,id));if(!u)return new Response('',{status:404});if(u.ownerId!==identity.userId){const [user]=await db.select().from(profiles).where(eq(profiles.id,identity.userId));const [raw]=await db.select().from(shops).where(eq(shops.ownerId,identity.userId));const shop=raw?{...raw,rules:JSON.parse(raw.rules)}:null;const rs=await db.select().from(requests);if(!user||!rs.some(r=>JSON.parse(r.photos).includes(id)&&visibleRequest(r,user,shop)))return new Response('',{status:403});}const object=await env.BUCKET?.get(id);if(!object)return new Response('',{status:404});return new Response(object.body,{headers:{'Content-Type':u.mime,'Cache-Control':'private, max-age=3600','X-Content-Type-Options':'nosniff'}});}

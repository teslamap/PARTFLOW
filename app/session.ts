import {getChatGPTUser} from './chatgpt-auth';
import {getDb} from '../db';
import {profiles,shops,settings} from '../db/schema';
import {eq} from 'drizzle-orm';
import {CATEGORIES} from './core.mjs';
export async function context(){const identity=await getChatGPTUser();if(!identity)return null;const db=getDb();await db.insert(profiles).values({id:identity.userId,name:identity.displayName,email:identity.email,role:'customer',createdAt:new Date().toISOString()}).onConflictDoNothing();
// The initial Site is owner-private. Only its authenticated owner can claim setup.
await db.insert(settings).values({id:'initial_owner',value:identity.userId}).onConflictDoNothing();const [owner]=await db.select().from(settings).where(eq(settings.id,'initial_owner'));if(owner.value===identity.userId)await db.update(profiles).set({role:'superadmin'}).where(eq(profiles.id,identity.userId));const [user]=await db.select().from(profiles).where(eq(profiles.id,identity.userId));const [raw]=await db.select().from(shops).where(eq(shops.ownerId,user.id));const shop=raw?{...raw,rules:JSON.parse(raw.rules)}:null;const [cat]=await db.select().from(settings).where(eq(settings.id,'categories'));return {db,user,shop,categories:cat?JSON.parse(cat.value):CATEGORIES};}

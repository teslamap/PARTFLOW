export const EXPANSION_DELAY=15*60*1000;
const millis=v=>v?.toMillis?.()??(typeof v==='string'?Date.parse(v):Number(v));
// Migrated requests use the authoritative audience written by the scheduler/owner.
// Unmigrated requests retain legacy behavior during the staged rollout.
export function searchExpanded(r,now=Date.now()){
 return r.searchScope==='city'&&r.status==='open'&&!r.acceptedOfferId&&(r.audience!==undefined?r.audience==='national':r.expandedAt!=null||Number.isFinite(millis(r.createdAt))&&now-millis(r.createdAt)>=EXPANSION_DELAY);
}
export function searchMatchesCity(r,city,now=Date.now()){
 return r.searchScope!=='city'||r.city===city||r.audience==='national'||searchExpanded(r,now);
}

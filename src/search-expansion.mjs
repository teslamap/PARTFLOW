export const EXPANSION_DELAY=15*60*1000;
const millis=v=>v?.toMillis?.()??(typeof v==='string'?Date.parse(v):Number(v));
// Legacy requests retain their existing nationwide matching. No migration needed.
export function searchExpanded(r,now=Date.now()){
 return r.searchScope==='city'&&r.status==='open'&&!r.acceptedOfferId&&(r.expandedAt!=null||Number.isFinite(millis(r.createdAt))&&now-millis(r.createdAt)>=EXPANSION_DELAY);
}
export function searchMatchesCity(r,city,now=Date.now()){
 return r.searchScope!=='city'||r.city===city||searchExpanded(r,now);
}

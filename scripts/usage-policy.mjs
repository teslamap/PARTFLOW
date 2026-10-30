export function usageStatus(used,limit){
 if(!Number.isFinite(used)||used<0||!Number.isFinite(limit)||limit<=0)return 'unknown';
 return used>=limit?'critical':used>=limit*.8?'warning':'ok';
}
export function metricValue(series,kind){
 if(!Array.isArray(series)||!series.length)throw Error('No metric samples');
 const values=series.map(s=>{
  const points=s.points;if(!Array.isArray(points)||!points.length)throw Error('No metric samples');
  const read=p=>{const v=Number(p.value?.int64Value??p.value?.doubleValue??NaN);if(!Number.isFinite(v)||v<0)throw Error('Invalid metric sample');return v};
  return kind==='gauge'?read([...points].sort((a,b)=>Date.parse(b.interval.endTime)-Date.parse(a.interval.endTime))[0]):points.reduce((n,p)=>n+read(p),0);
 });
 return values.reduce((a,b)=>a+b,0);
}

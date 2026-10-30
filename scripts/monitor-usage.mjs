import {readFile,writeFile} from 'node:fs/promises';
import {usageStatus,metricValue} from './usage-policy.mjs';
const config=JSON.parse(await readFile(process.argv[2]||'monitoring.config.json','utf8'));
const now=new Date(),end=now.toISOString();
async function json(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Provider HTTP '+r.status);const d=await r.json();if(d.error||d.errors?.length)throw Error('Provider rejected metric query');return d}
async function collect(m){
 const start=new Date(now.getTime()-m.windowHours*3600000).toISOString();
 if(m.provider==='gcp'){
  if(!process.env.GOOGLE_ACCESS_TOKEN)throw Error('Google credential missing');
  const q=new URLSearchParams({filter:m.filter,'interval.startTime':start,'interval.endTime':end,pageSize:'1000'});
  let series=[],page;
  do{if(page)q.set('pageToken',page);const d=await json(`https://monitoring.googleapis.com/v3/projects/${config.project}/timeSeries?${q}`,{headers:{Authorization:'Bearer '+process.env.GOOGLE_ACCESS_TOKEN}});series.push(...d.timeSeries||[]);page=d.nextPageToken}while(page);
  // Missing telemetry is unknown, never assumed zero. Gauge windows must cover reporting lag.
  if(series.some(s=>!s.points?.some(p=>Date.parse(p.interval.endTime)>now.getTime()-(m.maxAgeHours||m.windowHours)*3600000)))throw Error('Stale metric');
  return metricValue(series,m.kind);
 }
 if(m.provider==='cloudflare'){
  if(!process.env.CLOUDFLARE_ANALYTICS_TOKEN||!process.env.CLOUDFLARE_ACCOUNT_ID)throw Error('Cloudflare credential missing');
  const storage=m.kind==='r2-bytes';
  const query=storage?`query($account:string!,$start:Time,$end:Time,$bucket:string){viewer{accounts(filter:{accountTag:$account}){r2StorageAdaptiveGroups(limit:1,filter:{datetime_geq:$start,datetime_leq:$end,bucketName:$bucket},orderBy:[datetime_DESC]){max{payloadSize metadataSize} dimensions{datetime}}}}}`:`query($account:string!,$start:string,$end:string,$script:string){viewer{accounts(filter:{accountTag:$account}){workersInvocationsAdaptive(limit:10000,filter:{datetime_geq:$start,datetime_leq:$end,scriptName:$script}){sum{requests errors}}}}}`;
  const d=await json('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_ANALYTICS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query,variables:{account:process.env.CLOUDFLARE_ACCOUNT_ID,start,end,...(storage?{bucket:m.bucket}:{script:m.script})}})});
  const a=d.data?.viewer?.accounts?.[0],rows=a?.[storage?'r2StorageAdaptiveGroups':'workersInvocationsAdaptive'];
  if(!rows?.length||rows.length>=10000)throw Error('Missing or truncated analytics');
  if(storage){if(Date.parse(rows[0].dimensions.datetime)<now.getTime()-(m.maxAgeHours||24)*3600000)throw Error('Stale storage metric');return Number(rows[0].max.payloadSize)+Number(rows[0].max.metadataSize)}
  return rows.reduce((n,r)=>n+Number(r.sum[m.kind==='worker-errors'?'errors':'requests']),0);
 }
 throw Error('Unknown provider');
}
if(!config.metrics?.length)throw Error('No metrics configured');
const results=[];
for(const m of config.metrics){
 try{if(!/^[a-z0-9_-]+$/.test(m.name)||!Number.isFinite(m.windowHours)||m.windowHours<=0||!Number.isFinite(m.limit)||m.limit<=0)throw Error('Invalid monitor configuration');const used=await collect(m);results.push({name:m.name,used,limit:m.limit,status:usageStatus(used,m.limit)})}
 catch(e){results.push({name:m.name,status:'unknown',error:e.message})}
}
const report={checkedAt:end,results};
console.log(JSON.stringify(report,null,2));
if(process.env.MONITOR_REPORT_PATH)await writeFile(process.env.MONITOR_REPORT_PATH,JSON.stringify(report,null,2));
// GitHub Actions failure notifications are the alert channel; no customer data or tokens in reports.
if(results.some(r=>r.status!=='ok'))process.exitCode=1;

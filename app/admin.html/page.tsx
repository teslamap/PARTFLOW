import {PanelPage} from '../panel-page';
export const dynamic='force-dynamic';
export const metadata={title:'PARTFLOW — ადმინი'};
export default async function Page({searchParams}:any){const q=await searchParams;return <PanelPage role="admin" demo={q?.demo==='1'}/>}

import {PanelPage} from '../panel-page';
export const dynamic='force-dynamic';
export const metadata={title:'PARTFLOW — სუპერადმინი'};
export default async function Page({searchParams}:any){const q=await searchParams;return <PanelPage role="superadmin" demo={q?.demo==='1'}/>}

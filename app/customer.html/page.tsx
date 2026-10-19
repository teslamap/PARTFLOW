import {PanelPage} from '../panel-page';
export const dynamic='force-dynamic';
export const metadata={title:'PARTFLOW — მომხმარებელი'};
export default async function Page({searchParams}:any){const q=await searchParams;return <PanelPage role="customer" demo={q?.demo==='1'}/>}

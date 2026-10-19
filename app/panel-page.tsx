import Partflow from './partflow';
import {context} from './session';
import {redirect} from 'next/navigation';
export async function PanelPage({role,demo}:{role:string,demo:boolean}){
  if(demo)return <Partflow initialRole={role} initialDemo/>;
  const session=await context();
  if(!session)redirect('/signin-with-chatgpt?return_to='+encodeURIComponent('/'+role+'.html'));
  const actual=session.user.role;
  const permitted=role==='admin'?['admin','superadmin'].includes(actual):role==='superadmin'?actual==='superadmin':true;
  if(!permitted)return <main style={{margin:'10vh auto',maxWidth:600,padding:30,width:'90%'}}><h1>წვდომა შეზღუდულია</h1><p style={{margin:'16px 0'}}>ამ პანელის გასახსნელად შესაბამისი უფლება გჭირდება.</p><a className="primary" href="/customer.html">მომხმარებლის პანელი</a><p style={{marginTop:20}}><a href={'/'+role+'.html?demo=1'}>პანელის დემოს ნახვა →</a></p></main>;
  return <Partflow initialRole={role}/>;
}

import {useState} from 'react';
import {signOut} from 'firebase/auth';
import {Car,LogOut,Menu,X} from 'lucide-react';
import {auth} from './firebase';
import {TowDriverPanel} from './towing-ui';
export function TowingApp({user,demo=false}:any){
 const [menu,setMenu]=useState(false);
 return <div className="app"><aside className={menu?'sidebar show':'sidebar'}><button className="sidebar-close" aria-label="მენიუს დახურვა" onClick={()=>setMenu(false)}><X size={22}/></button><a className="logo" href="towing.html">PART<span>FLOW</span></a><div className="workspace-label">მძღოლის სამუშაო სივრცე</div><div className="role-switch"><Car size={20}/><strong>ევაკუატორი</strong></div><div className="nav-label">მენიუ</div><nav><button className="nav-item active" onClick={()=>setMenu(false)}><Car size={19}/>გამოძახებები / მძღოლის პროფილი</button></nav><a className="demo-toggle" href={'towing.html'+(demo?'':'?demo=1')}>{demo?'დემოდან გამოსვლა':'დემოს ნახვა'}</a><div className="profile"><div className="avatar">{user.name?.slice(0,1)||'E'}</div><div><b>{user.name}</b><small>ევაკუატორის მძღოლი</small></div><button aria-label="ანგარიშიდან გასვლა" onClick={()=>demo?location.assign('towing.html'):void signOut(auth)}><LogOut size={18}/></button></div></aside><main><header><div className="breadcrumb"><button className="mobile-menu" aria-label="მენიუს გახსნა" onClick={()=>setMenu(true)}><Menu size={20}/></button><span>ევაკუატორი</span><b>მძღოლის პანელი</b></div></header><div className="content"><TowDriverPanel user={user} demo={demo}/></div></main></div>;
}

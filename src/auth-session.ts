import {getApps,initializeApp,type FirebaseOptions} from 'firebase/app';
import {initializeAuth,browserLocalPersistence,browserSessionPersistence,inMemoryPersistence,browserPopupRedirectResolver,connectAuthEmulator} from 'firebase/auth';
export const PANEL_ROLES=['customer','shop','admin','superadmin','mobile-customer'] as const;
export type PanelRole=typeof PANEL_ROLES[number];
export function createPanelSession(config:FirebaseOptions,role:string,emulatorURL?:string){
  if(role!=='services'&&!PANEL_ROLES.includes(role as PanelRole))throw Error('Unknown PARTFLOW panel');
  // Firebase persistence keys include the app name. Each panel therefore gets
  // a different sessionStorage key, even on the same origin and in one tab.
  const name='partflow-panel-'+role;
  const app=getApps().find(a=>a.name===name)||initializeApp(config,name);
  const nativeWebView=typeof navigator!=='undefined'&&navigator.userAgent.includes('PartflowAndroid/');
  const auth=initializeAuth(app,{persistence:role==='services'?[inMemoryPersistence]:[role==='mobile-customer'||nativeWebView?browserLocalPersistence:browserSessionPersistence,inMemoryPersistence],popupRedirectResolver:browserPopupRedirectResolver});
  if(emulatorURL)connectAuthEmulator(auth,emulatorURL,{disableWarnings:true});
  return {app,auth};
}

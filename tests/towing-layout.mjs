import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
// Browser-only entry selection is needed at module initialization; no live
// Firebase calls run during server rendering (all subscriptions are effects).
globalThis.document={documentElement:{dataset:{role:'customer'}}};
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}});
globalThis.location={search:'',href:'http://localhost/customer.html'};
const server=await createServer({server:{middlewareMode:true},appType:'custom',plugins:[{name:'isolated-test-firebase',enforce:'pre',resolveId(source,importer){if(source==='./firebase'&&importer?.includes('/src/'))return 'virtual:test-firebase'},load(id){if(id==='virtual:test-firebase')return 'export const auth={currentUser:null},db={},app={},config={},appCheckReady=Promise.resolve(false);export async function androidAppCheckToken(){return null}';}}]});
try{
 const {CustomerTowing,TowDriverPanel,TowDriverApprovals}=await server.ssrLoadModule('/src/towing-ui.tsx');
 const {AdminShopMap,CustomerShopMap}=await server.ssrLoadModule('/src/shop-map.tsx');
 const allShops=Array.from({length:350},(_,i)=>({id:'s'+i,name:'Map Shop '+i,city:'ბათუმი',status:'approved'}));const adminMap=renderToStaticMarkup(createElement(AdminShopMap,{demo:true,shops:allShops}));assert.match(adminMap,/Map Shop 349/);assert.match(adminMap,/pf-map-large/);
 const chosen=renderToStaticMarkup(createElement(CustomerShopMap,{data:{user:{id:'u'},shops:[{id:'winner',name:'Winning shop',city:'ბათუმი'},{id:'loser',name:'Competing shop',city:'თბილისი'}],requests:[{id:'r',ownerId:'u',acceptedOfferId:'o',part:'Part'}],offers:[{id:'o',requestId:'r',shopId:'winner'}]}}));assert.match(chosen,/Winning shop/);assert.doesNotMatch(chosen,/Competing shop/);
 const {TowingApp}=await server.ssrLoadModule('/src/towing-app.tsx');
 const App=(await server.ssrLoadModule('/src/partflow.tsx')).default;
 const render=(C,props={})=>renderToStaticMarkup(createElement(C,{user:{name:'Test',role:'customer'},demo:true,...props}));
 const customer=render(CustomerTowing),scheduled=render(CustomerTowing,{initialMode:'intercity'}),driver=render(TowDriverPanel),admin=render(TowDriverApprovals,{user:{name:'Admin',role:'admin'}});
 assert.match(customer,/SOS — სასწრაფო/);assert.match(customer,/ჩემი მდებარეობის დაფიქსირება/);
 const liveCustomer=render(CustomerTowing,{demo:false});assert.match(liveCustomer,/მდებარეობაზე წვდომას მოგთხოვს/);assert.doesNotMatch(liveCustomer,/<button[^>]*disabled[^>]*>ევაკუატორის გამოძახება/);
 assert.doesNotMatch(customer,/მძღოლის რეგისტრაცია|დამტკიცებაზე გაგზავნა|მძღოლების დამტკიცება/);
 assert.match(scheduled,/name="pickupAt"/);assert.match(scheduled,/type="datetime-local" required/);
 assert.doesNotMatch(scheduled,/ჩემი მდებარეობის დაფიქსირება/);
 assert.match(driver,/ევაკუატორის მძღოლის რეგისტრაცია/);assert.match(driver,/დამტკიცებაზე გაგზავნა/);assert.ok(driver.includes('ევაკუატორი / SOS რუკა'));assert.match(driver,/ჩემი მდებარეობის დაფიქსირება/);
 for(const html of [driver,admin])assert.doesNotMatch(html,/name="origin"|name="destination"|name="pickupAt"/);
 assert.doesNotMatch(admin,/დამტკიცებაზე გაგზავნა/);
 const driverPage=render(TowingApp);assert.match(driverPage,/მძღოლის პანელი/);assert.doesNotMatch(driverPage,/ჩემი გარაჟი|ავტოსერვისები|ნაწილის დამატება/);
 for(const role of ['shop','admin','superadmin']){const html=render(App,{initialRole:role,initialDemo:true});assert.doesNotMatch(html,/SOS \/ დაგეგმილი|SOS — ევაკუატორის გამოძახება|name="pickupAt"|მძღოლის რეგისტრაცია/);}
 globalThis.location.search='?demo=1';const MobileCustomer=(await server.ssrLoadModule('/src/mobile-customer.tsx')).default;const mobile=render(MobileCustomer);assert.match(mobile,/SOS — ევაკუატორი/);assert.match(mobile,/დაგეგმილი გადაყვანა/);assert.doesNotMatch(mobile,/მძღოლის რეგისტრაცია/);
 const customerPage=render(App,{initialRole:'customer',initialDemo:true});assert.match(customerPage,/SOS — ევაკუატორის გამოძახება/);assert.match(customerPage,/დაგეგმილი გადაყვანა/);
 console.log('PASS: customer-only SOS/scheduled forms, independent driver page and no towing forms in shop/admin panels');
}finally{await server.close();delete globalThis.document;delete globalThis.location;delete globalThis.localStorage;}

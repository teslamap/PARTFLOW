import {VEHICLES} from './core.mjs';
// Deliberately partial: WMI identifies a manufacturer, never an exact model/year.
export function localVinDetails(vin){
 const wmi=String(vin||'').slice(0,3);
 const brand=({JTD:'Toyota',JTN:'Toyota',JT2:'Toyota',JT3:'Toyota',WBA:'BMW',WBS:'BMW',WDB:'Mercedes',WDD:'Mercedes',WDC:'Mercedes',WVW:'Volkswagen',WAU:'Audi',JHM:'Honda',KMH:'Hyundai',KNA:'Kia',JN1:'Nissan','5YJ':'Tesla','7SA':'Tesla'})[wmi]||'';
 return {brand,model:'',year:'',engine:'',trim:'',fuel:''};
}
export function certificateFields(text,confidence=0){
 const blank={vin:'',plate:'',brand:'',model:'',year:'',engine:'',trim:'',fuel:''};
 if(typeof text!=='string'||confidence<70)return blank;
 const t=text.toUpperCase(),one=items=>{const values=[...new Set(items)];return values.length===1?values[0]:''};
 const vin=one(t.match(/\b[A-HJ-NPR-Z0-9]{17}\b/g)||[]);
 const plate=one((t.match(/\b[A-Z]{2}[- ]?\d{3}[- ]?[A-Z]{2}\b/g)||[]).map(v=>v.replace(/[- ]/g,'')));
 const brands=Object.keys(VEHICLES).filter(b=>new RegExp('\\b'+b.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(t));
 const wmiBrand=localVinDetails(vin).brand,readBrand=one(brands);
 const brand=brands.length>1||readBrand&&wmiBrand&&readBrand!==wmiBrand?'':readBrand||wmiBrand;
 const models=(VEHICLES[brand]||[]).filter(m=>new RegExp('\\b'+m.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(t));
 // Years and engine sizes need field labels; dates of registration are not model years.
 const years=[...t.matchAll(/(?:MODEL YEAR|YEAR OF MANUFACTURE|გამოშვების წელი)\s*[:\-]?\s*((?:19|20)\d{2})\b/g)].map(m=>m[1]);
 const year=one(years);
 const engine=one([...t.matchAll(/(?:ENGINE CAPACITY|DISPLACEMENT|ძრავის მოცულობა)\s*[:\-]?\s*(\d{3,4}\s*(?:CM3|CC)|[0-9]\.[0-9]\s*L)\b/g)].map(m=>m[1]));
 const fuel=one([...t.matchAll(/(?:FUEL(?: TYPE)?|საწვავი)\s*[:\-]?\s*(PETROL|GASOLINE|DIESEL|HYBRID|ELECTRIC)\b/g)].map(m=>m[1]));
 return {...blank,vin,plate,brand,model:one(models),engine,fuel,year:Number(year)>=1950&&Number(year)<=new Date().getFullYear()+1?year:''};
}

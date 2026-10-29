import {VEHICLES} from './core.mjs';
export const normalizeVin=value=>String(value||'').trim().toUpperCase();
export function validateVin(value){const vin=normalizeVin(value);if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))throw Error('VIN უნდა შეიცავდეს 17 სიმბოლოს; I, O და Q არ გამოიყენება.');return vin}
const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function decodedVehicle(data){
 if(!data||typeof data!=='object')throw Error('VIN-ის პასუხი ვერ ამოიცნო. შეავსე ხელით.');
 const aliases={mercedesbenz:'Mercedes',vw:'Volkswagen',landrover:'Land Rover'};
 const brand=aliases[normalize(data.Make)]||Object.keys(VEHICLES).find(b=>normalize(b)===normalize(data.Make))||'';
 const model=(VEHICLES[brand]||[]).find(m=>normalize(m)===normalize(data.Model))||'';
 const year=Number(data.ModelYear);
 return {brand,model,year:Number.isInteger(year)&&year>=1950&&year<=new Date().getFullYear()+1?String(year):'',engine:[data.DisplacementL?`${data.DisplacementL} ლ`:'',data.EngineCylinders?`${data.EngineCylinders} ცილ.`:''].filter(Boolean).join(' ')||'უცნობია',trim:String(data.Trim||'').slice(0,80),fuel:String(data.FuelTypePrimary||'').slice(0,50),warning:!brand||!model||String(data.ErrorCode||'0').split(',').some(c=>c.trim()!=='0')};
}
export function validateGarageVehicle(d){
 if(!Object.hasOwn(VEHICLES,d.brand)||!VEHICLES[d.brand].includes(d.model))throw Error('აირჩიე მარკა და მოდელი.');
 const year=Number(d.year);if(!Number.isInteger(year)||year<1950||year>new Date().getFullYear()+1)throw Error('შეამოწმე გამოშვების წელი.');
 const engine=String(d.engine||'').trim();if(!engine||engine.length>80)throw Error('მიუთითე ძრავი ან „უცნობია“.');
 return {brand:d.brand,model:d.model,year,engine,vin:d.vin?validateVin(d.vin):'',trim:String(d.trim||'').trim().slice(0,80),fuel:String(d.fuel||'').trim().slice(0,50)};
}

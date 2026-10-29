import {collection,doc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {validateGarageVehicle} from './vehicle.mjs';
export async function saveGarageVehicle(db,uid,input){
 const value=validateGarageVehicle(input),vehicles=collection(db,'pf_garage',uid,'vehicles');
 const target=value.vin?doc(vehicles,'vin_'+value.vin):doc(vehicles);
 await runTransaction(db,async tx=>{if((await tx.get(target)).exists())throw Error('ეს ავტომობილი გარაჟში უკვე დამატებულია.');tx.set(target,{...value,createdAt:serverTimestamp()})});
 return target.id;
}

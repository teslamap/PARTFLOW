import {doc,setDoc} from 'firebase/firestore';

export async function createOfferRecord(db,requestId,shopId,value){
  // A deterministic document ID plus create-only rules provides atomic uniqueness.
  // Reading a nonexistent offer first is forbidden by participant-only read rules.
  await setDoc(doc(db,'pf_offers',requestId+'_'+shopId),value);
}

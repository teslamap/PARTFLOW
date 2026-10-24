export function pushTargets(kind,id,data){
 const base={requestId:data.requestId||id};
 if(kind==='message')return [{uid:data.recipientId,title:'ახალი შეტყობინება',data:{...base,offerId:data.offerId,section:'chat'}}];
 if(kind==='offer')return [{uid:data.ownerId,title:'ახალი შეთავაზება',data:{...base,offerId:id,section:'chat'}}];
 if(kind==='order')return [...new Set([data.ownerId,data.shopId])].map(uid=>({uid,title:'შეკვეთა განახლდა',data:{...base,orderId:id,section:'orders'}}));
 throw Error('Unknown push source');
}

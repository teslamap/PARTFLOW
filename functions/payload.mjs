export function pushTargets(kind,id,data){
 const base={requestId:data.requestId||id};
 if(kind==='message')return [...new Set(data.recipientIds||[data.recipientId])].map(uid=>({uid,title:data.kind==='admin_join'?'ადმინისტრატორი შემოუერთდა ჩატს':data.kind==='admin'?'ადმინისტრატორის შეტყობინება':'ახალი შეტყობინება',data:{...base,offerId:data.offerId,section:'chat'}}));
 if(kind==='confirmation')return [{uid:data.status==='pending'||data.status==='withdrawn'?data.ownerId:data.shopId,title:data.status==='pending'?'შეკვეთის დადასტურების მოთხოვნა':'შეკვეთის პასუხი განახლდა',data:{...base,offerId:data.offerId,section:'chat'}}];
 if(kind==='offer')return [{uid:data.ownerId,title:'ახალი შეთავაზება',data:{...base,offerId:id,section:'chat'}}];
 if(kind==='order')return [...new Set([data.ownerId,data.shopId])].map(uid=>({uid,title:'შეკვეთა განახლდა',data:{...base,orderId:id,section:'orders'}}));
 throw Error('Unknown push source');
}

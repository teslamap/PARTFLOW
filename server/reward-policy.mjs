export function qualifiesReferralReward({uid,orderId,order,referral,offer,request}){
 const created=order?.createdAt?.toMillis?.(),assigned=referral?.createdAt?.toMillis?.();
 return !!(referral&&order&&offer&&request&&referral.inviterId!==uid&&referral.inviterId!==order.shopId&&order.shopId!==uid&&order.ownerId===uid&&order.requestId===orderId&&order.status==='completed'&&order.dispute!=='open'&&Number.isFinite(created)&&Number.isFinite(assigned)&&created>=assigned&&offer.ownerId===uid&&offer.shopId===order.shopId&&offer.requestId===orderId&&request.ownerId===uid&&request.acceptedOfferId===order.offerId);
}
export function rewardBalance(points,award){
 const current=points??0;if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(award)||award<=0||award>10000||!Number.isSafeInteger(current+award))throw Error('Invalid reward policy or balance');
 return current+award;
}

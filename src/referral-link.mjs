const KEY='pf-pending-referral-v1',TTL=30*86400000;
export const validReferralCode=code=>typeof code==='string'&&/^[a-f0-9]{20}$/.test(code);
export function readPendingReferral(storage,now=Date.now()){
 try{const value=JSON.parse(storage.getItem(KEY)||'null');if(value&&validReferralCode(value.code)&&Number.isFinite(value.at)&&value.at<=now&&now-value.at<TTL)return value.code;storage.removeItem(KEY)}catch{}return '';
}
export function captureReferral(url,storage,now=Date.now()){
 const current=readPendingReferral(storage,now);if(current)return current;
 try{const code=new URL(url).searchParams.get('ref');if(validReferralCode(code)){storage.setItem(KEY,JSON.stringify({code,at:now}));return code}}catch{}return '';
}
export function clearReferral(storage){try{storage.removeItem(KEY)}catch{}}
export function referralShareUrl(base,code){if(!validReferralCode(code))throw Error('Invalid referral code');const url=new URL('customer.html',base);url.search='';url.hash='';url.searchParams.set('ref',code);return url.href}

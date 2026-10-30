export function serviceError(e){
 const code=String(e?.code||'').replace('firestore/','');
 if(code==='resource-exhausted'||e?.status===429)return 'სერვისის ლიმიტი დროებით ამოიწურა. მონაცემები არ წაშლილა. მოგვიანებით სცადე; განმეორებით გაგზავნამდე გადაამოწმე მოთხოვნების სია.';
 if(['unavailable','deadline-exceeded'].includes(code)||['TimeoutError','AbortError'].includes(e?.name))return 'კავშირი დროებით ვერ დამყარდა. შეინარჩუნე შეყვანილი მონაცემები და სცადე მოგვიანებით. განმეორებით გაგზავნამდე გადაამოწმე შედეგი.';
 return e?.message||'მოქმედება ვერ შესრულდა. სცადე მოგვიანებით.';
}

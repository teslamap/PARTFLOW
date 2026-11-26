export async function isSuperadmin(db,token,tx){
 if(!token?.uid)return false;
 const get=ref=>tx?tx.get(ref):ref.get();
 const policy=(await get(db.collection('pf_settings').doc('adminIdentity'))).data();
 if(token.superadmin===true&&token.email_verified===true)return true;
 if(policy?.claimsOnly===true)return false;
 if(token.email_verified===true&&token.email==='suloanani1@gmail.com')return true;
 return (await get(db.collection('pf_members').doc(token.uid))).data()?.role==='superadmin';
}

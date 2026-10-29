export function shouldUseAndroidAppCheck({isAndroid,enabled,bridgePresent}){
 return isAndroid===true&&enabled===true&&bridgePresent===true;
}
export function shouldCreateAnonymousAccount({isAndroid,enabled,appCheckReady,currentUser}){
 return isAndroid===true&&enabled===true&&appCheckReady===true&&!currentUser;
}

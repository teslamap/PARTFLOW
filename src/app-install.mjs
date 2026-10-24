export const ANDROID_PACKAGE_ID='com.partflow.customer';
export const ANDROID_APK_URL='https://github.com/teslamap/PARTFLOW/actions/workflows/android-apk.yml';
const INSTALLED_KEY='pf-app-install-installed-v1';
const SNOOZE_KEY='pf-app-install-snooze-v1';
const SNOOZE_MS=7*24*60*60*1000;

export function detectInstallPlatform(userAgent='',maxTouchPoints=0){
 const ua=String(userAgent);
 if(/Android/i.test(ua))return 'android';
 if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&maxTouchPoints>1))return 'ios';
 return 'other';
}

export function isRelatedAndroidAppInstalled(apps,packageId=ANDROID_PACKAGE_ID){
 return Array.isArray(apps)&&apps.some(app=>app?.platform==='play'&&app?.id===packageId);
}

function readStorage(key){try{return localStorage.getItem(key)}catch{return null}}
function writeStorage(key,value){try{localStorage.setItem(key,value)}catch{}}
function isStandalone(){return Boolean(window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone)}

export async function initAppInstallPrompt(){
 const role=document.documentElement.dataset.role;
 if(!['customer','mobile-customer'].includes(role)||new URLSearchParams(location.search).has('demo'))return;
 const platform=detectInstallPlatform(navigator.userAgent,navigator.maxTouchPoints||0);
 if(platform==='other'||isStandalone()||/PartflowAndroid\//i.test(navigator.userAgent))return;
 const installedAt=Number(readStorage(INSTALLED_KEY)||0);
 if(installedAt>Date.now()-180*24*60*60*1000)return;
 const snoozeUntil=Number(readStorage(SNOOZE_KEY)||0);
 if(snoozeUntil>Date.now())return;
 if(platform==='android'&&typeof navigator.getInstalledRelatedApps==='function'){
  try{if(isRelatedAndroidAppInstalled(await navigator.getInstalledRelatedApps()))return;}catch{/* Fall back to the user's saved choice. */}
 }
 window.setTimeout(()=>showPrompt(platform),900);
}

function showPrompt(platform){
 if(document.querySelector('.pf-install-backdrop'))return;
 const ios=platform==='ios';
 const backdrop=document.createElement('div');backdrop.className='pf-install-backdrop';
 backdrop.innerHTML=ios?`
  <section class="pf-install-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-install-title">
   <button class="pf-install-close" type="button" aria-label="დახურვა">×</button>
   <div class="pf-install-mark">PART<span>FLOW</span></div>
   <p class="pf-install-kicker">PARTFLOW · IPHONE</p>
   <h2 id="pf-install-title">დაამატე PARTFLOW მთავარ ეკრანზე</h2>
   <p class="pf-install-copy">გახსენით გაზიარების მენიუ <b>Safari</b>-ში და აირჩიეთ <b>„Add to Home Screen“</b>. შემდეგ PARTFLOW ხატულიდან, ბრაუზერის ზოლის გარეშე გაიხსნება.</p>
   <div class="pf-install-steps"><span>1</span> Safari-ში დააჭირე გაზიარების ღილაკს <span>2</span> აირჩიე „Add to Home Screen“</div>
   <button class="pf-install-primary" type="button" data-installed>დავამატე მთავარ ეკრანზე</button>
   <button class="pf-install-later" type="button" data-later>ახლა არა</button>
  </section>`:`
  <section class="pf-install-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-install-title">
   <button class="pf-install-close" type="button" aria-label="დახურვა">×</button>
   <div class="pf-install-mark">PART<span>FLOW</span></div>
   <p class="pf-install-kicker">PARTFLOW · ANDROID</p>
   <h2 id="pf-install-title">დააყენე PARTFLOW აპი</h2>
   <p class="pf-install-copy">გახსენი Android APK-ის გვერდი GitHub-ზე და ჩამოტვირთე ბოლო წარმატებული build-ის PARTFLOW-customer-live-APK არტეფაქტი. Android-მა შეიძლება მოგთხოვოს ამ ბრაუზერიდან აპების ინსტალაციის დაშვება.</p>
   <a class="pf-install-primary" href="${ANDROID_APK_URL}" target="_blank" rel="noreferrer" data-download>APK-ის ჩამოტვირთვის გვერდი</a>
   <button class="pf-install-installed" type="button" data-installed>აპი უკვე დავაყენე</button>
   <button class="pf-install-later" type="button" data-later>ახლა არა</button>
  </section>`;
 document.body.append(backdrop);
 const close=()=>{writeStorage(SNOOZE_KEY,String(Date.now()+SNOOZE_MS));backdrop.remove();document.removeEventListener('keydown',onKey);};
 const onKey=e=>{if(e.key==='Escape')close()};
 backdrop.addEventListener('click',e=>{if(e.target===backdrop)close()});
 backdrop.querySelector('.pf-install-close')?.addEventListener('click',close);
 backdrop.querySelector('[data-later]')?.addEventListener('click',close);
 backdrop.querySelector('[data-installed]')?.addEventListener('click',()=>{writeStorage(INSTALLED_KEY,String(Date.now()));backdrop.remove();document.removeEventListener('keydown',onKey)});
 backdrop.querySelector('[data-download]')?.addEventListener('click',()=>{writeStorage(SNOOZE_KEY,String(Date.now()+SNOOZE_MS))});
 document.addEventListener('keydown',onKey);
 backdrop.querySelector('.pf-install-primary')?.focus();
}

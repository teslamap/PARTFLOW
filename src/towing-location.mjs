// A single position per explicit customer action; never starts tracking.
export function locateTowCustomer(geolocation){
 return new Promise((resolve,reject)=>{
  if(!geolocation){reject(Error('მდებარეობის განსაზღვრა ამ მოწყობილობაზე მიუწვდომელია.'));return;}
  geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),e=>reject(Error(e.code===1?'მდებარეობაზე წვდომა დაბლოკილია. ბრაუზერში ამ საიტისთვის დაუშვი მდებარეობა და სცადე ხელახლა.':e.code===3?'მდებარეობის განსაზღვრას დრო ამოეწურა. ჩართე მოწყობილობის მდებარეობა და სცადე ხელახლა.':'მდებარეობა ვერ განისაზღვრა. ჩართე მოწყობილობის მდებარეობა და სცადე ხელახლა.')),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
 });
}

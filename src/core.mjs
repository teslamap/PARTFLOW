export const VEHICLES={
 Toyota:['Prius','Camry','Corolla','RAV4','Land Cruiser','Aqua','Yaris','Vitz','Highlander','Hilux','C-HR','Avensis','Wish','Noah','Sienna','4Runner','Prado','Passo','Ractis','ist'],
 Mercedes:['C-Class','E-Class','S-Class','A-Class','B-Class','CLA','CLS','GLA','GLC','GLE','GLS','ML','Sprinter','Vito'],
 BMW:['1 Series','2 Series','3 Series','4 Series','5 Series','6 Series','7 Series','X1','X3','X4','X5','X6','X7','M3','M5'],
 Honda:['Fit','Civic','CR-V','Accord','HR-V','Odyssey','Jazz','Stepwgn','Vezel','Insight'],
 Hyundai:['Elantra','Sonata','Tucson','Santa Fe','Getz','Accent','i30','i40','Kona','Creta','Starex','H-1'],
 Kia:['Optima','Sportage','Sorento','Rio','Picanto','Cerato','Forte','Niro','Soul','Carnival','Ceed'],
 Nissan:['Leaf','X-Trail','Juke','Qashqai','Note','Tiida','March','Serena','Teana','Pathfinder','Murano','Patrol','Rogue','Altima'],
 Ford:['Fusion','Focus','Escape','Explorer','Mustang','Transit','Fiesta','Mondeo','Edge','F-150'],
 Volkswagen:['Golf','Passat','Tiguan','Jetta','Polo','Touareg','Caddy','Transporter','Sharan','Touran'],
 Lexus:['CT','IS','ES','GS','LS','NX','RX','GX','LX','UX'],
 Subaru:['Forester','Outback','Impreza','Legacy','XV / Crosstrek','Tribeca','Levorg'],
 Tesla:['Model 3','Model Y','Model S','Model X'],
 Mazda:['Mazda 2','Mazda 3','Mazda 6','CX-3','CX-5','CX-7','CX-9','Demio','Axela','Premacy'],
 Mitsubishi:['Outlander','Pajero','Lancer','ASX','Colt','Delica','L200'],
 Chevrolet:['Cruze','Malibu','Equinox','Trax','Spark','Captiva','Camaro','Silverado'],
 Jeep:['Grand Cherokee','Cherokee','Wrangler','Compass','Renegade'],
 Renault:['Megane','Fluence','Duster','Kangoo','Logan','Clio'],
 Opel:['Astra','Corsa','Insignia','Zafira','Mokka'],
 Volvo:['S60','S80','S90','XC60','XC90','V40','V60'],
 Porsche:['Cayenne','Macan','Panamera','911'],
 Audi:['A3','A4','A6','A8','Q3','Q5','Q7','Q8'],
 Peugeot:['206','207','308','408','3008','Partner'],
 Suzuki:['Swift','Grand Vitara','Vitara','SX4','Jimny'],
 Dacia:['Duster','Logan','Sandero','Lodgy'],
 Skoda:['Octavia','Superb','Fabia','Rapid','Kodiaq'],
 Infiniti:['FX35','FX37','QX50','QX60','QX70'],
 Acura:['MDX','RDX','TLX','TSX'],
 'Land Rover':['Range Rover','Range Rover Sport','Discovery','Freelander','Defender'],
};
export const CATEGORIES=['ძრავა და კომპონენტები','გადაცემათა კოლოფი','ძარის ნაწილები','განათება','სავალი ნაწილი','სამუხრუჭე სისტემა','ელექტროობა','სალონი','საბურავები და დისკები','გაგრილება და კონდიცირება'];
export const CITIES=['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','თელავი','სხვა'];
export function inferPartCategory(part){const v=String(part||'').toLowerCase();if(['სამუხრუჭ','მუხრუჭ','კალოდ','სუპორტ','abs'].some(k=>v.includes(k)))return 'სამუხრუჭე სისტემა';const rules=[['განათება',['ფარ','ნათურ','ფოგ','სტოპ','ფარნ']],['ძრავა და კომპონენტები',['ძრავ','ტურბ','პორშინ','დგუშ','სარქველ','გენერატორ','სტარტერ']],['გადაცემათა კოლოფი',['კოლოფ','გადაცემ','სცეპლენ','გრიფ']],['სავალი ნაწილი',['ამორტიზატორ','ბერკეტ','შარავო','სავალი','стойк']],['ელექტროობა',['ელექტრ','აკუმულატორ','სენსორ','კოჭ','ფუზ']],['სალონი',['სალონ','სავარძ','ტორპედ']],['საბურავები და დისკები',['საბურავ','დისკი','დისკები']],['გაგრილება და კონდიცირება',['რადიატორ','კონდიციონერ','კომპრესორ','ვენტილატორ']],['ძარის ნაწილები',['ბამპერ','კაპოტ','ფრთ','კარი','სარკე','ცხაური','აბივკ']]];return rules.find(([,keys])=>keys.some(k=>v.includes(k)))?.[0]||'ძარის ნაწილები';}
export function matches(request,rules){return rules.some(r=>(r.brand==='*'||r.brand===request.brand)&&(r.model==='*'||r.model===request.model)&&(r.category==='*'||r.category===request.category));}
// Own requests stay visible for accounts used in both customer and shop panels.
// Sending an offer to oneself is separately prohibited by the form and rules.
export function shopPanelRequests(requests,shop){return requests.filter(r=>shop?.status==='approved'&&r.status!=='hidden'&&matches(r,shop.rules));}
export function visibleRequest(request,user,shop){return ['admin','superadmin'].includes(user.role)||request.ownerId===user.id||Boolean(shop&&shop.status==='approved'&&request.status!=='hidden'&&matches(request,shop.rules));}
export function cleanText(v,max=200){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw Error('შეამოწმე სავალდებულო ველები');return v.trim();}
export function validateRules(rules,categories=CATEGORIES){if(!Array.isArray(rules)||!rules.length||rules.length>10)throw Error('დაამატე მინიმუმ ერთი სპეციალიზაცია');return rules.map(r=>{if(!(r.brand==='*'||Object.hasOwn(VEHICLES,r.brand))||!(r.model==='*'||VEHICLES[r.brand]?.includes(r.model))||!(r.category==='*'||categories.includes(r.category)))throw Error('სპეციალიზაცია არასწორია');return {brand:r.brand,model:r.model,category:r.category};});}
export function validateRequest(d,categories=CATEGORIES){if(!Object.hasOwn(VEHICLES,d.brand)||!VEHICLES[d.brand].includes(d.model)||!categories.includes(d.category))throw Error('აირჩიე მარკა, მოდელი და კატეგორია');const year=Number(d.year);if(!Number.isInteger(year)||year<1950||year>new Date().getFullYear()+1)throw Error('წელი არასწორია');const budget=d.budget===''||d.budget==null?null:Number(d.budget);if(budget!==null&&(!Number.isFinite(budget)||budget<=0||budget>1000000))throw Error('ბიუჯეტი არასწორია');if(!['ნებისმიერი','ახალი','მეორადი'].includes(d.condition)||!CITIES.includes(d.city))throw Error('აირჩიე ქალაქი და მდგომარეობა');const vin=(d.vin||'').trim().toUpperCase();if(vin&&!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))throw Error('VIN უნდა შედგებოდეს 17 სიმბოლოსგან');return {brand:d.brand,model:d.model,year,engine:cleanText(d.engine,80),vin,category:d.category,part:cleanText(d.part,120),description:cleanText(d.description,2000),city:d.city,condition:d.condition,budget};}

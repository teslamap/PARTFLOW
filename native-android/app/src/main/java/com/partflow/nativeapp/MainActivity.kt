package com.partflow.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.Source
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.tasks.await
import org.json.JSONObject

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme(colorScheme=lightColorScheme(primary=Color(0xFF087C69),background=Color(0xFFF4F7F6))) { Surface(Modifier.fillMaxSize()) { Partflow() } } }
    }
}
data class Field(val key: String, val label: String, val choices: List<String> = emptyList(), val optional: Boolean = false)
data class Editor(val title: String, val key: String, val fields: List<Field>, val initial: Map<String,String> = emptyMap(), val save: suspend (Map<String,String>) -> Unit)

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun Partflow(vm: AppModel = viewModel()) {
    val user by vm.user.collectAsStateWithLifecycle()
    val member by vm.member.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val notice by vm.notice.collectAsStateWithLifecycle()
    var editor by remember { mutableStateOf<Editor?>(null) }
    var tab by rememberSaveable { mutableStateOf("") }
    var detail by remember { mutableStateOf<Record?>(null) }
    val r=vm.repo
    fun edit(title: String, key: String, fields: List<Field>, initial: Map<String,String> = emptyMap(), save: suspend (Map<String,String>)->Unit) { editor=Editor(title,key,fields,initial,save) }
    val choices = when(BuildConfig.ROLE) {
        "business" -> listOf("requests","offers","messages","confirmations","orders","business","services","support","profile","archive")
        "tow" -> listOf("available","assigned","driver","support","profile")
        "superadmin" -> listOf("shops","drivers","requests","orders","members","categories","packages","deletions","support","settings","control_audit")
        else -> listOf("requests","offers","messages","confirmations","orders","garage","tow","services","serviceOrders","support","archive","profile")
    }
    LaunchedEffect(user?.uid) { tab=choices.first(); detail=null; editor=null }
    Scaffold(topBar={ TopAppBar(title={ Text("PARTFLOW · ${BuildConfig.ROLE}",style=MaterialTheme.typography.titleMedium) },actions={ if(user!=null)TextButton(enabled=!busy,onClick={vm.logout()}){Text("გასვლა")} }) }) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().padding(horizontal=16.dp)) {
            if(busy)LinearProgressIndicator(Modifier.fillMaxWidth())
            if(notice.isNotEmpty())Text(notice,Modifier.padding(vertical=8.dp),color=if(notice=="შენახულია")MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
            if(user==null) { Login(vm); return@Column }
            if(member==null) { Text("ანგარიშის შემოწმება…"); TextButton(onClick={vm.run({vm.member.value=r.member()})}){Text("ხელახლა ცდა")}; return@Column }
            if(r.admin && member?.s("role")!="superadmin") { Text("ამ აპში შესვლა მხოლოდ სუპერადმინს შეუძლია."); return@Column }
            if(!r.admin && member?.s("role")=="superadmin") { Text("ამ ანგარიშისთვის გამოიყენე PARTFLOW Superadmin აპი."); return@Column }
            editor?.let { form ->
                BackHandler(enabled=!busy) { editor=null }
                EditForm(vm,form,onClose={editor=null})
                return@Column
            }
            detail?.let { selected ->
                BackHandler { detail=null }
                TextButton(onClick={detail=null}){Text("← უკან")}
                Detail(vm,selected,::edit)
                return@Column
            }
            ScrollableTabRow(selectedTabIndex=choices.indexOf(tab).coerceAtLeast(0),edgePadding=0.dp) {
                choices.forEach { key -> Tab(selected=tab==key,onClick={tab=key},text={Text(label(key))}) }
            }
            val feed=remember(tab,user?.uid,member?.s("role")) { feed(r,tab) }
            val owner=LocalLifecycleOwner.current
            LaunchedEffect(feed?.key,owner) {
                if(feed!=null)owner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                    vm.bind(feed)
                    try { awaitCancellation() } finally { vm.stop() }
                } else { vm.stop(); vm.rows.value=emptyList() }
            }
            val rows by vm.rows.collectAsStateWithLifecycle()
            val archived by vm.archives.collectAsStateWithLifecycle()
            val visibleRows=rows.filter { row -> (tab !in listOf("requests","offers") || "${tab}_${row.id}" !in archived) && (tab!="services" || row.s("businessType")=="auto_service") }
            val cached by vm.cached.collectAsStateWithLifecycle()
            val more by vm.more.collectAsStateWithLifecycle()
            if(cached)Text("ოფლაინ ასლი · ცვლილებისთვის საჭიროა კავშირი",style=MaterialTheme.typography.labelMedium)
            if(tab=="requests" && BuildConfig.ROLE=="customer")Button(enabled=!busy,onClick={ edit("ნაწილის მოთხოვნა","request",requestFields(r)) { r.request(it) } }){Text("+ ახალი მოთხოვნა")}
            if(tab=="garage")Button(enabled=!busy,onClick={ edit("ავტომობილის დამატება","garage",vehicleFields(r)) { r.garage(it) } }){Text("+ ავტომობილი")}
            if(tab=="tow")Button(enabled=!busy,onClick={ edit("ევაკუატორის გამოძახება","tow-request",listOf(Field("mode","რეჟიმი",listOf("sos","intercity")),Field("city","ქალაქი",r.options("towCities")),Field("destinationCity","დანიშნულების ქალაქი",r.options("towCities")),Field("origin","აყვანის მისამართი"),Field("destination","ჩაყვანის მისამართი"),Field("vehicle","ავტომობილი"),Field("condition","მდგომარეობა",listOf("rolls","blocked","accident")),Field("phone","ტელეფონი +9955XXXXXXXX"),Field("lat","SOS განედი",optional=true),Field("lng","SOS გრძედი",optional=true),Field("pickupAt","შორისაქალაქო დრო UTC: 2026-12-01T10:00:00Z",optional=true),Field("notes","შენიშვნა",optional=true))) { r.towRequest(it) } }){Text("+ გამოძახება")}
            if(tab=="driver")Button(enabled=!busy,onClick={edit("მძღოლის განაცხადი","driver",listOf(Field("name","სახელი"),Field("phone","ტელეფონი"),Field("city","ქალაქი",r.options("towCities")),Field("truck","ევაკუატორის აღწერა"))) { r.driver(it) }}){Text("რეგისტრაცია / განაცხადის განახლება")}
            if(tab=="business")Button(enabled=!busy,onClick={edit("მაღაზიის განაცხადი","shop",listOf(Field("name","სახელი"),Field("phone","ტელეფონი"),Field("city","ქალაქი",r.options("cities")),Field("brand","მარკა",listOf("*")+r.brands()),Field("model","მოდელი",listOf("*")),Field("category","კატეგორია",listOf("*")+r.options("categories")))){r.shop(it)}}){Text("რეგისტრაცია / ხელახალი განხილვა")}
            if(tab=="services" && BuildConfig.ROLE=="business")Button(enabled=!busy,onClick={edit("ავტოსერვისის დამატება","service",listOf(Field("name","სახელი"),Field("phone","ტელეფონი"),Field("city","ქალაქი",r.options("cities")))) { r.shop(it,true) }}){Text("+ ავტოსერვისი")}
            if(tab=="categories" && r.admin)Button(enabled=!busy,onClick={edit("კატეგორია","category",listOf(Field("name","სახელი"))) { v -> val name=Domain.text(v["name"],80); require(name !in r.options("categories")); r.ref("categories",name).set(mapOf("name" to name,"createdAt" to r.now())).await() }}){Text("+ კატეგორია")}
            if(tab=="packages" && r.admin)Button(enabled=!busy,onClick={edit("პაკეტის დამატება","package",packageFields(),mapOf("monthlyPriceGEL" to "100","maxServices" to "10","maxStaff" to "5","trialDays" to "30","graceDays" to "5")){r.packageSave(it)}}){Text("+ პაკეტი")}
            if(tab=="profile") {
                Text(member?.s("name").orEmpty(),Modifier.padding(12.dp),style=MaterialTheme.typography.titleLarge)
                Text(user?.email.orEmpty())
                Button(enabled=!busy,onClick={edit("პროფილის რედაქტირება","profile",listOf(Field("name","სახელი"),Field("city","ქალაქი",r.options("cities"))),mapOf("name" to member?.s("name").orEmpty(),"city" to member?.s("city").orEmpty())){v->r.ref("members",r.uid).update(mapOf("name" to Domain.text(v["name"],100),"city" to v["city"])).await()}}){Text("პროფილის შეცვლა")}
                TextButton(enabled=!busy,onClick={vm.run({r.auth.currentUser!!.sendEmailVerification().await()})}){Text("ელფოსტის დადასტურების გაგზავნა")}
                TextButton(enabled=!busy,onClick={vm.run({r.auth.currentUser!!.reload().await();r.auth.currentUser!!.getIdToken(true).await();vm.member.value=r.member()})}){Text("დადასტურებული ელფოსტის განახლება")}
            }
            if(tab=="settings" && r.admin)Settings(vm,::edit)
            if(tab=="support" && !r.admin) {
                val id=when(BuildConfig.ROLE){"business"->"shop_${r.uid}";"tow"->"driver_${r.uid}";else->r.uid}
                Button(onClick={detail=Record(id,"pf_support_threads/$id",emptyMap())}){Text("მხარდაჭერის ჩატის გახსნა")}
            }
            if(tab=="available" || tab=="requests" && BuildConfig.ROLE=="business") {
                MatchingFeed(vm,tab) { detail=it }
                return@Column
            }
            LazyColumn(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(10.dp),contentPadding=PaddingValues(vertical=12.dp)) {
                if(visibleRows.isEmpty())item { Text("ჩანაწერები არ არის",Modifier.padding(16.dp)) }
                items(visibleRows,key={it.path}) { row ->
                    Card(onClick={detail=row},modifier=Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(6.dp)) {
                            Text(title(row),style=MaterialTheme.typography.titleMedium)
                            Text(listOf(row.s("status"),row.s("city"),row.s("price").takeIf{it.isNotEmpty()}?.plus(" ₾").orEmpty()).filter{it.isNotEmpty()}.joinToString(" · "))
                            if(row.s("text").isNotEmpty())Text(row.s("text"))
                        }
                    }
                }
                if(more)item { TextButton(onClick={vm.loadMore()}){Text("მეტის ჩატვირთვა") } }
            }
        }
    }
}

fun label(key: String): String = mapOf("requests" to "მოთხოვნები","offers" to "შეთავაზებები","confirmations" to "დადასტურება","orders" to "შეკვეთები","garage" to "გარაჟი","tow" to "ევაკუატორი","services" to "ავტოსერვისები","serviceOrders" to "სერვისის შეკვეთები","business" to "ჩემი მაღაზია","driver" to "პროფილი","available" to "გამოძახებები","assigned" to "ჩემი რეისები","support" to "მხარდაჭერა","shops" to "ბიზნესები","drivers" to "მძღოლები","members" to "ანგარიშები","categories" to "კატეგორიები","packages" to "პაკეტები","archive" to "არქივი")[key] ?: key
fun title(row: Record) = listOf("part","name","vehicle","description","text","shopName","label").firstNotNullOfOrNull { row.s(it).takeIf(String::isNotBlank) } ?: row.id
fun feed(r: Repository,tab: String): Feed? {
    val field=if(BuildConfig.ROLE=="business")"shopId" else "ownerId"
    val q: Query = when(tab) {
        "requests" -> if(r.admin)r.query("requests") else if(BuildConfig.ROLE=="business")return null else r.query("requests","ownerId",r.uid)
        "offers","confirmations","orders","messages" -> if(r.admin)r.query(tab) else r.query(tab,field,r.uid)
        "garage" -> r.db.collection("pf_garage").document(r.uid).collection("vehicles")
        "tow" -> r.query("tow_requests","ownerId",r.uid)
        "assigned" -> r.query("tow_requests","driverId",r.uid)
        "available" -> return null // Explicit city/scope queries are built from the approved driver profile in Detail.
        "driver" -> r.query("tow_drivers","ownerId",r.uid)
        "drivers" -> r.query("tow_drivers")
        "business" -> r.query("shops","ownerId",r.uid)
        "services" -> if(BuildConfig.ROLE=="business")r.query("shops","ownerId",r.uid) else r.query("shops","businessType","auto_service").whereEqualTo("status","approved")
        "serviceOrders" -> return Feed(tab,label(tab),r.db.collectionGroup("serviceOrders").whereEqualTo("customerId",r.uid))
        "shops","members","categories","packages","control_audit" -> r.query(tab)
        "deletions" -> r.query(tab,"status","pending")
        "support" -> if(r.admin)r.query("support_threads") else return null
        "archive" -> r.db.collection("pf_archives").document(r.uid).collection("panels").document(if(BuildConfig.ROLE=="business")"shop" else "customer").collection("items")
        else -> return null
    }
    val time=if(tab in listOf("driver","drivers","support","confirmations"))"updatedAt" else "createdAt"
    return Feed(tab,label(tab),q.orderBy(time,Query.Direction.DESCENDING))
}
fun vehicleFields(r: Repository)=listOf(Field("brand","მარკა",r.brands()),Field("model","მოდელი"),Field("year","წელი"),Field("engine","ძრავი"),Field("vin","VIN",optional=true))
fun requestFields(r: Repository)=vehicleFields(r)+listOf(Field("category","კატეგორია",r.options("categories")),Field("part","ნაწილი"),Field("description","აღწერა"),Field("city","ქალაქი",r.options("cities")),Field("condition","მდგომარეობა",listOf("ნებისმიერი","ახალი","მეორადი")),Field("budget","ბიუჯეტი",optional=true))

@Composable fun Login(vm: AppModel) {
    var email by rememberSaveable { mutableStateOf("") }; var password by rememberSaveable { mutableStateOf("") }
    val busy by vm.busy.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(vertical=24.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
        Text("შედი PARTFLOW-ში",style=MaterialTheme.typography.headlineMedium)
        Text("${label(BuildConfig.ROLE)} · დამოუკიდებელი ნატიური აპი")
        OutlinedTextField(email,{email=it},label={Text("ელფოსტა")},singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Email),modifier=Modifier.fillMaxWidth())
        OutlinedTextField(password,{password=it},label={Text("პაროლი")},singleLine=true,visualTransformation=PasswordVisualTransformation(),modifier=Modifier.fillMaxWidth())
        Button(enabled=!busy,onClick={vm.run({vm.repo.auth.signInWithEmailAndPassword(email.trim(),password).await()})}){Text("შესვლა")}
        if(BuildConfig.ROLE!="superadmin")OutlinedButton(enabled=!busy,onClick={vm.run({vm.repo.auth.createUserWithEmailAndPassword(email.trim(),password).await()})}){Text("რეგისტრაცია")}
        TextButton(enabled=!busy,onClick={vm.run({vm.repo.auth.sendPasswordResetEmail(email.trim()).await()})}){Text("პაროლის აღდგენა")}
    }
}

@Composable fun EditForm(vm: AppModel, editor: Editor, onClose: ()->Unit) {
    val values=remember(editor.key) { mutableStateMapOf<String,String>() }
    var ready by remember(editor.key) { mutableStateOf(false) }
    val busy by vm.busy.collectAsStateWithLifecycle()
    val r=vm.repo
    LaunchedEffect(editor.key) {
        val saved=r.local.draft(r.uid,editor.key)
        if(saved!=null) { val o=JSONObject(saved.payload); o.keys().forEach { values[it]=o.getString(it) } }
        else values.putAll(editor.initial)
        values.putIfAbsent("_id",r.db.collection("pf_requests").document().id)
        editor.fields.forEach { f -> if(f.choices.isNotEmpty())values.putIfAbsent(f.key,f.choices.first()) }
        ready=true
    }
    LaunchedEffect(values.toMap(),ready) {
        if(ready) { kotlinx.coroutines.delay(400); r.local.saveDraft(Draft(r.uid,editor.key,JSONObject(values.toMap()).toString())) }
    }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(vertical=12.dp),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Text(editor.title,style=MaterialTheme.typography.headlineSmall)
        Text("შავი ვერსია ინახება ამ მოწყობილობაზე",style=MaterialTheme.typography.labelMedium)
        if(ready)editor.fields.forEach { f ->
            val options=if(f.key=="model") { val brand=values["brand"].orEmpty(); (if(f.choices.contains("*"))listOf("*") else emptyList()) + r.models(brand) } else f.choices
            if(options.isNotEmpty())Picker(f.label,values[f.key].orEmpty(),options,enabled=!busy) { chosen -> values[f.key]=chosen; if(f.key=="brand")values["model"]=if(f.choices.contains("*"))"*" else r.models(chosen).firstOrNull().orEmpty() }
            else OutlinedTextField(values[f.key].orEmpty(),{values[f.key]=it},label={Text(f.label+if(f.optional)" (არასავალდებულო)" else "")},enabled=!busy,modifier=Modifier.fillMaxWidth())
        }
        if(ready)NativeInputs(vm,editor,values,busy)
        Button(enabled=!busy&&ready,onClick={vm.run({
            editor.fields.filter{!it.optional}.forEach { Domain.text(values[it.key],3000) }
            editor.save(values.toMap()); r.local.deleteDraft(r.uid,editor.key)
        },onClose)}){Text("გაგზავნა")}
        TextButton(enabled=!busy,onClick=onClose){Text("უკან · შავი ვერსიის შენახვა")}
    }
}
@Composable fun Picker(label: String, value: String, options: List<String>, enabled: Boolean, select: (String)->Unit) {
    var open by remember { mutableStateOf(false) }
    OutlinedButton(enabled=enabled,onClick={open=true},modifier=Modifier.fillMaxWidth()){Text("$label: ${value.ifEmpty { "აირჩიე" }}")}
    if(open)AlertDialog(onDismissRequest={open=false},title={Text(label)},text={LazyColumn { items(options.distinct()) { s -> TextButton(onClick={select(s);open=false},modifier=Modifier.fillMaxWidth()){Text(s)} } }},confirmButton={TextButton(onClick={open=false}){Text("დახურვა")}})
}


package com.partflow.nativeapp

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.tasks.await

typealias Edit = (String,String,List<Field>,Map<String,String>,suspend (Map<String,String>)->Unit)->Unit

@Composable fun MatchingFeed(vm: AppModel, tab: String, select: (Record)->Unit) {
    val r=vm.repo
    var profile by remember(tab) { mutableStateOf<Record?>(null) }
    var rule by remember(tab) { mutableStateOf("") }
    val busy by vm.busy.collectAsStateWithLifecycle()
    val owner=LocalLifecycleOwner.current
    LaunchedEffect(tab,owner) {
        owner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            r.watch(r.ref(if(tab=="available")"tow_drivers" else "shops",r.uid).parent.whereEqualTo(com.google.firebase.firestore.FieldPath.documentId(),r.uid)).collect { page -> profile=page.records.firstOrNull() }
        }
    }
    val p=profile
    if(p?.s("status")!="approved") { Text("მოთხოვნების მისაღებად საჭიროა დამტკიცებული პროფილი.",Modifier.padding(16.dp)); return }
    val choices=if(tab=="available")listOf("city","all") else (p.data["rulesMap"] as? Map<*,*>)?.filterValues{it==true}?.keys?.map{it.toString()}.orEmpty()
    LaunchedEffect(choices) { if(rule !in choices)rule=choices.firstOrNull().orEmpty() }
    Picker(if(tab=="available")"არეალი" else "სპეციალიზაცია",rule,choices,!busy){rule=it}
    if(rule.isEmpty())return
    val q=remember(rule,tab,p) {
        if(tab=="available") {
            val base=r.query("tow_requests","status","searching").whereEqualTo("scope",rule)
            if(rule=="city")base.whereEqualTo("city",p.s("city")) else base
        } else {
            var base=r.query("requests").whereIn("status",listOf("open","closed"))
            rule.split("~").forEachIndexed { index,value -> if(value!="*")base=base.whereEqualTo(listOf("brand","model","category")[index],value) }
            base
        }
    }
    FeedList(vm,Feed("$tab:$rule",label(tab),q.orderBy("createdAt",Query.Direction.DESCENDING)),select)
}

@Composable fun FeedList(vm: AppModel, feed: Feed, select: (Record)->Unit = {}) {
    val owner=LocalLifecycleOwner.current
    LaunchedEffect(feed.key,owner) {
        owner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
            vm.bind(feed)
            try { awaitCancellation() } finally { vm.stop() }
        }
    }
    val rows by vm.rows.collectAsStateWithLifecycle()
    val more by vm.more.collectAsStateWithLifecycle()
    val cached by vm.cached.collectAsStateWithLifecycle()
    Column {
        if(cached)Text("შენახული ოფლაინ ასლი",style=MaterialTheme.typography.labelSmall)
        LazyColumn(verticalArrangement=Arrangement.spacedBy(8.dp),contentPadding=PaddingValues(vertical=8.dp),modifier=Modifier.heightIn(max=550.dp)) {
            if(rows.isEmpty())item{Text("ჩანაწერები არ არის")}
            items(rows,key={it.path}) { row -> Card(onClick={select(row)},modifier=Modifier.fillMaxWidth()) { Column(Modifier.padding(12.dp)) {
                Text(title(row)); Text(listOf(row.s("status"),row.s("city"),row.s("note")).filter{it.isNotBlank()}.joinToString(" · "),style=MaterialTheme.typography.bodySmall)
            } } }
            if(more)item{TextButton(onClick={vm.loadMore()}){Text("მეტის ჩატვირთვა")}}
        }
    }
}

@Composable fun Detail(vm: AppModel, original: Record, edit: Edit) {
    val r=vm.repo
    var row by remember(original.path) { mutableStateOf(original) }
    val busy by vm.busy.collectAsStateWithLifecycle()
    var section by remember(original.path) { mutableStateOf("") }
    val kind=row.path.substringBefore('/')
    val context=LocalContext.current
    val noteFields=listOf(Field("note","კომენტარი"))
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),verticalArrangement=Arrangement.spacedBy(10.dp)) {
        Text(title(row),style=MaterialTheme.typography.headlineSmall)
        listOf("status","city","brand","model","year","engine","vin","category","description","phone","truck","origin","destination","vehicle","quote","price","delivery","note","reviewReason","role","dispute").forEach { key ->
            if(row.s(key).isNotEmpty())Text("${fieldLabel(key)}: ${row.s(key)}")
        }
        TextButton(enabled=!busy,onClick={vm.run({row=r.db.document(row.path).get(Source.SERVER).await().record()})}){Text("განახლება")}
        when(kind) {
            "pf_requests" -> {
                if(BuildConfig.ROLE=="business" && row.s("status")=="open")Button(enabled=!busy,onClick={ edit("შეთავაზების გაგზავნა","offer:${row.id}",listOf(Field("price","ფასი ₾"),Field("condition","მდგომარეობა",listOf("ახალი","მეორადი")),Field("delivery","მიწოდების პირობები"),Field("note","კომენტარი")),emptyMap()){r.offer(row,it)} }){Text("შეთავაზება")}
                if(row.s("ownerId")==r.uid && row.s("status")=="open")OutlinedButton(enabled=!busy,onClick={vm.run({r.db.document(row.path).update("status","closed").await()})}){Text("მოთხოვნის დახურვა")}
                if(r.admin)OutlinedButton(enabled=!busy,onClick={vm.run({
                    r.db.runTransaction { tx -> val ref=r.db.document(row.path);val old=tx.get(ref);val hidden=old.getString("status")=="hidden";tx.update(ref,mapOf("status" to if(hidden)old.getString("previousStatus") else "hidden","previousStatus" to if(hidden)old.getString("previousStatus") else old.getString("status"))) }.await()
                })}){Text(if(row.s("status")=="hidden")"აღდგენა" else "დამალვა")}
                TextButton(onClick={section=if(section=="offers")"" else "offers"}){Text("შეთავაზებების ნახვა")}
            }
            "pf_offers" -> {
                TextButton(onClick={section="chat"}){Text("ჩატი")}
                if(row.s("shopId")==r.uid)Button(enabled=!busy,onClick={vm.run({r.confirmation(row)})}){Text("დადასტურების გაგზავნა")}
            }
            "pf_confirmations" -> if(row.s("status")=="pending") {
                if(row.s("ownerId")==r.uid)Button(enabled=!busy,onClick={vm.run({r.accept(row)})}){Text("მიღება და შეკვეთის შექმნა")}
                OutlinedButton(enabled=!busy,onClick={vm.run({r.db.document(row.path).update(mapOf("status" to if(row.s("ownerId")==r.uid)"declined" else "withdrawn","updatedAt" to r.now())).await()})}){Text("უარყოფა / გაუქმება")}
            }
            "pf_orders" -> {
                val actions=Domain.orderActions(row.s("status"),row.s("dispute"),row.s("ownerId")==r.uid,row.s("shopId")==r.uid,r.admin).toMutableList()
                if(row.s("dispute")=="none" && !r.admin)actions+="dispute"
                if(row.s("dispute")=="open" && r.admin)actions+="resolve"
                actions.forEach { action -> Button(enabled=!busy,onClick={edit(orderLabel(action),"order:${row.id}:$action",noteFields,emptyMap()){r.order(row,action,it.getValue("note"))}}){Text(orderLabel(action))} }
                TextButton(onClick={section="events"}){Text("ისტორია")}
            }
            "pf_tow_requests" -> {
                if(BuildConfig.ROLE=="tow" && row.s("status")=="searching")Button(enabled=!busy,onClick={edit("რეისის შეთავაზება","claim:${row.id}",listOf(Field("price","ფასი ₾")),emptyMap()){r.tow(row,"claim",it.getValue("price"))}}){Text("რეისის მიღება")}
                if(row.s("driverId")==r.uid && row.s("status") in Domain.towNext)Button(enabled=!busy,onClick={vm.run({r.tow(row,"advance")})}){Text(if(row.s("status")=="confirmed")"გზაში ვარ" else "გადაყვანა დაიწყო")}
                if(row.s("ownerId")==r.uid) {
                    val actions=buildList { if(row.s("status")=="offered")add("confirm");if(row.s("status") in listOf("searching","offered","confirmed"))add("cancel");if(row.s("status")=="transporting")add("complete");if(row.s("status")=="searching"&&row.s("scope")=="city")add("expand") }
                    actions.forEach { a -> OutlinedButton(enabled=!busy,onClick={vm.run({r.tow(row,a)})}){Text(mapOf("confirm" to "მძღოლის დადასტურება","cancel" to "გაუქმება","complete" to "დასრულების დადასტურება","expand" to "ყველა ქალაქი (15 წუთის შემდეგ)").getValue(a))} }
                }
                OutlinedButton(onClick={
                    val intent=Intent(Intent.ACTION_VIEW,Uri.parse("geo:0,0?q="+Uri.encode(row.s("origin"))))
                    if(intent.resolveActivity(context.packageManager)!=null)context.startActivity(intent)
                }){Text("მისამართი რუკაზე")}
            }
            "pf_shops","pf_tow_drivers" -> {
                if(r.admin) listOf("approved","suspended","rejected").forEach { status ->
                    Button(enabled=!busy,onClick={edit("სტატუსი: $status","moderate:${row.id}:$status",listOf(Field("reason","მიზეზი",optional=status=="approved")),emptyMap()){r.moderate(row,status,it["reason"].orEmpty())}}){Text(mapOf("approved" to "დამტკიცება","suspended" to "შეჩერება","rejected" to "უარყოფა").getValue(status))}
                }
                if(kind=="pf_shops" && row.s("businessType")=="auto_service") {
                    if(row.s("ownerId")!=r.uid && !r.admin)Button(enabled=!busy,onClick={edit("სერვისის შეკვეთა","service-order:${row.id}",listOf(Field("description","მომსახურების აღწერა")),emptyMap()) { v -> r.db.document(row.path).collection("serviceOrders").document(v.getValue("_id")).set(mapOf("businessId" to row.id,"customerId" to r.uid,"description" to Domain.text(v["description"],2000),"status" to "pending","createdAt" to r.now(),"updatedAt" to r.now())).await() }}){Text("მომსახურების მოთხოვნა")}
                    if(row.s("ownerId")==r.uid) {
                        Button(enabled=!busy,onClick={edit("მომსახურების დამატება","catalog:${row.id}",listOf(Field("name","სახელი"),Field("description","აღწერა",optional=true),Field("duration","ხანგრძლივობა წუთებში")),emptyMap()) { v -> val duration=v.getValue("duration").toInt();require(duration in 15..480 && duration%15==0);r.db.document(row.path).collection("catalog").document(v.getValue("_id")).set(mapOf("name" to Domain.text(v["name"],100),"description" to v["description"].orEmpty(),"durationMinutes" to duration,"active" to true,"createdAt" to r.now(),"updatedAt" to r.now())).await() }}){Text("+ მომსახურება")}
                        TextButton(onClick={section="serviceOrders"}){Text("სერვისის შეკვეთები")}
                    }
                    TextButton(onClick={section="catalog"}){Text("მომსახურებების სია")}
                }
            }
            "pf_support_threads" -> {
                OutlinedButton(enabled=!busy,onClick={vm.run({r.supportSession(row.id,true)})}){Text("სესიის გახსნა")}
                OutlinedButton(enabled=!busy,onClick={vm.run({r.supportSession(row.id,false)})}){Text("სესიის დახურვა")}
                Button(enabled=!busy,onClick={edit("მხარდაჭერა","support:${row.id}",listOf(Field("text","შეტყობინება")),emptyMap()){r.supportMessage(row.id,it.getValue("text"))}}){Text("მიწერა")}
                TextButton(onClick={section="supportMessages"}){Text("ისტორია")}
            }
            "pf_archives" -> Button(enabled=!busy,onClick={vm.run({r.db.document(row.path).delete().await()})}){Text("არქივიდან აღდგენა")}
            "pf_garage" -> {
                Button(enabled=!busy,onClick={edit("ნაწილის მოთხოვნა","request-car:${row.id}",requestFields(r),row.data.mapValues{it.value?.toString().orEmpty()}){r.request(it)}}){Text("ამ ავტომობილისთვის ნაწილის ძებნა")}
                OutlinedButton(enabled=!busy,onClick={vm.run({r.db.document(row.path).delete().await()})}){Text("ავტომობილის წაშლა")}
            }
        }
        if(row.path.contains("/serviceOrders/")) {
            val own=row.s("customerId")==r.uid
            val actions=if(own) { if(row.s("status") in listOf("pending","accepted"))listOf("cancelled") else emptyList() } else when(row.s("status")){"pending"->listOf("accepted","cancelled");"accepted"->listOf("completed","cancelled");else->emptyList()}
            actions.forEach { status -> Button(enabled=!busy,onClick={vm.run({r.db.document(row.path).update(mapOf("status" to status,"updatedAt" to r.now())).await()})}){Text(status)} }
        }
        if(!r.admin && kind in listOf("pf_requests","pf_offers"))TextButton(enabled=!busy,onClick={vm.run({
            val type=kind.removePrefix("pf_")
            r.db.collection("pf_archives").document(r.uid).collection("panels").document(if(BuildConfig.ROLE=="business")"shop" else "customer").collection("items").document("${type}_${row.id}").set(mapOf("type" to type,"targetId" to row.id,"label" to title(row).take(120),"createdAt" to r.now())).await()
        })}){Text("არქივში შენახვა")}
        if(section=="chat") {
            Button(enabled=!busy,onClick={edit("ჩატი","message:${row.id}",listOf(Field("text","შეტყობინება")),emptyMap()){r.message(row,it.getValue("text"))}}){Text("შეტყობინების გაგზავნა")}
            FeedList(vm,Feed("chat:${row.id}","ჩატი",r.query("messages","offerId",row.id).orderBy("createdAt",Query.Direction.DESCENDING)))
        }
        if(section=="offers")FeedList(vm,Feed("offers:${row.id}","შეთავაზებები",r.query("offers","requestId",row.id).let { if(r.admin)it else if(BuildConfig.ROLE=="business")it.whereEqualTo("shopId",r.uid) else it.whereEqualTo("ownerId",r.uid) }.orderBy("createdAt",Query.Direction.DESCENDING))) { selected -> row=selected;section="" }
        if(section=="events")FeedList(vm,Feed("events:${row.id}","ისტორია",r.db.document(row.path).collection("events").orderBy("createdAt",Query.Direction.DESCENDING)))
        if(section=="supportMessages")FeedList(vm,Feed("support:${row.id}","მხარდაჭერა",r.db.document(row.path).collection("messages").orderBy("createdAt",Query.Direction.DESCENDING)))
        if(section=="catalog")FeedList(vm,Feed("catalog:${row.id}","კატალოგი",r.db.document(row.path).collection("catalog").let { if(row.s("ownerId")==r.uid || r.admin)it else it.whereEqualTo("active",true) }.orderBy("createdAt",Query.Direction.DESCENDING)))
        if(section=="serviceOrders")FeedList(vm,Feed("serviceOrders:${row.id}","შეკვეთები",r.db.document(row.path).collection("serviceOrders").orderBy("createdAt",Query.Direction.DESCENDING))) { selected -> row=selected;section="" }
        Spacer(Modifier.height(24.dp))
    }
}
fun orderLabel(value: String)=mapOf("preparing" to "მომზადება","shipped" to "გაგზავნა","delivered" to "მიწოდება","completed" to "დასრულება","cancelled" to "გაუქმება","dispute" to "დავის გახსნა","resolve" to "დავის გადაწყვეტა")[value]?:value
fun fieldLabel(value: String)=mapOf("status" to "სტატუსი","city" to "ქალაქი","brand" to "მარკა","model" to "მოდელი","year" to "წელი","engine" to "ძრავი","category" to "კატეგორია","description" to "აღწერა","phone" to "ტელეფონი","truck" to "ევაკუატორი","origin" to "საიდან","destination" to "სად","vehicle" to "ავტომობილი","quote" to "ღირებულება","price" to "ფასი","delivery" to "მიწოდება","note" to "შენიშვნა","reviewReason" to "განხილვის მიზეზი","role" to "როლი","dispute" to "დავა")[value]?:value

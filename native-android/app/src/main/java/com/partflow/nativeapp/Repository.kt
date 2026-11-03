package com.partflow.nativeapp

import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

data class Record(val id: String, val path: String, val data: Map<String, Any?>) {
    fun s(key: String) = data[key]?.toString().orEmpty()
    fun n(key: String) = (data[key] as? Number)?.toLong() ?: 0L
    fun b(key: String) = data[key] == true
}
data class Page(val records: List<Record>, val cached: Boolean, val pending: Boolean = false, val cursor: DocumentSnapshot? = null)
fun DocumentSnapshot.record() = Record(id, reference.path, data.orEmpty())

class Repository(val auth: FirebaseAuth, val db: FirebaseFirestore, val local: LocalDao, val catalog: JSONObject) {
    val customCategories=kotlinx.coroutines.flow.MutableStateFlow<List<String>>(emptyList())
    val uid get() = auth.currentUser?.uid ?: error("შესვლა აუცილებელია")
    val admin get() = BuildConfig.ROLE == "superadmin"
    fun ref(collection: String, id: String) = db.collection("pf_$collection").document(id)
    fun now() = FieldValue.serverTimestamp()
    fun options(key: String) = catalog.getJSONArray(key).let { a -> (0 until a.length()).map(a::getString) }.let{if(key=="categories")(it+customCategories.value).distinct() else it}
    suspend fun refreshCategories() {
        val account=uid
        val savedPage=local.page(account,"_categories")
        customCategories.value=cached("_categories",account).map{it.s("name")}
        if(savedPage!=null && System.currentTimeMillis()-savedPage.savedAt<86_400_000L)return
        val records=query("categories").limit(300).get(Source.SERVER).await().documents.map{it.record()}
        if(auth.currentUser?.uid==account) { customCategories.value=records.map{it.s("name")};saveCache("_categories",records,account) }
    }
    fun brands() = catalog.getJSONObject("vehicles").keys().asSequence().toList().sorted()
    fun models(brand: String) = catalog.getJSONObject("vehicles").optJSONArray(brand)?.let { a -> (0 until a.length()).map(a::getString) }.orEmpty()
    suspend fun member(): Record {
        val r = ref("members", uid)
        val user = auth.currentUser!!
        val existing=r.get(Source.SERVER).await()
        if(existing.exists()) {
            if(user.isEmailVerified && user.email=="suloanani1@gmail.com" && existing.getString("role")!="superadmin") {
                r.update("role","superadmin").await()
                return existing.record().let{it.copy(data=it.data+mapOf("role" to "superadmin"))}
            }
            return existing.record()
        }
        db.runTransaction { tx ->
            if (!tx.get(r).exists()) tx.set(r, mapOf("name" to (user.displayName ?: "მომხმარებელი"), "role" to if(user.isEmailVerified && user.email=="suloanani1@gmail.com")"superadmin" else "customer", "createdAt" to now()))
        }.await()
        return r.get(Source.SERVER).await().record()
    }
    fun profile() = callbackFlow<Record?> {
        val registration = ref("members", uid).addSnapshotListener { s, e ->
            if (e != null) close(e) else if(s!=null && !(s.metadata.isFromCache && !s.exists()))trySend(s.takeIf { it.exists() }?.record())
        }
        awaitClose { registration.remove() }
    }
    fun watch(query: Query) = callbackFlow<Page> {
        val registration = query.addSnapshotListener(MetadataChanges.INCLUDE) { snap, error ->
            if (error != null) close(error)
            else if (snap != null) trySend(Page(snap.documents.map { it.record() }, snap.metadata.isFromCache, snap.metadata.hasPendingWrites(),snap.documents.lastOrNull()))
        }
        awaitClose { registration.remove() }
    }
    fun watchDocument(path: String) = callbackFlow<Record?> {
        val registration=db.document(path).addSnapshotListener { s,e ->
            if(e!=null)close(e) else if(s!=null && !(s.metadata.isFromCache && !s.exists()))trySend(s.takeIf{it.exists()}?.record())
        }
        awaitClose{registration.remove()}
    }
    fun query(collection: String, field: String? = null, value: Any? = null): Query {
        val q = db.collection("pf_$collection")
        return if (field == null) q else q.whereEqualTo(field, value)
    }
    suspend fun saveCache(scope: String, rows: List<Record>, account: String) {
        val a = JSONArray()
        rows.forEach { a.put(JSONObject().put("id", it.id).put("path", it.path).put("data", encode(it.data))) }
        local.save(CachedPage(account, scope, a.toString(), System.currentTimeMillis()))
        local.prune(System.currentTimeMillis() - 7 * 86_400_000L)
    }
    suspend fun cached(scope: String, account: String): List<Record> {
        val p = local.page(account, scope) ?: return emptyList()
        if (System.currentTimeMillis() - p.savedAt > 7 * 86_400_000L) return emptyList()
        val a = JSONArray(p.payload)
        return (0 until a.length()).map { a.getJSONObject(it).let { r -> Record(r.getString("id"), r.getString("path"), decode(r.getJSONObject("data")) as Map<String, Any?>) } }
    }
    private fun encode(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is Timestamp -> JSONObject().put("_timestamp", value.seconds).put("_nanos", value.nanoseconds)
        is Map<*, *> -> JSONObject().also { o -> value.forEach { (k, v) -> o.put(k.toString(), encode(v)) } }
        is List<*> -> JSONArray().also { a -> value.forEach { a.put(encode(it)) } }
        else -> value
    }
    private fun decode(value: Any?): Any? = when (value) {
        JSONObject.NULL -> null
        is JSONObject -> if (value.has("_timestamp")) Timestamp(value.getLong("_timestamp"), value.getInt("_nanos")) else value.keys().asSequence().associateWith { decode(value.get(it)) }
        is JSONArray -> (0 until value.length()).map { decode(value.get(it)) }
        else -> value
    }
    suspend fun request(v: Map<String, String>, photos: List<String> = emptyList()) {
        require(v["brand"] in brands() && v["model"] in models(v["brand"].orEmpty()))
        require(v["category"] in options("categories") && v["city"] in options("cities"))
        val budget = v["budget"].orEmpty().takeIf { it.isNotBlank() }?.let(Domain::money)
        val attachments=if(photos.isNotEmpty())photos else v["_photos"]?.let { raw -> JSONArray(raw).let { a -> (0 until a.length()).map(a::getString) } }.orEmpty()
        require(attachments.size<=4 && attachments.all{it.startsWith("data:image/jpeg;base64,")&&it.length<=180000})
        db.collection("pf_requests").document(v.getValue("_id")).set(mapOf(
            "brand" to v["brand"], "model" to v["model"], "year" to Domain.year(v["year"].orEmpty()),
            "engine" to Domain.text(v["engine"], 80), "vin" to Domain.vin(v["vin"].orEmpty()),
            "category" to v["category"], "part" to Domain.text(v["part"],120), "description" to Domain.text(v["description"],2000),
            "city" to v["city"], "condition" to v["condition"], "budget" to budget, "photos" to attachments,
            "ownerId" to uid, "status" to "open", "previousStatus" to "open", "acceptedOfferId" to null, "createdAt" to now()
        )).await()
    }
    suspend fun garage(v: Map<String, String>) {
        val vin = Domain.vin(v["vin"].orEmpty())
        require(v["brand"] in brands() && v["model"] in models(v["brand"].orEmpty()))
        val r = db.collection("pf_garage").document(uid).collection("vehicles").document(if (vin.isNotEmpty()) "vin_$vin" else v.getValue("_id"))
        db.runTransaction { tx ->
            require(!tx.get(r).exists()) { "ავტომობილი უკვე დამატებულია" }
            tx.set(r, mapOf("brand" to v["brand"], "model" to v["model"], "year" to Domain.year(v["year"].orEmpty()), "engine" to Domain.text(v["engine"],80), "vin" to vin, "trim" to "", "fuel" to "", "createdAt" to now()))
        }.await()
    }
    suspend fun shop(v: Map<String, String>, service: Boolean = false) {
        val target = if (service) "service_${v.getValue("_id")}" else uid
        val r = ref("shops", target)
        val value = mutableMapOf<String,Any?>("name" to Domain.text(v["name"],100), "city" to v["city"], "phone" to Domain.text(v["phone"],30), "status" to "pending")
        require(v["city"] in options("cities"))
        if (!service) value["rulesMap"] = mapOf("${v["brand"] ?: "*"}~${v["model"] ?: "*"}~${v["category"] ?: "*"}" to true)
        // A missing child service is not readable by ownerId rules. Create it
        // directly, just like the web client; never weaken those shared rules.
        if(service) {
            r.set(value+mapOf("ownerId" to uid,"businessType" to "auto_service","parentShopId" to uid,"rulesMap" to mapOf("*~*~*" to true),"createdAt" to now())).await()
            return
        }
        db.runTransaction { tx ->
            val old = tx.get(r)
            if (old.exists()) tx.update(r,value)
            else tx.set(r, value + mapOf("ownerId" to uid, "businessType" to if (service) "auto_service" else "parts_shop", "rulesMap" to (value["rulesMap"] ?: mapOf("*~*~*" to true)), "createdAt" to now()) + if (service) mapOf("parentShopId" to uid) else emptyMap())
        }.await()
    }
    suspend fun offer(request: Record, v: Map<String, String>) {
        val shop = ref("shops",uid).get(Source.SERVER).await()
        require(shop.getString("status") == "approved" && request.s("ownerId") != uid)
        ref("offers", "${request.id}_$uid").set(mapOf("requestId" to request.id,"ownerId" to request.s("ownerId"),"shopId" to uid,"shopName" to shop.getString("name"),"price" to Domain.money(v["price"].orEmpty()),"serviceAvailable" to false,"servicePrice" to 0,"condition" to v["condition"],"delivery" to Domain.text(v["delivery"],120),"note" to Domain.text(v["note"],1000),"status" to "pending","createdAt" to now())).await()
    }
    suspend fun message(offer: Record, text: String, join: Boolean = false) {
        val message = db.collection("pf_messages").document()
        val activity = ref("chat_activity", offer.id)
        db.runTransaction { tx ->
            val o = tx.get(ref("offers", offer.id)).record()
            val r = tx.get(ref("requests",o.s("requestId"))).record()
            val a = tx.get(activity)
            val profile=if(admin)tx.get(ref("members",uid)) else null
            val joinRef=ref("chat_admins","${offer.id}_$uid")
            val participation=if(admin)tx.get(joinRef) else null
            if(admin) {
                require(profile?.getString("role")=="superadmin")
                if(join && participation?.exists()==true)return@runTransaction
                require(join || participation?.exists()==true){"ჯერ შემოუერთდი ჩატს"}
            } else require(uid in listOf(o.s("ownerId"),o.s("shopId")))
            require(r.s("status") != "hidden" && (r.s("status") != "closed" || r.s("acceptedOfferId") == offer.id)) { "ჩატი დახურულია" }
            val body = Domain.text(text,2000)
            val common = mapOf("offerId" to offer.id,"requestId" to o.s("requestId"),"ownerId" to o.s("ownerId"),"shopId" to o.s("shopId"))
            val extra=if(admin)mapOf("kind" to if(join)"admin_join" else "admin","senderName" to profile!!.getString("name"),"recipientIds" to listOf(o.s("ownerId"),o.s("shopId"))) else emptyMap()
            if(admin && join)tx.set(joinRef,common+mapOf("adminId" to uid,"adminName" to profile!!.getString("name"),"messageId" to message.id,"createdAt" to now()))
            tx.set(message,common + mapOf("senderId" to uid,"recipientId" to if(uid==o.s("ownerId"))o.s("shopId") else o.s("ownerId"),"text" to body,"createdAt" to now())+extra)
            tx.set(activity,common + mapOf("lastMessageId" to message.id,"lastSenderId" to uid,"lastText" to body,"lastKind" to if(admin)if(join)"admin_join" else "admin" else "message","customerReplied" to (a.getBoolean("customerReplied")==true || !admin&&uid==o.s("ownerId")),"shopReplied" to (a.getBoolean("shopReplied")==true || !admin&&uid==o.s("shopId")),"version" to ((a.getLong("version")?:0)+1),"createdAt" to (a.getTimestamp("createdAt")?:now()),"updatedAt" to now()))
        }.await()
    }
    suspend fun confirmation(offer: Record) {
        val r = ref("confirmations",offer.id)
        db.runTransaction { tx ->
            val o = tx.get(ref("offers",offer.id)).record()
            val request = tx.get(ref("requests",o.s("requestId")))
            val shop = tx.get(ref("shops",uid))
            val a = tx.get(ref("chat_activity",offer.id))
            val old = tx.get(r)
            require(o.s("shopId")==uid && shop.getString("status")=="approved" && request.getString("status")=="open")
            require(a.getBoolean("customerReplied")==true && a.getBoolean("shopReplied")==true) { "ჯერ ორივე მხარემ დაწეროს ჩატში" }
            require(old.getString("status")!="pending") { "დადასტურება უკვე გაგზავნილია" }
            tx.set(r, o.data.filterKeys { it in listOf("requestId","ownerId","shopId","price","serviceAvailable","servicePrice","condition","delivery","note") } + mapOf("offerId" to offer.id,"status" to "pending","version" to ((old.getLong("version")?:0)+1),"createdAt" to (old.getTimestamp("createdAt")?:now()),"updatedAt" to now()))
        }.await()
    }
    suspend fun accept(c: Record) {
        val o = ref("orders",c.s("requestId"))
        val r = ref("requests",c.s("requestId"))
        val cr = ref("confirmations",c.id)
        db.runTransaction { tx ->
            val request = tx.get(r).record()
            val order = tx.get(o)
            val confirm = tx.get(cr).record()
            val shop = tx.get(ref("shops",confirm.s("shopId")))
            require(confirm.s("ownerId")==uid)
            if (order.exists()) { require(order.getString("offerId")==c.id); return@runTransaction }
            require(request.s("status")=="open" && confirm.s("status")=="pending" && confirm.n("version")==c.n("version") && shop.getString("status")=="approved") { "მონაცემები შეიცვალა, განაახლე" }
            tx.update(cr,mapOf("status" to "accepted","updatedAt" to now()))
            tx.update(r,mapOf("status" to "closed","acceptedOfferId" to c.id))
            tx.set(o,mapOf("requestId" to c.s("requestId"),"offerId" to c.id,"ownerId" to uid,"shopId" to confirm.s("shopId"),"status" to "confirmed","dispute" to "none","version" to 0,"createdAt" to now(),"updatedAt" to now(),"confirmationId" to c.id,"confirmationVersion" to confirm.n("version")))
            tx.set(o.collection("events").document("0"),mapOf("actorId" to uid,"kind" to "confirmed","status" to "confirmed","dispute" to "none","note" to "შეთავაზება არჩეულია","version" to 0,"createdAt" to now()))
        }.await()
    }
    suspend fun order(row: Record, action: String, note: String) {
        val r = db.document(row.path)
        db.runTransaction { tx ->
            val o = tx.get(r).record()
            val own = o.s("ownerId")==uid; val shop = o.s("shopId")==uid
            require(action in Domain.orderActions(o.s("status"),o.s("dispute"),own,shop,admin) || action=="dispute" && (own||shop) && o.s("dispute")=="none" || action=="resolve" && admin && o.s("dispute")=="open")
            val version = o.n("version")+1
            val status = if(action in listOf("dispute","resolve"))o.s("status") else action
            val dispute = when(action){"dispute"->"open";"resolve"->"resolved";else->o.s("dispute")}
            tx.update(r,mapOf("status" to status,"dispute" to dispute,"version" to version,"updatedAt" to now()))
            tx.set(r.collection("events").document(version.toString()),mapOf("actorId" to uid,"kind" to action,"status" to status,"dispute" to dispute,"note" to Domain.text(note,1000),"version" to version,"createdAt" to now()))
        }.await()
    }
    suspend fun driver(v: Map<String,String>) {
        require(v["city"] in options("towCities"))
        ref("tow_drivers",uid).set(mapOf("ownerId" to uid,"name" to Domain.text(v["name"],100),"phone" to Domain.phone(v["phone"].orEmpty()),"city" to v["city"],"truck" to Domain.text(v["truck"],160),"status" to "pending","updatedAt" to now()),SetOptions.merge()).await()
    }
    suspend fun towRequest(v: Map<String,String>) {
        val sos = v["mode"]=="sos"
        val time = if(sos)null else Timestamp(java.util.Date.from(Instant.parse(v["pickupAt"])))
        require(sos || time!!.toDate().time>System.currentTimeMillis())
        val location = if(sos)mapOf("lat" to v["lat"]!!.toDouble(),"lng" to v["lng"]!!.toDouble()) else null
        require(location==null || location.getValue("lat").isFinite() && location.getValue("lng").isFinite() && kotlin.math.abs(location.getValue("lat"))<=90 && kotlin.math.abs(location.getValue("lng"))<=180)
        require(v["city"] in options("towCities") && v["destinationCity"] in options("towCities"))
        ref("tow_requests",v.getValue("_id")).set(mapOf("ownerId" to uid,"mode" to v["mode"],"city" to v["city"],"destinationCity" to v["destinationCity"],"origin" to Domain.text(v["origin"],300),"destination" to Domain.text(v["destination"],300),"vehicle" to Domain.text(v["vehicle"],160),"condition" to v["condition"],"notes" to v["notes"].orEmpty().take(1000),"phone" to Domain.phone(v["phone"].orEmpty()),"pickupAt" to time,"location" to location,"scope" to if(sos)"city" else "all","status" to "searching","driverId" to null,"quote" to null,"driverName" to null,"driverPhone" to null,"createdAt" to now(),"updatedAt" to now(),"expandedAt" to null)).await()
    }
    suspend fun tow(row: Record, action: String, price: String = "") {
        val r = db.document(row.path)
        db.runTransaction { tx ->
            val o=tx.get(r).record()
            val d=if(action=="claim")tx.get(ref("tow_drivers",uid)) else null
            val patch: Map<String,Any?> = when {
                action=="claim" && o.s("status")=="searching" && o.s("ownerId")!=uid && d?.getString("status")=="approved" && (o.s("scope")=="all" || o.s("city")==d.getString("city")) -> mapOf("status" to "offered","driverId" to uid,"driverName" to d.getString("name"),"driverPhone" to d.getString("phone"),"quote" to Domain.money(price))
                o.s("ownerId")==uid && action=="confirm" && o.s("status")=="offered" -> mapOf("status" to "confirmed")
                o.s("ownerId")==uid && action=="cancel" && o.s("status") in listOf("searching","offered","confirmed") -> mapOf("status" to "cancelled")
                o.s("ownerId")==uid && action=="complete" && o.s("status")=="transporting" -> mapOf("status" to "completed")
                o.s("driverId")==uid && action=="advance" && Domain.towNext.containsKey(o.s("status")) -> mapOf("status" to Domain.towNext.getValue(o.s("status")))
                o.s("ownerId")==uid && action=="expand" && o.s("mode")=="sos" && o.s("scope")=="city" && o.s("status")=="searching" && System.currentTimeMillis()-(o.data["createdAt"] as Timestamp).toDate().time>=900_000 -> mapOf("scope" to "all","expandedAt" to now())
                else -> error("მოქმედება ამ სტატუსში დაუშვებელია")
            }
            tx.update(r,patch + mapOf("updatedAt" to now()))
        }.await()
    }
    suspend fun moderate(row: Record, status: String, reason: String) {
        require(admin)
        val patch = mutableMapOf<String,Any?>("status" to status)
        if(row.path.startsWith("pf_tow_drivers/"))patch["updatedAt"]=now()
        if(row.s("businessType")=="auto_service")patch.putAll(mapOf("reviewReason" to if(status=="approved")"" else Domain.text(reason,1000),"reviewedBy" to uid,"reviewedAt" to now()))
        db.document(row.path).update(patch).await()
    }
    suspend fun supportSession(id: String, open: Boolean) {
        val r=ref("support_threads",id)
        db.runTransaction { tx ->
            val old=tx.get(r)
            if(!old.exists()) {
                require(!admin && open)
                tx.set(r,mapOf("ownerId" to uid,"kind" to when(BuildConfig.ROLE){"business"->"shop";"tow"->"driver";else->"customer"},"status" to "open","session" to 1,"createdAt" to now(),"updatedAt" to now()))
            } else {
                require((old.getString("status")=="open")!=open)
                tx.update(r,mapOf("status" to if(open)"open" else "closed","session" to ((old.getLong("session")?:0)+if(open)1 else 0),"updatedAt" to now()))
            }
        }.await()
    }
    suspend fun supportMessage(id: String, text: String) {
        val r=ref("support_threads",id)
        val m=r.collection("messages").document()
        db.runTransaction { tx ->
            val thread=tx.get(r)
            require(thread.getString("status")=="open") { "ჯერ გახსენი მხარდაჭერის სესია" }
            tx.set(m,mapOf("senderId" to uid,"text" to Domain.text(text,2000),"session" to thread.getLong("session"),"createdAt" to now()))
        }.await()
    }
    suspend fun adminSupport(target: Record): Record {
        require(admin)
        val kind=when(target.path.substringBefore('/')){"pf_shops"->"shop";"pf_tow_drivers"->"driver";else->"customer"}
        val owner=target.s("ownerId").ifEmpty{target.id}
        val id=when(kind){"shop"->"shop_$owner";"driver"->"driver_$owner";else->owner}
        val r=ref("support_threads",id)
        db.runTransaction { tx ->
            val old=tx.get(r)
            if(!old.exists())tx.set(r,mapOf("ownerId" to owner,"kind" to kind,"status" to "open","session" to 1,"createdAt" to now(),"updatedAt" to now()))
            else if(old.getString("status")!="open")tx.update(r,mapOf("status" to "open","session" to ((old.getLong("session")?:0)+1),"updatedAt" to now()))
        }.await()
        return r.get(Source.SERVER).await().record()
    }
}

package com.partflow.nativeapp

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldPath
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.Source
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneOffset

suspend fun Repository.packageSave(v: Map<String,String>, existing: Record?=null) {
    require(admin)
    fun integer(key: String,range: IntRange)=v.getValue(key).toInt().also{require(it in range)}
    val price=v.getValue("monthlyPriceGEL").toDouble().also{require(it.isFinite()&&it in 0.0..1_000_000.0)}
    val id=existing?.id?:v.getValue("_id")
    val value=mapOf("name" to Domain.text(v["name"],100),"description" to v["description"].orEmpty().take(500),"packageType" to v["packageType"],"monthlyPriceGEL" to price,"maxServices" to integer("maxServices",1..10000),"maxStaff" to integer("maxStaff",1..10000),"trialDays" to integer("trialDays",0..3650),"graceDays" to integer("graceDays",0..60),"allowCustomPrice" to (v["allowCustomPrice"]=="true"),"active" to (v["active"]=="true"),"createdBy" to (existing?.s("createdBy")?:uid),"createdAt" to (existing?.data?.get("createdAt")?:now()),"updatedAt" to now())
    val batch=db.batch()
    batch.set(ref("packages",id),value)
    batch.set(db.collection("pf_package_audit").document(),mapOf("actorId" to uid,"action" to if(existing==null)"create" else "update","targetId" to id,"details" to mapOf("name" to v["name"],"monthlyPriceGEL" to price),"createdAt" to now()))
    batch.commit().await()
}
suspend fun Repository.assignPackage(target: Record,plan: Record,expiry: String,override: String) {
    require(admin)
    val packageRef=ref("packages",plan.id)
    val audit=db.collection("pf_package_audit").document()
    db.runTransaction { tx ->
        val p=tx.get(packageRef).record();val current=tx.get(db.document(target.path)).record()
        val type=if(target.path.startsWith("pf_tow_drivers"))"tow_driver" else current.s("businessType").ifEmpty{"parts_shop"}
        require(p.data["active"]!=false && p.s("packageType").ifEmpty{"auto_service"}==type)
        val price=override.takeIf{it.isNotBlank()}?.toDouble()?.also{require(p.b("allowCustomPrice")&&it.isFinite()&&it in 0.0..1_000_000.0)}
        val end=if(expiry.isNotBlank())Timestamp(java.util.Date.from(LocalDate.parse(expiry).plusDays(1).atStartOfDay().toInstant(ZoneOffset.ofHours(4))).also{it.time-=1000}) else if(p.n("trialDays")>0)Timestamp(java.util.Date(System.currentTimeMillis()+p.n("trialDays")*86_400_000L)) else null
        val patch=mutableMapOf<String,Any?>("packageId" to plan.id,"packageAssignedAt" to now(),"packageExpiresAt" to end,"packagePriceOverride" to price)
        if(type=="tow_driver")patch["updatedAt"]=now()
        tx.update(db.document(target.path),patch)
        tx.set(audit,mapOf("actorId" to uid,"action" to "assign","targetId" to target.id,"details" to mapOf("targetType" to if(type=="tow_driver")"tow_driver" else "shop","packageId" to plan.id),"createdAt" to now()))
    }.await()
}

// Same resumable, bounded cascade as the website. A content-free lock keeps new
// offers/messages/order events from racing the deletion. Never deletes accounts.
suspend fun Repository.deleteRequest(id: String) {
    require(admin && id.isNotBlank() && !id.contains('/'))
    val root=ref("requests",id);val lock=ref("deletions",id)
    val proceed=db.runTransaction { tx ->
        val previous=tx.get(lock)
        if(previous.exists())previous.getString("status")=="pending"
        else { require(tx.get(root).exists());tx.set(lock,mapOf("requestedBy" to uid,"status" to "pending","createdAt" to now(),"updatedAt" to now()));true }
    }.await()
    if(!proceed)return
    suspend fun drain(q: Query) {
        while(true) { val page=q.limit(100).get(Source.SERVER).await();if(page.isEmpty)return;val batch=db.batch();page.documents.forEach{batch.delete(it.reference)};batch.commit().await() }
    }
    var memberCursor: DocumentSnapshot?=null
    while(true) {
        var q: Query=db.collection("pf_members").orderBy(FieldPath.documentId()).limit(100)
        memberCursor?.let{q=q.startAfter(it)}
        val members=q.get(Source.SERVER).await();if(members.isEmpty)break
        for(member in members.documents)for(panel in listOf("customer","mobile-customer","shop","admin","superadmin")) {
            val items=db.collection("pf_archives").document(member.id).collection("panels").document(panel).collection("items")
            drain(items.whereEqualTo("type","requests").whereEqualTo("targetId",id))
            var offerCursor: DocumentSnapshot?=null
            while(true) {
                var offers=query("offers","requestId",id).orderBy(FieldPath.documentId()).limit(5)
                offerCursor?.let{offers=offers.startAfter(it)}
                val page=offers.get(Source.SERVER).await();if(page.isEmpty)break
                drain(items.whereEqualTo("type","offers").whereIn("targetId",page.documents.map{it.id}))
                offerCursor=page.documents.last()
            }
        }
        memberCursor=members.documents.last()
    }
    for(c in listOf("chat_admins","chat_activity","confirmations","messages"))drain(query(c,"requestId",id))
    drain(ref("orders",id).collection("events"))
    db.batch().delete(ref("orders",id)).commit().await()
    drain(query("offers","requestId",id))
    db.batch().delete(root).update(lock,mapOf("status" to "completed","updatedAt" to now())).commit().await()
}

fun packageFields()=listOf(Field("name","სახელი"),Field("description","აღწერა",optional=true),Field("packageType","ბიზნესის ტიპი",listOf("parts_shop","auto_service","tow_driver")),Field("monthlyPriceGEL","ყოველთვიური ფასი ₾"),Field("maxServices","მომსახურებების ლიმიტი"),Field("maxStaff","თანამშრომლების ლიმიტი"),Field("trialDays","საცდელი დღეები"),Field("graceDays","საშეღავათო დღეები"),Field("allowCustomPrice","ინდივიდუალური ფასი",listOf("false","true")),Field("active","აქტიური",listOf("true","false")))

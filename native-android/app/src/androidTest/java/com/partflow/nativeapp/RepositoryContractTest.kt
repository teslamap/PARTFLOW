package com.partflow.nativeapp

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.MemoryCacheSettings
import com.google.firebase.firestore.Source
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.tasks.await
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class RepositoryContractTest {
    private val context=InstrumentationRegistry.getInstrumentation().targetContext
    private val project="demo-partflow"
    private suspend fun client(): Repository {
        val name=UUID.randomUUID().toString()
        val app=FirebaseApp.initializeApp(context,FirebaseOptions.Builder().setProjectId(project).setApiKey("fake-api-key").setApplicationId("1:123:android:test").build(),name)
        val auth=FirebaseAuth.getInstance(app).apply { useEmulator("10.0.2.2",9099) }
        val db=FirebaseFirestore.getInstance(app).apply {
            firestoreSettings=FirebaseFirestoreSettings.Builder().setLocalCacheSettings(MemoryCacheSettings.newBuilder().build()).build()
            useEmulator("10.0.2.2",8080)
        }
        auth.createUserWithEmailAndPassword("$name@example.test","Contract123!").await()
        return Repository(auth,db,LocalStore.open(context).dao(),JSONObject(context.assets.open("catalog.json").bufferedReader().use{it.readText()})).also { it.member() }
    }
    private fun approve(collection: String,id: String) {
        val conn=URL("http://10.0.2.2:8080/v1/projects/$project/databases/(default)/documents/pf_$collection/$id?updateMask.fieldPaths=status").openConnection() as HttpURLConnection
        conn.requestMethod="PATCH";conn.doOutput=true;conn.setRequestProperty("Authorization","Bearer owner");conn.setRequestProperty("Content-Type","application/json")
        conn.outputStream.use { it.write("{\"fields\":{\"status\":{\"stringValue\":\"approved\"}}}".toByteArray()) }
        assertEquals(200,conn.responseCode);conn.disconnect()
    }
    @Test fun requestOfferChatConfirmationOrderAndIsolation()= runBlocking {
        val customer=client();val business=client();val stranger=client()
        val id=customer.db.collection("pf_requests").document().id
        val vehicle=mapOf("_id" to id,"brand" to "Toyota","model" to "Prius","year" to "2012","engine" to "1.8","vin" to "","category" to customer.options("categories").first(),"part" to "ფარი","description" to "ტესტის ნაწილი","city" to "თბილისი","condition" to "ნებისმიერი","budget" to "100")
        customer.request(vehicle)
        val request=customer.ref("requests",id).get(Source.SERVER).await().record()
        assertTrue(runCatching{stranger.ref("requests",id).get(Source.SERVER).await()}.isFailure)
        business.shop(mapOf("_id" to "unused","name" to "ტესტი","phone" to "+995555123456","city" to "თბილისი","brand" to "*","model" to "*","category" to "*"))
        approve("shops",business.uid)
        business.offer(request,mapOf("price" to "50","condition" to "ახალი","delivery" to "ადგილზე","note" to "ტესტი"))
        val offer=business.ref("offers","${id}_${business.uid}").get(Source.SERVER).await().record()
        assertTrue(runCatching{business.offer(request,mapOf("price" to "50","condition" to "ახალი","delivery" to "ადგილზე","note" to "დუბლიკატი"))}.isFailure)
        customer.message(offer,"მაინტერესებს")
        business.message(offer,"ხელმისაწვდომია")
        business.confirmation(offer)
        val confirmation=customer.ref("confirmations",offer.id).get(Source.SERVER).await().record()
        customer.accept(confirmation);customer.accept(confirmation)
        val order=customer.ref("orders",id).get(Source.SERVER).await().record()
        assertEquals("confirmed",order.s("status"))
        assertTrue(runCatching{customer.order(order,"shipped","აკრძალულია")}.isFailure)
        business.order(order,"preparing","მომზადდა")
        assertEquals("preparing",business.ref("orders",id).get(Source.SERVER).await().getString("status"))
        customer.saveCache("requests",listOf(request),customer.uid)
        assertEquals(1,customer.cached("requests",customer.uid).size)
        assertTrue(stranger.cached("requests",stranger.uid).isEmpty())
        customer.local.clearPages(customer.uid)
        assertTrue(customer.cached("requests",customer.uid).isEmpty())
    }
    @Test fun towLifecycleAndCustomerCannotSelfClaim()=runBlocking {
        val customer=client();val driver=client()
        driver.driver(mapOf("name" to "მძღოლი","phone" to "+995555123456","city" to "თბილისი","truck" to "პლატფორმა"))
        approve("tow_drivers",driver.uid)
        val id=customer.db.collection("pf_tow_requests").document().id
        customer.towRequest(mapOf("_id" to id,"mode" to "sos","city" to "თბილისი","destinationCity" to "თბილისი","origin" to "ტესტი 1","destination" to "ტესტი 2","vehicle" to "Toyota Prius","condition" to "rolls","phone" to "+995555123456","lat" to "41.7","lng" to "44.8"))
        val row=customer.ref("tow_requests",id).get(Source.SERVER).await().record()
        assertTrue(runCatching{customer.tow(row,"claim","50")}.isFailure)
        driver.tow(row,"claim","50");customer.tow(row,"confirm");driver.tow(row,"advance");driver.tow(row,"advance");customer.tow(row,"complete")
        assertEquals("completed",customer.ref("tow_requests",id).get(Source.SERVER).await().getString("status"))
    }
    @Test fun ownedServiceCatalogAndPrivateCustomerOrder()=runBlocking {
        val customer=client();val business=client();val stranger=client()
        business.shop(mapOf("_id" to "unused","name" to "მაღაზია","phone" to "+995555123456","city" to "თბილისი","brand" to "*","model" to "*","category" to "*"))
        val child=business.db.collection("pf_shops").document().id
        business.shop(mapOf("_id" to child,"name" to "სერვისი","phone" to "+995555123456","city" to "თბილისი"),true)
        val id="service_$child";approve("shops",id)
        val item=business.db.collection("pf_shops").document().id
        business.serviceRecord(id,"catalog",mapOf("_id" to item,"name" to "დიაგნოსტიკა","description" to "ტესტი","duration" to "30"))
        business.serviceRecord(id,"hours",weekDefaults())
        business.serviceRecord(id,"staff",weekDefaults()+mapOf("_id" to "staff1","name" to "ხელოსანი","specialty" to "დიაგნოსტიკა","serviceIds" to item))
        assertEquals("დიაგნოსტიკა",customer.ref("shops",id).collection("catalog").document(item).get(Source.SERVER).await().getString("name"))
        val order=customer.ref("shops",id).collection("serviceOrders").document()
        order.set(mapOf("businessId" to id,"customerId" to customer.uid,"description" to "დიაგნოსტიკა მჭირდება","status" to "pending","createdAt" to customer.now(),"updatedAt" to customer.now())).await()
        assertTrue(runCatching{stranger.db.document(order.path).get(Source.SERVER).await()}.isFailure)
        business.db.document(order.path).update(mapOf("status" to "accepted","updatedAt" to business.now())).await()
        assertEquals("accepted",customer.db.document(order.path).get(Source.SERVER).await().getString("status"))
    }
}

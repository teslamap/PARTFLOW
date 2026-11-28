package com.partflow.nativeapp

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.MemoryCacheSettings
import org.json.JSONObject

class PartflowApplication : Application() {
    lateinit var repository: Repository
    override fun onCreate() {
        super.onCreate()
        val config = JSONObject(assets.open("firebase.json").bufferedReader().use { it.readText() })
        val app = FirebaseApp.initializeApp(this, FirebaseOptions.Builder()
            .setProjectId(config.getString("projectId"))
            .setApplicationId(config.getString("appId"))
            .setApiKey(config.getString("apiKey"))
            .build(), "native-${BuildConfig.ROLE}")
        val db = FirebaseFirestore.getInstance(app)
        // Room owns durable user-scoped cache. No unbounded second disk cache or
        // persistent cross-session Firestore pending writes after logout.
        db.firestoreSettings = FirebaseFirestoreSettings.Builder()
            .setLocalCacheSettings(MemoryCacheSettings.newBuilder().build()).build()
        repository = Repository(FirebaseAuth.getInstance(app), db, LocalStore.open(this).dao(),
            JSONObject(assets.open("catalog.json").bufferedReader().use { it.readText() }))
    }
}

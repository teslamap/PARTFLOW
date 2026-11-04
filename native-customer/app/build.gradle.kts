plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose") }
android { namespace = "ge.partflow.customer"; compileSdk = 35
 defaultConfig { applicationId = "ge.partflow.customer.preview"; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"; minSdk = 26; targetSdk = 35; versionCode = 3; versionName = "0.2.0-preview" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 buildFeatures { compose = true } }
dependencies { implementation(platform("androidx.compose:compose-bom:2024.10.01")); implementation("androidx.activity:activity-compose:1.9.3"); implementation("androidx.compose.material3:material3"); implementation(platform("com.google.firebase:firebase-bom:33.6.0")); implementation("com.google.firebase:firebase-auth"); implementation("com.google.firebase:firebase-firestore"); implementation("androidx.compose.foundation:foundation"); implementation("androidx.compose.ui:ui"); implementation("androidx.compose.ui:ui-tooling-preview"); debugImplementation("androidx.compose.ui:ui-tooling") }

dependencies { implementation("com.google.mlkit:text-recognition:16.0.1"); implementation("org.osmdroid:osmdroid-android:6.1.20") }

dependencies { androidTestImplementation(platform("androidx.compose:compose-bom:2024.10.01")); androidTestImplementation("androidx.compose.ui:ui-test-junit4"); androidTestImplementation("androidx.test:runner:1.6.2"); debugImplementation("androidx.compose.ui:ui-test-manifest") }

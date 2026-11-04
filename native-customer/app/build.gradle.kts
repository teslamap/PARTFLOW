plugins { id("com.android.application"); id("org.jetbrains.kotlin.android"); id("org.jetbrains.kotlin.plugin.compose") }
android { namespace = "ge.partflow.customer"; compileSdk = 35
 defaultConfig { applicationId = "ge.partflow.customer.preview"; minSdk = 26; targetSdk = 35; versionCode = 2; versionName = "0.1.1-preview" }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 buildFeatures { compose = true } }
dependencies { implementation(platform("androidx.compose:compose-bom:2024.10.01")); implementation("androidx.activity:activity-compose:1.9.3"); implementation("androidx.compose.material3:material3"); implementation(platform("com.google.firebase:firebase-bom:33.6.0")); implementation("com.google.firebase:firebase-auth"); implementation("com.google.firebase:firebase-firestore"); implementation("androidx.compose.foundation:foundation"); implementation("androidx.compose.ui:ui"); implementation("androidx.compose.ui:ui-tooling-preview"); debugImplementation("androidx.compose.ui:ui-tooling") }

# PARTFLOW Customer — true native Android (WIP)
Kotlin + Jetpack Compose, no WebView.
Design tokens taken from src/mobile-customer.css and layout from src/mobile-customer.tsx.
Contains native login UI, demo home, drawer, requests/offers/garage/profile UI scaffolding. **No Firebase wiring yet, no working production sign-in or data operations.** Demo content is sample data, not live data. Do not ship as production.
Build via GitHub Actions workflow native-customer-debug.yml (manual trigger) or local Gradle 8.9/JDK 17/SDK 35. The branch does not modify existing web pages or WebView APK.

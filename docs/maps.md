# Shared maps and Android location

Admin: open `admin.html?view=map` (also `superadmin.html?view=map`) or select **რუკა**. The large map subscribes to all registered `pf_shops` documents, without the panel's 300-document limit. Its searchable list includes approved, pending and suspended shops. Select a shop, click its location on the map and save. The same editor is available to an owner in the shop profile; owner changes reset approval, whereas admin location-only changes preserve it.

The optional shop fields `mapLocation: {lat, lng}` and `mapAddress` are fully validated. Existing shops remain valid without them. Orange pins are exact saved locations; grey pins are explicitly labelled city-centre approximations. A shop with an unknown city and no coordinates stays in the missing-location list; coordinates are never invented or inferred as a precise address.

Customer: **მაღაზიების რუკა** lists approved shops. Selecting an accepted request shows only the winning offer's shop. A missing winning offer fails closed to zero pins, never the competing shops. Each expanded confirmed order also has its own selected-shop map. Users with several requests can select the request context; explicitly browsing all shops is a separate dropdown choice.

Towing: the separate driver portal displays only SOS requests already authorized by the existing same-city/nationwide/assignment rules. The driver can capture their own current position once and select an SOS to display both pins. Driver coordinates stay in component memory; they are not uploaded or continuously refreshed. Customer SOS pickup coordinates retain their existing immutable-request rules.

Maps use bundled Leaflet 1.9.4 assets and OpenStreetMap HTTPS tiles with visible attribution. No keys or paid account are required. Only visible tiles are requested; no offline/prefetch feature is implemented. Native WebView uses HTTP caching defaults for map resources while the entry page still refreshes online.

The live Android wrapper now declares foreground coarse/fine location permissions, enables WebView geolocation, and requests both permissions together after an explicit location action. Its origin and current page are validated before resolving the callback; untrusted origins are denied. Approximate permission is accepted, denial returns to the page with a useful Android-settings message, and pending requests are cancelled during teardown. There is no background location permission or GPS service. Version code/name is 4 / 4.0; installing a new APK is required for the native permission change. A web deployment alone cannot add permissions to an already-installed APK.

Validation: `npm run test:maps`, `npm run test:maps:rules` against Firestore emulator, existing regression suites, TypeScript/build, and the GitHub APK compilation/signature/package/manifest checks. Real device permission UX still depends on Android settings and should be checked on the target phone.

References: [Android runtime location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions/runtime), [WebChromeClient](https://developer.android.com/reference/android/webkit/WebChromeClient), [Leaflet](https://leafletjs.com/examples/quick-start/), [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).

# LEDGEr — Tactical Catfish Ledger & Navigation Suite
**Release & Launch Checklist for `ledgerfishing.com` and Google Play Store**

---

### [x] Phase 1: Custom Domain & Production Hosting
- [x] **Secure Domain**: `ledgerfishing.com` registered on Cloudflare Registrar.
- [x] **Cloud Run Domain Mapping**: Service mapped to `ledgerfishing.com` in Google Cloud (`IRONTRACK-506516`).
- [x] **Google Search Console Ownership**: Domain TXT verification completed and verified.
- [x] **Cloudflare DNS Configuration**:
  - [x] 4x Google Cloud Run Anycast IPv4 `A` records mapped (`216.239.32.21`, `.34.21`, `.36.21`, `.38.21`) set to DNS-only.
  - [x] CNAME conflict cleared.
- [x] **SSL / HTTPS Provisioning**: Active Google Cloud Managed TLS certificate issued with green checkmark.
- [x] **Production Applet Canonical URLs**: Updated in HTML meta tags and OpenGraph cards (`og:image`, `og:url`, `twitter:card`).

---

### [x] Phase 2: Web Store Assets & Legal Compliance
- [x] **App Icon Assets**:
  - [x] High-res `512x512` standard app icon (`/public/icon-512.png`).
  - [x] `512x512` maskable icon for modern Android (`/public/icon-maskable-512.png`).
  - [x] `192x192` launcher & home screen icon (`/public/icon-192.png`).
  - [x] Apple touch icon (`/public/apple-touch-icon.png`) and SVG vector favicon (`/public/icon.svg`).
- [x] **Google Play Feature Graphic**:
  - [x] Mandatory `1024x500` banner generated (`/public/feature-graphic.png`).
  - [x] High-contrast tactical river typography with catfish contour silhouette.
- [x] **Privacy Policy & Play Store Data Safety Disclosures**:
  - [x] Production Privacy Policy live at `https://ledgerfishing.com/privacy`.
  - [x] Explicit GPS/Location disclosures (foreground tactical pin & offline ledger).
  - [x] Camera/Storage disclosures for catch evidence.
  - [x] No third-party data broker sharing clause.

---

### [x] Phase 3: Core App Engine, Offline Reliability & Tactical Intelligence (v2.6.0)
- [x] **Offline Tile Engine**: 50-mile radius tactical tile caching with smart distance-check skipping redundant downloads.
- [x] **Tactical Solunar & Flow Intelligence**: Real-time river flow (USGS CFS), atmospheric pressure trends, and celestial Solunar feed windows.
- [x] **Catfish Catch Ledger**: Rapid single-thumb logging for Blues, Channels, Flatheads, bait, depth, and presentation.
- [x] **Tactical Pattern Analytics Suite**: Multi-factor correlation across species, presentations, water temperature brackets, and barometric fronts.
- [x] **Bait Normalization Engine**: Automated alias consolidation turning shorthand into clean unified bait categories.
- [x] **Today's Tactical Gameplan**: Real-time environmental similarity matching comparing live conditions against catch records to output high-probability setups with 1-tap prefill.
- [x] **IndexedDB Binary Storage & Auto-Repair**: Bulletproof local photo persistence with 2-tier auto-repair.
- [x] **In-App Tactical Field Manual & Knowledge Base**: 8-chapter deck manual (Steps 01-08) covering offline maps, logging, bait hub, trophy cards, pattern analytics, gameplan matching, and decoupled boat GPS.
- [x] **AI River Scout & Angler Quote Generator**: Server-side contextual narrative synthesis powered by Gemini API.
- [x] **PWA Installability & Service Worker**: Modern `manifest.json` and caching service worker.

---

### [ ] Phase 4: Google Play Store Packaging & Launch (Next Up)
- [ ] **Generate Android App Bundle (AAB)**:
  - Generate TWA (Trusted Web Activity) package using Bubblewrap CLI or PWABuilder pointing to `https://ledgerfishing.com`.
  - Sign the release keystore (`.keystore` / `.jks`).
- [ ] **Digital Asset Links Verification (`assetlinks.json`)**:
  - Paste the release SHA-256 fingerprint into `public/.well-known/assetlinks.json` on `ledgerfishing.com` so the URL address bar is hidden inside the Android app.
- [ ] **Google Play Console Listing**:
  - [ ] App Name: `LEDGEr — by BIGGUY_littleboat`
  - [ ] Short Description: `Tactical Catfish Logging, GPS Pinpointing, and Solunar Intelligence Platform.`
  - [ ] Full Description & Tactical Features list.
  - [ ] Upload `icon-512.png` and `feature-graphic.png` (1024x500).
  - [x] In-app screenshots captured (Phone & Tablet - ready for Play Console upload).
  - [ ] Link Privacy Policy URL: `https://ledgerfishing.com/privacy`.
  - [ ] Complete Content Rating Questionnaire (Everyone / Fishing / Sports).
  - [ ] Submit for Google Play review.

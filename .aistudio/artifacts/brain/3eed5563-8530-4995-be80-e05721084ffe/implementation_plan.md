# LEDGEr v2.6.0 — Tactical Knowledge Base & Field Guide Overhaul

Upgrade the application's documentation ecosystem (`AboutModal.tsx`, `CHECKLIST.md`, `SettingsView.tsx`, and contextual in-app guidance) to comprehensively educate anglers on using the newly deployed **Tactical Pattern Analytics Suite**, **Live Tactical Gameplan ("What Should I Run Today?")**, **USGS Hydrology Telemetry**, and **Bait Normalization Engine**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The app recently received several major upgrades—including real-time USGS river gauge polling (water temp and streamflow CFS), barometric front trends, bait deduplication, species-specific pattern slicing, and live gameplan rig matching. However, the in-app **Field Guide** currently only covers basic catch logging and 50-mile offline maps (Steps 01–05), and system specs still reference v2.5.0. This plan modernizes the entire knowledge base into an authoritative river angling manual with direct, one-tap access from the water.

- **Proposed Versioning**: Update system version to **v2.6.0 (Tactical Intelligence & Hydrology Edition)** across `AboutModal.tsx`, `SettingsView.tsx`, email feedback templates, and project tracking.
- **Field Guide Structure**: Expand the Guide with two dedicated tactical chapters:
  - **Step-by-Step 06**: *Tactical Pattern Analytics & Rig Matrices* (explaining species-specific filters, presentation rankings, bait combos, water temperature bands, barometric front dynamics, and trophy slicing).
  - **Step-by-Step 07**: *Today's Tactical Gameplan & Live USGS Matching* (explaining real-time USGS streamflow CFS/temp polling, environmental similarity scoring, Solunar feed schedules, and 1-tap rig prefill).
  - **Step-by-Step 08**: *River Navigation & Decoupled Boat GPS Safeguards* (clarifying map browsing without losing true vessel GPS fix, plus in-place coordinate adjustments).
- **Contextual In-App Guidance**: Add a high-contrast `"Tactical Field Manual"` quick-action link in the Pattern Engine header (`PatternInsights.tsx`) so anglers on deck can immediately access tactical explanations without navigating away to settings.

---

## 1. Overview & Core Concept

### What It Delivers
Transforms the app's informational modals from generic help screens into a comprehensive **River Angler's Tactical Deck Manual & Knowledge Base**:
1. **Interactive Field Guide**: Adds in-depth tactical chapters for pattern interpretation and real-time gameplan execution.
2. **System Info & Technical Specs**: Documents the zero-leak local data architecture, USGS REST gauge pipelines, Open-Meteo MSL barometric trend algorithms, and IndexedDB photo auto-repair.
3. **Dedicated Release Changelog**: Formalizes v2.6.0 release notes with a clear breakdown of newly added capabilities.
4. **Contextual In-App Discovery**: Connects the Pattern Insights and Gameplan screens directly to the guide.
5. **Updated Beta Testing Protocol**: Updates feedback email templates and questions to focus on live telemetry, pattern slicing, and rig recommendations.

### Target Audience
Freshwater river anglers (boat and bank) navigating moving water who need immediate, plain-language tactical advice on river current seams, seasonal water temps, front passage, and how LEDGEr uses their logs to predict productive setups.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Pattern Insights / Gameplan View]
         │
         ▼ Tap "Tactical Field Manual" (or via Settings → App Info & Guide)
┌──────────────────────────────────────────────────────────────┐
│                    LEDGEr DECK FIELD MANUAL                  │
│  [Field Guide]   [Beta Tester Guide]   [Privacy]   [Specs]   │
├──────────────────────────────────────────────────────────────┤
│  Step 01: 50-Mile Offline Satellite Map Banking              │
│  Step 02: 10-Second Deck Mode Catch Logging                  │
│  Step 03: Bait Spot Hub & Livewell Mapping                   │
│  Step 04: Interactive 3D Trophy Cards & Social Reports       │
│  Step 05: Local Backups, CSV Exports & Storage Repair        │
│  ★ Step 06: Tactical Pattern Analytics & Rig Matrices         │
│  ★ Step 07: Today's Tactical Gameplan & USGS Telemetry Match │
│  ★ Step 08: River Navigation & Decoupled Vessel GPS          │
├──────────────────────────────────────────────────────────────┤
│  [Changelog v2.6.0: Tactical Pattern Engine & USGS Telemetry]│
└──────────────────────────────────────────────────────────────┘
```

### Visual Layout & Tactical Aesthetics
- **Tactical Card Styling**: Dark-mode console styling (`bg-slate-900/90`, `border-slate-800`, with vibrant accent borders: `border-amber-500/40`, `border-sky-500/40`, `border-emerald-500/40`).
- **Tactical Rule Callouts**: Distinct highlighted boxes (e.g., `⚡ River Rule: Pre-Front Pressure Drops`, `🌊 USGS Hydrology: Water Temp Thresholds`) providing actionable fishing knowledge.
- **Step Badging**: High-contrast pill badges (`Step-by-Step 06`, `Step-by-Step 07`, `Step-by-Step 08`) with custom iconography (`BarChart3`, `Compass`, `Waves`, `Flame`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Dedicated Tactical Chapters vs. Brief Tooltips
- *Chosen Approach*: Create full, structured chapters (**Step 06**, **Step 07**, and **Step 08**) with numbered sub-points, tactical rules, and visual badges.
- *Why*: Catfishing tactics depend on understanding *why* certain environmental factors trigger bites (e.g., how water temp below 45°F shuts down roaming, why a falling barometer turns on current seams). A complete guide gives anglers genuine deck utility.

### Decision 2: Direct Contextual Linking
- *Chosen Approach*: Add a `"Tactical Field Manual"` link button directly in `PatternInsights.tsx` that opens `AboutModal` straight to the tactical guide.
- *Why*: Anglers shouldn't have to navigate through the settings menu when analyzing patterns or viewing today's gameplan on deck.

### Decision 3: Knowledge Base Syncing Across Project Files
- *Chosen Approach*: Synchronize versioning (`v2.6.0`), system descriptions, and technical specifications across `AboutModal.tsx`, `SettingsView.tsx`, and `CHECKLIST.md`.
- *Why*: Prevents confusion among beta testers and keeps store submission documentation up to date.

---

## 4. Technical Architecture & Component Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                       LEDGEr Navigation                     │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ Pattern Insights View │       │     Settings View     │  │
│  │ [Tactical Guide Link] ┼───────┤  [App Info & Guide]   │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
└──────────────┼───────────────────────────────┼──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      AboutModal Component                   │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│  │   Field Guide   │ │   System Info   │ │ Beta / Privacy │ │
│  │   (Steps 01-08) │ │  (v2.6.0 Specs) │ │                │ │
│  └────────┬────────┘ └────────┬────────┘ └────────────────┘ │
│           │                   │                             │
│   ┌───────┴────────┐  ┌───────┴────────┐                    │
│   │ ★ Step 06:     │  │ Tactical Suite │                    │
│   │ Pattern Engine │  │ Changelog &    │                    │
│   │ ★ Step 07:     │  │ USGS Telemetry │                    │
│   │ Live Gameplan  │  │ Specifications │                    │
│   │ ★ Step 08:     │  │                │                    │
│   │ Decoupled GPS  │  │                │                    │
│   └────────────────┘  └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Implementation Tasks
1. **`src/components/AboutModal.tsx`**:
   - Add **Step-by-Step 06: Tactical Pattern Analytics & Rig Matrices** (explaining species filters, presentation rankings, deadly combos, barometric front dynamics, USGS water temp brackets, and trophy mode slicing).
   - Add **Step-by-Step 07: Today's Tactical Gameplan & Real-Time Telemetry Matcher** (explaining live USGS water temp/flow polling, scoring similarity, feeding windows, and 1-tap prefilling).
   - Add **Step-by-Step 08: River Navigation & Decoupled Vessel GPS** (explaining independent map browsing without overriding GPS fix, plus coordinate adjustments).
   - Update **System Info (Tab 4)** to **v2.6.0** with full changelog breakdown of the Tactical Suite, USGS APIs, and Bait Normalization.
   - Update **Beta Tester Guide (Tab 2)** with v2.6.0 testing questions and updated mailto draft.
2. **`src/components/PatternInsights.tsx`**:
   - Add `"Tactical Field Manual"` link button in the header bar with an embedded or linked guide trigger.
3. **`src/components/SettingsView.tsx`**:
   - Bump version badges to `v2.6.0-PROD` and update descriptions.
4. **`CHECKLIST.md`**:
   - Mark Phase 3 tactical milestones as completed and verified.

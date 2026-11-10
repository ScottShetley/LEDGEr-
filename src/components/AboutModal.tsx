import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Ship,
  Sparkles,
  ShieldCheck,
  Camera,
  Layers,
  Compass,
  Fish,
  Waves,
  Award,
  Zap,
  BookOpen,
  Info,
  Satellite,
  MapPin,
  Download,
  CheckCircle2,
  CheckCircle,
  RefreshCw,
  Database,
  Share2,
  FileSpreadsheet,
  ChevronRight,
  ExternalLink,
  FlaskConical,
  Smartphone,
  WifiOff,
  Copy,
  Check,
  Mail,
  AlertTriangle,
  Radio,
  Sliders,
  Send,
  BarChart3,
  Thermometer,
  Flame,
  Gauge,
  Anchor,
  TrendingDown,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { LogoGraphic } from './LogoGraphic';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'guide' | 'beta' | 'privacy' | 'info';
  initialSection?: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'guide',
  initialSection,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'beta' | 'privacy' | 'info'>(initialTab);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedPrivacyUrl, setCopiedPrivacyUrl] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (isOpen && initialSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(initialSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialSection, activeTab]);

  const handleCopyPrivacyUrl = () => {
    const url = `${window.location.origin}/privacy`;
    navigator.clipboard.writeText(url);
    setCopiedPrivacyUrl(true);
    setTimeout(() => setCopiedPrivacyUrl(false), 3000);
  };

  const handleCopyInvite = () => {
    const appUrl = window.location.origin;
    const inviteText = `🎣 Hey! I'm testing my freshwater river catch ledger app, LEDGEr (by BIGGUY_littleboat).

I'd love your feedback on the water! Here is how to install it in 10 seconds:

1. Tap this link in Safari (iPhone) or Chrome (Android):
${appUrl}

2. Tap Share (or 3-dots Menu) -> "Add to Home Screen". This installs it as a full-screen app.

3. Allow Location & Camera permissions (needed to stamp GPS coordinates & river flow telemetry).

Try logging a catch in dead zones or checking Today's Tactical Gameplan, and let me know how it works!`;

    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleEmailFeedback = () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const deviceType = isIos ? 'iPhone / iOS' : isAndroid ? 'Android Phone' : 'Desktop / Other';

    const subject = encodeURIComponent('LEDGEr Beta Feedback (v2.6.0)');
    const body = encodeURIComponent(
`Hi David,

Here is my field test feedback on LEDGEr:

[Device]: ${deviceType}
[River / Body of Water]: 
[Cell Service Quality]: (Strong LTE / Weak 1-Bar / 0 Bars / Airplane Mode)

1. GPS & Location Locking:
- Did coordinates lock quickly when on the water?
Answer: 

2. Catch Logging Speed & Deck Usability:
- Did the 10-second catch logger work smoothly with wet hands and glare?
Answer: 

3. Tactical Pattern Analytics & Gameplan Matcher:
- Did the "What Should I Run Today?" recommendations match what produced bites?
Answer: 

4. USGS River Hydrology Telemetry:
- Did the live water temp (°F) and streamflow (CFS) match your river conditions?
Answer: 

5. Offline Satellite Maps:
- Did pre-banked satellite tiles display clearly when away from cell service?
Answer: 

6. Trophy Card Studio & Photo Cropping:
- How did the photo framing, zoom/pan, and card export work for you?
Answer: 

7. Suggestions, Issues, or Bugs:
- 
`
    );
    window.location.href = `mailto:DavidScottShetley@gmail.com?subject=${subject}&body=${body}`;
  };

  if (!isOpen) return null;

  return (
    <div
      id="about-ledger-modal"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col overflow-y-auto font-sans text-slate-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Sticky Navigation Header */}
      <div className="sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800 px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          id="about-back-button"
          className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-orange-400" />
          <span>Back to Console</span>
        </button>

        {/* Tab Toggle Switch */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-orange-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>HOW-TO GUIDE</span>
          </button>
          <button
            type="button"
            id="tab-beta-guide-btn"
            onClick={() => setActiveTab('beta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'beta'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-amber-400/90 hover:text-amber-300'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
            <span>BETA TESTER GUIDE</span>
          </button>
          <button
            type="button"
            id="tab-privacy-btn"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-emerald-400/90 hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>PRIVACY & DATA SAFETY</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'info'
                ? 'bg-orange-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>APP INFO & SPECS</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        
        {/* Brand Banner */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-orange-500/20 via-amber-600/20 to-slate-900 border border-orange-500/40 rounded-2xl shadow-xl">
            <LogoGraphic size="lg" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-mono">
                <span>LEDGE</span>
                <span className="text-orange-500">r</span>
              </h1>
              <span className="text-[10px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                v2.6.0
              </span>
            </div>

            <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-400 font-mono uppercase">
              by <span className="text-orange-400 font-bold">BIGGUY_littleboat</span>
            </p>

            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-lg mx-auto italic">
              "The straightforward freshwater catch log from the deck of a small boat."
            </p>
          </div>
        </div>

        {/* TAB 1: HOW-TO FIELD MANUAL */}
        {activeTab === 'guide' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            <div className="p-4 rounded-xl bg-orange-950/30 border border-orange-500/30 flex items-start gap-3">
              <Compass className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-orange-300 font-mono">
                  ANGLER'S DECK FIELD MANUAL
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Quick operational instructions for navigating rivers with zero cell service, rapid catch logging on deck, managing bait spots, and generating trophy records.
                </p>
              </div>
            </div>

            {/* Guide Section 1: 50-Mile Offline Map Banking */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                    Step-by-Step 01
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    50-Mile Offline Satellite Map Banking
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                When motoring down remote river pools or winding bluffs with <strong>0 cellular reception</strong>, pre-cached satellite maps continue rendering smoothly on your device.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 border border-cyan-500/30">1</span>
                    <span>Pre-Bank at the Boat Ramp</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    While connected to Wi-Fi at home or cellular LTE at the boat ramp, tap <strong className="text-slate-200">BANK 50-MI MAP</strong> (in the top-left map header or in Settings). LEDGEr downloads satellite tiles covering a 50-mile radius directly into local device storage.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 border border-emerald-500/30">2</span>
                    <span>Smart GPS Check Saves Your Data</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    If you return to the same ramp, LEDGEr calculates your distance to the previous bank. If you're within 1 mile, it displays <strong className="text-emerald-400">MAPS CURRENT (GPS UNCHANGED)</strong>—preventing redundant downloads and saving phone battery.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30">3</span>
                    <span>Towing to a New Ramp</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    When you trail to a different river pool (&gt; 1 mile away), LEDGEr alerts <strong className="text-amber-300">New GPS Location Detected</strong> with the exact distance moved, offering a 1-tap update for the new 50-mile zone.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-slate-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-300 border border-slate-700">4</span>
                    <span>Visual 50-Mile Coverage Ring</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Toggle <strong className="text-slate-200">Show 50-Mi Ring on Map</strong> in the banking popover to view a cyan circle on your navigation map marking your exact cached safety perimeter.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-400 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 border border-cyan-500/30">5</span>
                    <span>Decoupled Map Browsing (Preserves True Boat GPS)</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Freely drag, explore river bends, and inspect upstream honey holes. Panning the camera will <strong className="text-slate-200">never override your true vessel GPS fix</strong>—your next catch will always stamp your actual boat location, not the map center.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 2: Deck Mode Catch Logging */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block">
                    Step-by-Step 02
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Fast 10-Second Catch Logging (Deck Mode)
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-orange-300 font-mono">
                    <span>1. Tap "+ LOG CATCH"</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Large high-contrast touch buttons designed for quick entries with wet hands in direct glare.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-sky-300 font-mono">
                    <span>2. Automatic GPS & Solunar Score Capture</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Instantly records your river coordinates, live accuracy, current moon phase, and astronomical Solunar feeding rating (Poor / Fair / Good / Epic) without requiring cellular service.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-lime-300 font-mono">
                    <span>3. Log Species, Weight & Presentation</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Select target species (Bluecat, Channel Cat, Flathead, Striper, Crappie, etc.), enter weight/length, bait used (cut shad, live skipjack, worms), and strike depth.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 font-mono">
                    <span>4. Attach Photo for 3D Trophy Card</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Snap or upload a photo directly from your phone camera. It automatically generates a collectible holographic 3D card saved in your private vault. Photos are compressed to &lt;500 KB and safely stored offline in IndexedDB.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                    <span>5. Need to Correct a Waypoint? Use "Adjust Location"</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    If initial GPS drifted while under tree cover or steep bluffs, open any catch in your logbook and expand <strong className="text-white">Adjust Location</strong>. Type exact coordinates or tap <strong className="text-cyan-400">Snap to Current GPS Fix</strong> to reposition your map pin instantly without deleting or re-logging the fish.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 3: Bait Spot Gathering & Quick Filter */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-lime-500/20 text-lime-400 rounded-xl border border-lime-500/30">
                  <Fish className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400 block">
                    Step-by-Step 03
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Bait Spot Hub & Map Filtering
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-lime-300 font-mono">Pinning Bait Honey Holes</div>
                  <p className="text-slate-400 leading-relaxed">
                    Record vital bait gathering locations: cast net eddies, wing dams, sabiki skipjack spots, or shad schooling flats. Mark target bait species and water current notes.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-lime-300 font-mono">Instant Map Filter: "BAIT ONLY" vs "ALL"</div>
                  <p className="text-slate-400 leading-relaxed">
                    On the navigation map, tap the <strong className="text-lime-400">BAIT</strong> chip in the top-left to instantly filter out regular catches and only view your bait gathering waypoints when stocking the livewell.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 4: 3D Trophy Cards & Sharing */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                    Step-by-Step 04
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Interactive 3D Trophy Cards & Social Reports
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-purple-300 font-mono">Holographic 3D Tilt & Glare</div>
                  <p className="text-slate-400 leading-relaxed">
                    Tap any catch in your logbook and open <strong className="text-purple-300">View 3D Trophy Card</strong>. Move your finger or cursor to tilt the collectible badge with dynamic holographic reflections and catch stats.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-purple-300 font-mono">1-Tap Social / Tournament Caption Copy</div>
                  <p className="text-slate-400 leading-relaxed">
                    Tap <strong className="text-slate-200">Copy Caption</strong> to generate a formatted text summary ready for Facebook, Instagram, or fishing forums (includes species, weight, bait, Solunar rating, and river specs).
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 5: Offline Backups & Export */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                    Step-by-Step 05
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Backups, CSV Exports & Switching Phones
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Your data is stored 100% locally on your device for total privacy. Never worry about losing catches when clearing browser history:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-emerald-400 font-mono">Export JSON Backup</div>
                  <p className="text-slate-400 leading-relaxed">
                    Creates an encrypted complete database backup including coordinates, photos, and bait notes. Transfer to a new phone and tap <strong className="text-slate-200">Import JSON Backup</strong> to restore everything.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="font-bold text-sky-400 font-mono">Export CSV Spreadsheet</div>
                  <p className="text-slate-400 leading-relaxed">
                    Downloads an Excel/Sheets compatible spreadsheet with columns for date, time, species, length, weight, bait, GPS, and moon phase.
                  </p>
                </div>
              </div>

              {/* Local Photo Storage & Repair Banner */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Offline Photo Recovery & Storage Repair</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  If photos ever appear as broken image icons after an offline weekend trip or device restart, tap the sync cloud icon in the top header or visit <strong className="text-white">Settings → Offline Database & Backups</strong> and tap <strong className="text-cyan-300">Scan & Repair Photos</strong>. LEDGEr will scan local IndexedDB binary storage, re-hydrate image links, and verify trophy card rendering.
                </p>
              </div>
            </div>

            {/* Guide Section 6: Tactical Pattern Analytics & Rig Matrices */}
            <div id="step-06-tactical" className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                    Step-by-Step 06
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Tactical Pattern Analytics & Rig Matrices
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                As you log catches over time, LEDGEr unlocks deep tactical correlations—decoding the seasonal, hydrological, and rigging combinations that actually trigger river strikes.
              </p>

              <div className="space-y-2.5 text-xs">
                {/* 1. Species-Specific Filtering */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30">1</span>
                    <span>Species-Specific Behavioral Slicing</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Tap any species pill (<strong className="text-sky-400">Blue Catfish</strong>, <strong className="text-amber-400">Flathead</strong>, <strong className="text-emerald-400">Channel Cat</strong>, or <strong className="text-purple-400">Striped Bass</strong>) in the Pattern Engine. Every graph and ranking recalculates exclusively for that fish:
                  </p>
                  <ul className="list-disc pl-11 space-y-1 text-slate-400 leading-relaxed">
                    <li><strong className="text-sky-300">Blue Catfish:</strong> Reveals current seam speeds, ledge drop-offs, and deep winter basin migrations.</li>
                    <li><strong className="text-amber-300">Flathead Catfish:</strong> Isolates heavy timber, rootwad slack eddies, and nocturnal live-bait strikes.</li>
                    <li><strong className="text-emerald-300">Channel Catfish:</strong> Highlights mid-depth flats, rip-rap points, and scent dispersion rigs.</li>
                  </ul>
                </div>

                {/* 2. Presentations & Deadly Rig Combos */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-orange-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] text-orange-400 border border-orange-500/30">2</span>
                    <span>Deadly Presentation & Rig Rankings</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Compares Santee Cooper Rigs (pegging bait above bottom silt), Carolina Rigs, Slip Sinkers, and Suspended Down-Rods. Shows both total strike volume and <strong className="text-white">average weight per rig</strong> so you can distinguish "dink catchers" from trophy setups.
                  </p>
                </div>

                {/* 3. Bait Normalization Engine */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-lime-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-lime-500/20 flex items-center justify-center text-[10px] text-lime-400 border border-lime-500/30">3</span>
                    <span>Bait Normalization Engine</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Never worry about typing inconsistencies on deck. Whether you typed "cut skip", "skipjack chunk", "fresh skipjack", or "skip head", LEDGEr automatically cleans and consolidates them into <strong className="text-lime-300">"Cut Skipjack"</strong> for unified historical analytics.
                  </p>
                </div>

                {/* 4. Water Temperature & Barometric Fronts */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 border border-cyan-500/30">4</span>
                    <span>Water Temp Bands & Pressure Front Trends</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Tracks fish activity across critical biological thresholds:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7 pt-1">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-cyan-400 font-mono block">&lt; 45°F • Winter Lethargy</span>
                      <span className="text-slate-400 text-[11px]">Deepest scour holes, zero current, slow bloody presentation.</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="font-bold text-amber-400 font-mono block">55–68°F • Pre-Spawn Prime</span>
                      <span className="text-slate-400 text-[11px]">Aggressive feeding run onto shallow mud flats and channel edges.</span>
                    </div>
                  </div>
                  <p className="text-slate-400 pl-7 pt-1 leading-relaxed">
                    Also tracks barometric front movements: <strong className="text-emerald-400">Falling Pressure (&lt; 29.85 inHg)</strong> triggers aggressive pre-frontal feeding, while <strong className="text-slate-300">Post-Front High Pressure (&gt; 30.15 inHg)</strong> tightens fish deep into heavy structure.
                  </p>
                </div>

                {/* 5. Trophy Mode Slicing */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-purple-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] text-purple-400 border border-purple-500/30">5</span>
                    <span>Trophy Mode Filter (10+ & 20+ Lbs)</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Flip the <strong className="text-purple-400">"Trophy Only (10+ lbs)"</strong> switch to strip out smaller numbers. Discover the exact baits, current seams, and depths that produce giant river catfish versus average schoolies.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 7: Today's Tactical Gameplan */}
            <div id="step-07-gameplan" className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 block">
                    Step-by-Step 07
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Today's Tactical Gameplan & Live USGS Matching
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Before dropping your lines in the water, open <strong className="text-amber-400">Today's Tactical Gameplan</strong> (the top toggle in Pattern Engine) to answer the #1 question on the water: <em>"What setup has the highest probability of catching fish right now?"</em>
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sky-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px] text-sky-400 border border-sky-500/30">1</span>
                    <span>Live USGS Hydrology Telemetry Stream</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    LEDGEr contacts the closest <strong className="text-white">USGS Water Services river monitoring station</strong> based on your GPS fix, streaming real-time water temperature (°F), streamflow discharge (CFS), and river gage height directly to your phone.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 border border-emerald-500/30">2</span>
                    <span>Environmental Similarity Engine</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    The engine computes a mathematical match score comparing today's live conditions (water temp, barometric trend, time of day, Solunar rating) against your past successes. It delivers:
                  </p>
                  <ul className="list-disc pl-11 space-y-1 text-slate-400 leading-relaxed">
                    <li><strong className="text-white">Primary Recommended Rig & Bait:</strong> Highest-confidence rig, bait type, and target strike depth.</li>
                    <li><strong className="text-white">Optimal Structure & Current:</strong> Exact river features to anchor or drift (e.g. Channel Ledge, Eddy Seam, Scour Hole).</li>
                    <li><strong className="text-white">Celestial Feeding Schedule:</strong> Upcoming Major and Minor Solunar feed windows calculated for your latitude/longitude.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-orange-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] text-orange-400 border border-orange-500/30">3</span>
                    <span>1-Tap "Deploy Setup to Log Catch"</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Tap the glowing amber <strong className="text-orange-400">"Deploy Setup to Log Catch"</strong> button. LEDGEr instantly opens the catch modal prefilled with the recommended species, presentation rig, bait, target depth, and structure—allowing you to log a strike in seconds with minimal tapping.
                  </p>
                </div>
              </div>
            </div>

            {/* Guide Section 8: River Navigation & Decoupled Boat GPS */}
            <div id="step-08-navigation" className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                    Step-by-Step 08
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    River Navigation & Decoupled Boat GPS
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-emerald-300 font-mono">Decoupled Map Exploration (Never Loses Your Boat)</div>
                  <p className="text-slate-400 leading-relaxed">
                    Freely drag and zoom the satellite map to scout river bends, tailwaters, or locks 10 miles downstream. Panning the camera will <strong className="text-white">never override or drift your vessel's actual locked GPS fix</strong>. Whenever you log a catch or drop a pin, it always stamps your boat's physical position.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-cyan-300 font-mono">1-Tap "Snap Camera to Boat"</div>
                  <p className="text-slate-400 leading-relaxed">
                    If you panned away, tap the crosshair target button in the bottom-right of the map to smoothly fly the camera straight back to your vessel's live coordinates with one touch.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="font-bold text-amber-300 font-mono">In-Place Waypoint Pin Repositioning</div>
                  <p className="text-slate-400 leading-relaxed">
                    If steep river gorge bluffs caused initial GPS drift, open the catch in Master Logbook and tap <strong className="text-white">Adjust Location</strong>. Tap <strong className="text-cyan-400">Snap to Current GPS Fix</strong> or type coordinates to reposition your catch marker on the water without deleting or re-entering data.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: BETA TESTER FIELD GUIDE */}
        {activeTab === 'beta' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* Beta Mission Header & Quick Action Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border-2 border-amber-500/40 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                    <FlaskConical className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
                      Official Beta Testing Protocol
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                      Beta Tester Onboarding & Field Guide
                    </h2>
                    <p className="text-xs text-slate-300 font-sans mt-0.5">
                      Everything needed from the first invite message to field testing on the river deck with wet hands and zero cell reception.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    id="btn-copy-beta-invite-guide"
                    onClick={handleCopyInvite}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-mono font-bold transition active:scale-95 cursor-pointer shadow"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInvite ? 'Invite Copied!' : 'Copy Invite SMS'}</span>
                  </button>
                  <button
                    type="button"
                    id="btn-email-feedback-guide"
                    onClick={handleEmailFeedback}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-mono font-black transition active:scale-95 cursor-pointer shadow"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Feedback</span>
                  </button>
                </div>
              </div>

              {copiedInvite && (
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tester invitation text copied to clipboard! Ready to paste into Messages, WhatsApp, or email.</span>
                </div>
              )}
            </div>

            {/* Phase 1: Invitation & 10-Second Home Screen Installation */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                    Phase 01 • Before Leaving Home
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Installation & Device Permissions
                  </h3>
                </div>
              </div>

              {/* Crucial in-app browser warning */}
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-1 text-xs">
                <div className="flex items-center gap-2 font-bold text-red-300 font-mono">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>CRITICAL: Avoid In-App Social Browsers</span>
                </div>
                <p className="text-slate-300 leading-relaxed pl-6">
                  If someone opens the invite link inside <strong>Facebook Messenger, Instagram, or text-message webviews</strong>, features like home screen icons, camera access, and offline map caching will be blocked. Testers must open the link directly in <strong>Safari (iPhone)</strong> or <strong>Chrome (Android)</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* iOS Setup */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400 font-mono">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30">🍎</span>
                    <span>iPhone / iPad (iOS Safari)</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300 leading-relaxed">
                    <li>Open invite link in <strong className="text-white">Safari</strong>.</li>
                    <li>Tap the <strong className="text-white">Share button</strong> (square with arrow pointing up).</li>
                    <li>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong className="text-white">"Add"</strong> in the top-right. The <strong className="text-orange-400">LEDGEr</strong> icon will appear on the home screen.</li>
                  </ol>
                </div>

                {/* Android Setup */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 border border-emerald-500/30">🤖</span>
                    <span>Android (Google Chrome)</span>
                  </div>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300 leading-relaxed">
                    <li>Open invite link in <strong className="text-white">Google Chrome</strong>.</li>
                    <li>Tap the <strong className="text-white">three dots menu (⋮)</strong> in the top-right corner.</li>
                    <li>Tap <strong className="text-white">"Install App"</strong> or <strong className="text-white">"Add to Home screen"</strong>.</li>
                    <li>Confirm install. The <strong className="text-orange-400">LEDGEr</strong> app launches full-screen.</li>
                  </ol>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <span className="font-mono font-bold text-slate-300 block">Required Device Permissions Checklist:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-200">Precise Location (GPS):</strong> Must choose "Allow While Using App" with "Precise" toggled ON so coordinates lock within meters.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-200">Camera / Media:</strong> Allow access so photos can be snapped on deck and framed directly onto cards.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 2: Pre-Trip Ramp Preparation */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                    Phase 02 • At the Boat Ramp (Wi-Fi / LTE)
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    50-Mile Offline Satellite Banking & Telemetry
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Before launching the boat into remote river bends where cellular reception vanishes, testers must bank their offline safety cache:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 border border-cyan-500/30">1</span>
                    <span>Bank the 50-Mile Safety Radius</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    While connected to LTE at the ramp, tap <strong className="text-slate-200">BANK 50-MI MAP</strong> (top-left of map or in Settings). Watch the progress bar download satellite and terrain tiles.
                  </p>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Notice the <strong className="text-cyan-400">green 50-mile safety ring</strong> drawn on the map: inside this circle, high-detail satellite imagery will continue to pan and zoom smoothly with <strong>zero cell signal</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 font-mono">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] text-cyan-400 border border-cyan-500/30">2</span>
                    <span>Check River Telemetry & Solunar Rating</span>
                  </div>
                  <p className="text-slate-400 pl-7 leading-relaxed">
                    Open the top ticker to verify real-time USGS river flow (CFS), gage height, barometric pressure trend, and celestial Solunar feed rating (Major / Minor feed hours).
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 3: On-the-Water Testing Routine */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block">
                    Phase 03 • On the Deck (The Angler Workflow)
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    10-Second Catch Logging & Dead Zone Testing
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 10-Second Logging */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-orange-300 font-mono">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span>The 10-Second Wet-Hand Catch Test</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    When a fish is in the net, tap the big amber <strong className="text-orange-400">+ Log Catch</strong> button. Testers should notice:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 leading-relaxed">
                    <li><strong className="text-slate-200">Zero Typing Required:</strong> Exact GPS coordinates, air temperature, barometric pressure trend, moon phase, and Solunar score are captured automatically.</li>
                    <li><strong className="text-slate-200">Single-Thumb Taps:</strong> Quick-select species (Blue Catfish, Flathead, Striper, Bass), depth, weight, and bait rig.</li>
                    <li><strong className="text-slate-200">Live Camera Snapshot:</strong> Snap a quick photo right on the deck or attach from camera roll.</li>
                  </ul>
                </div>

                {/* Bait Hub */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300 font-mono">
                    <Fish className="w-4 h-4 text-amber-400" />
                    <span>Bait Spot Pinning (Skipjack, Shad, Bluegill)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    When cast-netting or sabiki-rigging bait along eddies or creek mouths, flip the <strong className="text-amber-400">"Mark as Bait Spot"</strong> toggle.
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    On the satellite map, tap the <strong className="text-amber-400">"BAIT"</strong> filter chip. Notice how it instantly hides regular gamefish catches and highlights only your bait honey holes so you can stock the livewell quickly.
                  </p>
                </div>

                {/* Airplane Mode Test */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-orange-500/40 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-400 font-mono">
                    <WifiOff className="w-4 h-4 text-orange-400" />
                    <span>The "Dead Zone" Airplane Mode Stress Test</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Instruct testers to turn on their phone's <strong className="text-white">Airplane Mode</strong> on the water to simulate zero cellular coverage.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 leading-relaxed">
                    <li>Log a catch in Airplane Mode with a photo. Confirm it saves immediately to local IndexedDB storage with <strong>zero error screens or loading freezes</strong>.</li>
                    <li>Check the sync badge: It displays <strong className="text-amber-400">⚡ Offline - Saved Locally</strong> and queues data safely.</li>
                    <li>Turn Airplane Mode OFF: Watch the cloud sync indicator update. LEDGEr validates that both the catch data and binary photo uploads succeed before flagging records as <strong className="text-emerald-400">✓ Synced</strong>, preventing false "synced" status if cell signal drops out.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Phase 4: Trophy Card Studio & Photo Cropping */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block">
                    Phase 04 • Post-Trip Studio
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Trophy Baseball Card Studio & Framing
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-purple-300 font-mono">Photo Framing & Crop Persistence Test</div>
                  <p className="text-slate-300 leading-relaxed">
                    Open any catch and tap <strong className="text-purple-400">"Open Baseball Card Studio"</strong>.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400 leading-relaxed">
                    <li>Test <strong className="text-slate-200">Fill Frame</strong> vs. <strong className="text-slate-200">Letterbox</strong>, tap <strong className="text-slate-200">Rotate 90°</strong>, or tap <strong className="text-slate-200">Crop & Move</strong> to pan and zoom the catch photo.</li>
                    <li><strong className="text-emerald-400">Persistence Test:</strong> Close the studio modal and reopen it. Confirm your zoom, crop, and rotation settings stayed permanently saved.</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-amber-300 font-mono">Honey-Hole GPS Privacy Toggle Test</div>
                  <p className="text-slate-300 leading-relaxed">
                    Check the back of the card: By default, exact coordinates are printed (<strong className="text-white">📍 HONEY-HOLE GPS: lat°, lon°</strong>).
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Test tapping the <strong className="text-amber-400">"Hide"</strong> button before sharing to social media. Notice how exact coordinates are instantly masked with <strong className="text-slate-200">"CHATTAHOOCHEE RIVER BASIN (HONEY-HOLE HIDDEN)"</strong> to protect your secret structure.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-cyan-300 font-mono">2-Image Social Carousel Export</div>
                  <p className="text-slate-300 leading-relaxed">
                    Tap <strong className="text-cyan-400">Share Card to Social Apps</strong> to generate high-resolution Front & Back images formatted perfectly for Instagram and Facebook 2-image carousel posts.
                  </p>
                </div>
              </div>
            </div>

            {/* Phase 5: What to Evaluate & How to Submit Feedback */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block">
                    Phase 05 • Feedback & Bugs
                  </span>
                  <h3 className="text-base font-bold text-white font-mono">
                    Evaluation Criteria & Direct Reporting
                  </h3>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                When testers finish their trip, have them review these 4 key evaluation questions:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block">1. GPS Lock Speed</span>
                  <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
                    Did coordinates stamp quickly when you pressed "+ Log Catch" out on open water?
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block">2. Sunlight Readability</span>
                  <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
                    Was the high-contrast interface and map readable in harsh, direct deck glare?
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block">3. Offline Satellite Rendering</span>
                  <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
                    Did banked satellite tiles stay clear and sharp when cell signal dropped to zero?
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-amber-400 font-bold block">4. Camera & Card Studio</span>
                  <p className="text-slate-400 font-sans leading-relaxed text-[11px]">
                    Did photo uploads feel snappy, and was photo framing/cropping easy to adjust?
                  </p>
                </div>
              </div>

              {/* Direct Feedback Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="space-y-0.5 text-center sm:text-left">
                  <div className="text-xs font-bold text-white font-mono">Ready to submit field notes?</div>
                  <div className="text-[11px] text-slate-400">Opens a pre-formatted email draft addressed directly to David.</div>
                </div>

                <button
                  type="button"
                  id="btn-send-beta-feedback-footer"
                  onClick={handleEmailFeedback}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer font-mono"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Field Feedback</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB: PRIVACY & GOOGLE PLAY DATA SAFETY */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Banner */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-emerald-300 font-mono">
                    OFFICIAL PRIVACY POLICY & DATA SAFETY
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Play Store Compliant
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Clear, transparent disclosure of how device permissions and angler data are managed in LEDGEr. No secret tracking, no spot-sharing brokers.
                </p>
              </div>
            </div>

            {/* Public URL & Copy Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Public Privacy Policy URL (for Google Play Console)
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/privacy` : 'https://your-domain.com/privacy'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyPrivacyUrl}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs shadow transition active:scale-95 cursor-pointer font-mono"
                >
                  {copiedPrivacyUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrivacyUrl ? 'URL Copied!' : 'Copy URL'}</span>
                </button>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow transition active:scale-95 font-mono"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Core Privacy Declarations */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
                Permission Disclosures & Scope
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <MapPin className="w-4 h-4" />
                    <span>Precise Location (GPS)</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
                    Stamps latitude and longitude on your personal catch logs and bait spots. Active strictly while using the console on deck. <strong>Never tracked in background when app is closed.</strong>
                  </p>
                  <span className="inline-block text-[10px] bg-slate-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    ✓ 100% On-Device IndexedDB
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-orange-400 font-bold">
                    <Camera className="w-4 h-4" />
                    <span>Camera & Photo Library</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
                    Used solely when you choose to take or attach a catch photo for Trophy Cards. Photos are resized and compressed locally on your device to under 500KB.
                  </p>
                  <span className="inline-block text-[10px] bg-slate-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    ✓ Zero Cloud Scraping
                  </span>
                </div>
              </div>
            </div>

            {/* Google Play Console Data Safety Mapping Guide */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white font-mono text-sm">
                    Play Console Data Safety Form Cheat-Sheet
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  For App Submission
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">1. Does your app collect or share user data?</div>
                  <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                    Select <strong>Yes</strong> (for location & photos), and declare: <em>"Data is stored locally on the device for core app functionality and is not shared with third-party brokers or advertisers."</em>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">2. Is all user data collected by your app encrypted in transit?</div>
                  <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                    Select <strong>Yes</strong>. All API endpoints and telemetry requests use HTTPS/TLS 1.3 encryption.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400">3. Do you provide a way for users to request data deletion?</div>
                  <p className="text-slate-300 font-sans text-[11px] leading-relaxed">
                    Select <strong>Yes</strong>. Users can instantly wipe all catch logs, photos, and cached maps via the in-app <em>"Clear All Logs"</em> button, or email the developer.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Ownership & Export */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-white font-mono flex items-center gap-2">
                <Database className="w-4 h-4 text-sky-400" />
                <span>Angler Data Portability & Rights</span>
              </h4>
              <p className="text-slate-300 font-sans leading-relaxed">
                Your fishing logs belong to you. At any moment, you can export your entire database to standard CSV spreadsheet or JSON backup files, or delete all records with a single tap.
              </p>
            </div>

            {/* Google Play Store Graphics Download Section */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-orange-400" />
                  <h3 className="font-bold text-white text-sm">
                    Store Graphics Pack (Direct Download)
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded">
                  Ready for Console
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Download the official pre-rendered high-resolution assets generated directly for your Google Play Store listing:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 512x512 Icon */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src="/icon-512.png" alt="512 Icon" className="w-10 h-10 rounded-xl border border-slate-700 object-cover" />
                    <div>
                      <div className="font-bold text-white text-xs">App Icon (512×512)</div>
                      <div className="text-[10px] text-slate-400">32-bit PNG • Transparent</div>
                    </div>
                  </div>
                  <a
                    href="/icon-512.png"
                    download="ledger-playstore-icon-512.png"
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-slate-950 font-bold text-xs shadow transition active:scale-95 text-center"
                  >
                    Download
                  </a>
                </div>

                {/* 1024x500 Feature Graphic */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src="/feature-graphic.png" alt="Feature Graphic" className="w-14 h-8 rounded-lg border border-slate-700 object-cover" />
                    <div>
                      <div className="font-bold text-white text-xs">Feature Graphic (1024×500)</div>
                      <div className="text-[10px] text-slate-400">Official Store Banner PNG</div>
                    </div>
                  </div>
                  <a
                    href="/feature-graphic.png"
                    download="ledger-playstore-feature-graphic-1024x500.png"
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow transition active:scale-95 text-center"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: APP INFO & SYSTEM SPECS */}
        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            
            {/* About Narrative */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-7 space-y-3 shadow-lg">
              <div className="flex items-center space-x-2.5 text-white font-bold text-base sm:text-lg">
                <Fish className="w-5 h-5 text-orange-400" />
                <h2 className="font-mono">About LEDGEr</h2>
              </div>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                <strong className="text-white">LEDGEr</strong> is a clean, no-nonsense freshwater catch log designed to record your fish quickly and accurately right from the deck. No social feeds, no ads, no public clouds broadcasting your spots—just a personal, reliable digital ledger to track your catches, bait honey holes, and environmental patterns with minimal taps.
              </p>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1">
                Engineered with an offline-first architecture for remote river canyons and reservoirs where cellular signals don't reach.
              </p>
            </div>

            {/* System Architecture Specs */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 px-1">
                Technical Architecture & Performance Specs
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <Waves className="w-4 h-4" />
                    <span>USGS Water Services REST API</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Queries the nearest USGS hydrologic stream monitoring station based on vessel coordinates, streaming real-time CFS discharge, gage height, and water temperature.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <Gauge className="w-4 h-4" />
                    <span>Open-Meteo MSL Barometric Delta</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Computes Mean Sea Level (MSL) atmospheric pressure in inHg and calculates 3-hour front deltas (rising, falling fast, or steady) to detect pre-frontal feeding windows.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-lime-400 font-bold">
                    <Fish className="w-4 h-4" />
                    <span>Bait Normalization Engine</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Client-side regular expression and alias pipeline that consolidates free-form angler bait entries into standardized categories for consistent historical pattern analysis.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Satellite className="w-4 h-4" />
                    <span>50-Mile Offline CacheStorage</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    High-throughput browser CacheStorage storing satellite imagery tiles locally across a 50-mile statute radius from your launch coordinates.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Database className="w-4 h-4" />
                    <span>IndexedDB High-Capacity Storage</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Catches, bait records, high-res photos, and waypoint markers are persisted in IndexedDB, capable of holding thousands of catches without bogging down.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero-Server Privacy Guarantee</span>
                  </div>
                  <p className="text-slate-400 font-sans leading-relaxed">
                    Your honey holes and GPS coordinates never leave your device. There is no central tracking database or public feed.
                  </p>
                </div>
              </div>
            </div>

            {/* Version 2.6.0 Changelog Highlights */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <h3 className="font-bold text-white font-mono text-sm">Version 2.6.0 Changelog Highlights</h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                  Current Release • Tactical Intelligence
                </span>
              </div>

              <ul className="space-y-2 text-xs text-slate-300 font-sans">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Tactical Pattern Analytics Suite:</strong> Multi-factor correlation engine ranking presentations, rigs, baits, water temp bands, and barometric fronts by bite frequency and average weight.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Today's Tactical Gameplan ("What Should I Run Today?"):</strong> Environmental similarity engine comparing live water temp, flow rate, and pressure trend against your logged catches to output high-probability setups.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>USGS Real-Time River Hydrology:</strong> Live streamflow (CFS), gage height, and water temperature fetched from the nearest official USGS river monitoring station.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Bait Normalization Engine:</strong> Dynamic alias consolidation turning deck shorthand into clean, unified bait analytics across your entire ledger.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>1-Tap Setup Prefill ("Deploy to Log"):</strong> Automatically seeds species, presentation, bait, depth, and structure into the 10-second catch logger.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Trophy Mode Slicing (10+ & 20+ Lbs):</strong> Filter pattern analytics specifically for monster catches to isolate big-fish rigs from dink-catchers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Smart GPS 50-Mile Offline Map Banking:</strong> Distance-aware tile caching that skips re-downloading when returning to familiar boat ramps.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>IndexedDB Photo Auto-Repair:</strong> Bulletproof 2-tier binary photo recovery that prevents broken image icons after offline river excursions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Decoupled Map Navigation & Pin Snap:</strong> Free camera navigation without overriding vessel GPS, plus in-place coordinate adjustment.</span>
                </li>
              </ul>
            </div>

          </div>
        )}

        {/* Creator Credits & Footer */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 text-center space-y-3">
          <div className="flex items-center justify-center space-x-2 text-slate-400 text-xs font-mono">
            <Ship className="w-4 h-4 text-orange-400" />
            <span>AUTHENTIC RIVER CRAFT</span>
          </div>

          <p className="text-sm font-semibold text-white">
            Engineered for anglers from the deck of <span className="text-orange-400 font-bold">BIGGUY_littleboat</span>.
          </p>

          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Built for small-boat catfishermen, multi-species river explorers, and bait gatherers navigating moving water.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer font-mono"
            >
              Return to Deck Console
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AboutModal;


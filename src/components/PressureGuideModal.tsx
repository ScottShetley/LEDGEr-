import React from 'react';
import {
  Gauge,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Zap,
  Clock,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { EnvironmentalSnapshot } from '../types';

interface PressureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: EnvironmentalSnapshot | null;
}

interface PressureRangeInfo {
  range: string;
  inHgRange: [number, number];
  status: string;
  rating: 'Prime' | 'Good' | 'Fair' | 'Tough' | 'Poor';
  badgeColor: string;
  biteCondition: string;
  fishLocation: string;
  tactic: string;
}

const PRESSURE_ZONES: PressureRangeInfo[] = [
  {
    range: 'Rapidly Falling (Pre-Frontal)',
    inHgRange: [29.6, 29.9],
    status: 'Falling Fast ↘',
    rating: 'Prime',
    badgeColor: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/50',
    biteCondition: '🔥 Peak Feeding Frenzy: Trophy catfish feed aggressively ahead of incoming fronts, clouds, and storms.',
    fishLocation: 'Moving aggressively up onto shallow flats, current seams, and channel edges.',
    tactic: 'Fast drifts, large fresh cut bait chunks, active planer boards, and rattle floats.',
  },
  {
    range: 'Low Pressure (< 29.70 inHg)',
    inHgRange: [29.0, 29.7],
    status: 'Low & Rainy ☁️',
    rating: 'Good',
    badgeColor: 'text-cyan-400 bg-cyan-950/70 border-cyan-500/50',
    biteCondition: 'Overcast skies and rain scatter baitfish; predators roam freely away from heavy timber.',
    fishLocation: 'Suspended in mid-depths or roaming flats without fear of direct sunlight.',
    tactic: 'Suspended down-rods, slip-bobbers with live bait, drifting shallow flats.',
  },
  {
    range: 'Normal & Steady (29.80 - 30.15 inHg)',
    inHgRange: [29.8, 30.15],
    status: 'Steady Baseline →',
    rating: 'Good',
    badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
    biteCondition: 'Reliable, predictable feeding windows governed by current generation and solunar times.',
    fishLocation: 'Staged on primary river ledges, wing dams, humps, and logjams.',
    tactic: 'Carolina slip-sinker, Santee Cooper rigs bumping current breaks.',
  },
  {
    range: 'Rapidly Rising (> 30.15 inHg & Rising)',
    inHgRange: [30.15, 30.6],
    status: 'Rising Fast ↗',
    rating: 'Tough',
    badgeColor: 'text-rose-400 bg-rose-950/70 border-rose-500/50',
    biteCondition: '❄️ The "Bluebird Sky" Lockdown: Post-cold front high pressure expands swim bladders and causes discomfort.',
    fishLocation: 'Buried deep inside dense rootwads, logjams, or belly-to-the-mud in the deepest holes.',
    tactic: 'Downsize baits, dead-stick directly in the brush, punch baits right in front of their noses.',
  },
  {
    range: 'Prolonged High (> 30.25 inHg)',
    inHgRange: [30.25, 30.8],
    status: 'High & Clear ☀️',
    rating: 'Fair',
    badgeColor: 'text-amber-400 bg-amber-950/70 border-amber-500/50',
    biteCondition: 'Fish slowly acclimate after 48-72 hours. Bites improve around dawn, dusk, and shaded banks.',
    fishLocation: 'Shaded river bends, deep scour holes under bridges, dense underwater timber.',
    tactic: 'Fresh bloody cut bait heads placed right on the deepest edge of structure.',
  },
];

export const PressureGuideModal: React.FC<PressureGuideModalProps> = ({
  isOpen,
  onClose,
  weather,
}) => {
  if (!isOpen) return null;

  const currentPressure = weather?.pressureInHg ?? 29.85;
  const currentTrend = weather?.pressureTrend ?? 'steady';

  // Determine current active zone
  let activeZone = PRESSURE_ZONES[2]; // fallback normal
  if (currentTrend === 'falling') {
    activeZone = PRESSURE_ZONES[0];
  } else if (currentTrend === 'rising' && currentPressure >= 30.1) {
    activeZone = PRESSURE_ZONES[3];
  } else if (currentPressure < 29.75) {
    activeZone = PRESSURE_ZONES[1];
  } else if (currentPressure > 30.2) {
    activeZone = PRESSURE_ZONES[4];
  } else {
    activeZone = PRESSURE_ZONES[2];
  }

  // Calculate gauge cursor percent (29.2 inHg = 0%, 30.5 inHg = 100%)
  const minVal = 29.2;
  const maxVal = 30.5;
  const clampedPressure = Math.min(Math.max(currentPressure, minVal), maxVal);
  const pointerPercent = ((clampedPressure - minVal) / (maxVal - minVal)) * 100;

  return (
    <div
      id="barometric-pressure-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pressure-guide-title"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="pressure-guide-title"
                  className="text-base sm:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2"
                >
                  <span>Barometric Pressure Master Guide</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  BITE TIMING INTEL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                How barometric shifts, cold fronts, and swim bladder biology dictate bite activity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close pressure guide"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-200 text-sm font-sans">
          {/* Current Live Barometer Reading Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/50 border border-cyan-500/40 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/40 text-cyan-400 shadow-inner">
                  <Activity className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500 text-slate-950">
                      CURRENT BAROMETER
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Trend: <strong className="text-white capitalize">{currentTrend}</strong>
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                      {currentPressure.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-slate-400 uppercase">
                      inHg
                    </span>
                    {currentTrend === 'rising' && (
                      <span className="inline-flex items-center text-emerald-400 font-mono font-bold text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> Rising ↗
                      </span>
                    )}
                    {currentTrend === 'falling' && (
                      <span className="inline-flex items-center text-rose-400 font-mono font-bold text-xs bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                        <TrendingDown className="w-3.5 h-3.5 mr-1" /> Dropping ↘
                      </span>
                    )}
                    {currentTrend === 'steady' && (
                      <span className="inline-flex items-center text-slate-300 font-mono font-bold text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        <Minus className="w-3.5 h-3.5 mr-1" /> Steady →
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status diagnosis */}
              <div className="sm:text-right">
                <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                  Active Feeding Window Diagnosis:
                </span>
                <span
                  className={`text-xs sm:text-sm font-mono font-black px-3 py-1.5 rounded-xl border uppercase inline-block shadow-sm ${activeZone.badgeColor}`}
                >
                  {activeZone.rating === 'Prime' ? '🔥 PRIME BITE WINDOW' : `${activeZone.rating} Bite Conditions`}
                </span>
              </div>
            </div>
          </div>

          {/* VISUAL GRAPHIC: Interactive Barometric Curve & Scale */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>The Barometric Bite Curve (Graphic Diagram)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Green = Prime Feed • Red = Lockdown
              </span>
            </div>

            {/* Custom Interactive SVG Pressure Spectrum Curve */}
            <div className="relative pt-4 pb-2">
              {/* Curve Background Graphic */}
              <div className="h-16 w-full rounded-2xl bg-gradient-to-r from-cyan-600 via-emerald-500 via-amber-500 to-rose-600 p-0.5 shadow-lg">
                <div className="h-full w-full rounded-[14px] bg-slate-950/85 backdrop-blur-sm flex items-center justify-between px-3 sm:px-6 relative overflow-hidden">
                  
                  {/* Visual Background Wave */}
                  <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 400 100">
                    <path
                      d="M0,60 C80,10 160,80 240,40 C320,10 360,90 400,30"
                      fill="none"
                      stroke="url(#gradient-line)"
                      strokeWidth="4"
                    />
                    <defs>
                      <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="40%" stopColor="#10b981" />
                        <stop offset="70%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f43f5e" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Zone Markers on Graphic */}
                  <div className="relative z-10 text-left">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                      &lt; 29.70 inHg
                    </span>
                    <span className="text-[11px] font-bold text-white">Rain / Storm</span>
                  </div>

                  <div className="relative z-10 text-center">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      29.80 - 30.05 inHg
                    </span>
                    <span className="text-[11px] font-bold text-white">🔥 Pre-Front / Normal</span>
                  </div>

                  <div className="relative z-10 text-right">
                    <span className="text-[10px] font-mono text-rose-400 font-bold block">
                      &gt; 30.20 inHg
                    </span>
                    <span className="text-[11px] font-bold text-white">Post-Front Sky</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Needle Marker */}
              <div
                className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-500"
                style={{ left: `${pointerPercent}%` }}
              >
                <div className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-mono font-black text-[10px] shadow-lg flex items-center gap-1 border border-white">
                  <span>YOU: {currentPressure.toFixed(2)}</span>
                </div>
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-cyan-400" />
              </div>
            </div>

            {/* Scale legend */}
            <div className="grid grid-cols-3 text-center text-[10px] font-mono text-slate-400 pt-1">
              <div>Low (Cloudy / Rain)</div>
              <div>Normal Baseline (Consistent)</div>
              <div>High (Bright Bluebird Skies)</div>
            </div>
          </div>

          {/* Good Bite Times vs Bad Bite Times Comparison Matrix */}
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Good Bite Times vs Bad Bite Times Breakdown</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BEST BITE TIMES */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    🟢 Prime &amp; Good Bite Times
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      1. The 12-24 Hours Before a Cold Front (Dropping Barometer)
                    </strong>
                    <span>
                      Atmospheric pressure plunges ahead of squall lines or rain. Fish feel this immediately through their swim bladders and feed voraciously knowing tough conditions will follow.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      2. Prolonged Steady Pressure (29.90 - 30.10 inHg for 3+ Days)
                    </strong>
                    <span>
                      Stable weather produces predictable patterns. Fish maintain regular feeding routes on current seams, channel ledges, and wing dams without abrupt environmental stress.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      3. Overcast &amp; Light Drizzle (Low Steady Pressure)
                    </strong>
                    <span>
                      Cloud cover diffuses UV light. Trophy catfish leave deep daytime holes to roam shallow water without light sensitivity.
                    </span>
                  </div>
                </div>
              </div>

              {/* WORST BITE TIMES */}
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <h4 className="font-black text-sm uppercase tracking-wide">
                    🔴 Tough &amp; Bad Bite Times
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-rose-300 block mb-0.5">
                      1. The First 24-48 Hours After a Cold Front (Rapidly Rising &gt; 30.20)
                    </strong>
                    <span>
                      Post-frontal &quot;bluebird skies&quot; with crisp north winds and extreme high pressure. Fish swim bladders expand, creating physical pressure against organs. Fish shut their mouths and lock to the bottom.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-rose-300 block mb-0.5">
                      2. Mid-Storm Violent Spikes &amp; High Wind Changes
                    </strong>
                    <span>
                      Erratic fluctuations disorient baitfish and catfish. Presentations drift too fast or blow out of strike zones.
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-rose-300 block mb-0.5">
                      3. Extreme Heat Dome Stagnation
                    </strong>
                    <span>
                      High pressure combined with zero wind and hot stagnant water lowers dissolved oxygen, forcing fish into heavy deep river current seams.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Biological Anatomy Explanation: Swim Bladder */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Fish Biology: Why Do Catfish Care About Air Pressure?</span>
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed">
              Catfish are <strong>physostomous</strong> fish—their swim bladder is connected directly to their digestive tract via a pneumatic duct. While they can vent gas quickly compared to fish like perch or walleye, rapid atmospheric pressure drops and spikes alter the hydrostatic equilibrium in their body.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="font-bold text-cyan-300 block mb-1">
                  When Pressure Drops ↘
                </span>
                <span className="text-slate-300">
                  External water pressure slightly lessens. Fish feel energized and buoyant, encouraging them to swim aggressively and chase bait in shallower zones.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="font-bold text-rose-300 block mb-1">
                  When Pressure Rises ↗
                </span>
                <span className="text-slate-300">
                  Dense atmospheric weight presses down on the water column. The swim bladder expands against internal organs, inducing lethargy. Fish seek deep scour holes and press tight against bottom timber to equalize.
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Advice for Current Reading */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 block mb-0.5">
                Recommended Tactic Right Now ({currentPressure.toFixed(2)} inHg • {currentTrend}):
              </span>
              <span className="text-xs text-slate-200">
                {activeZone.tactic} <strong>Target Zone:</strong> {activeZone.fishLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Real-Time Station Barometer: <strong className="text-cyan-300">{currentPressure.toFixed(2)} inHg</strong> ({currentTrend})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition"
          >
            Got It, Back to Fishing
          </button>
        </div>
      </div>
    </div>
  );
};

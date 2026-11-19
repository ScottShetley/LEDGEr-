import React, { useState, useEffect, useMemo } from 'react';
import {
  Gauge,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Zap,
  Clock,
  ArrowRight,
  Pin,
  RotateCcw,
} from 'lucide-react';
import { EnvironmentalSnapshot } from '../types';
import {
  FishingBarometerDial,
  getDialConditionRating,
} from './FishingBarometerDial';

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

interface LaunchPinState {
  pressureInHg: number;
  pinnedAt: number;
}

const LAUNCH_PIN_STORAGE_KEY = 'bglb_barometer_launch_pin_v1';

const PRESSURE_ZONES: PressureRangeInfo[] = [
  {
    range: 'Rapidly Falling (Pre-Frontal)',
    inHgRange: [29.6, 29.9],
    status: 'Falling Fast',
    rating: 'Prime',
    badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40',
    biteCondition:
      'Peak Feeding Frenzy: Trophy catfish feed aggressively ahead of incoming fronts, clouds, and storms.',
    fishLocation:
      'Moving aggressively up onto shallow flats, current seams, and channel edges.',
    tactic:
      'Fast drifts, large fresh cut bait chunks, active planer boards, and rattle floats.',
  },
  {
    range: 'Low Pressure (< 29.70 inHg)',
    inHgRange: [29.0, 29.7],
    status: 'Low & Rainy',
    rating: 'Good',
    badgeColor: 'text-sky-300 bg-sky-950/60 border-sky-500/40',
    biteCondition:
      'Overcast skies and rain scatter baitfish; predators roam freely away from heavy timber.',
    fishLocation:
      'Suspended in mid-depths or roaming flats without fear of direct sunlight.',
    tactic:
      'Suspended down-rods, slip-bobbers with live bait, drifting shallow flats.',
  },
  {
    range: 'Normal & Steady (29.80 - 30.15 inHg)',
    inHgRange: [29.8, 30.15],
    status: 'Steady Baseline',
    rating: 'Good',
    badgeColor: 'text-emerald-300 bg-emerald-950/50 border-emerald-500/35',
    biteCondition:
      'Reliable, predictable feeding windows governed by current generation and solunar times.',
    fishLocation:
      'Staged on primary river ledges, wing dams, humps, and logjams.',
    tactic: 'Carolina slip-sinker, Santee Cooper rigs bumping current breaks.',
  },
  {
    range: 'Rapidly Rising (> 30.15 inHg & Rising)',
    inHgRange: [30.15, 30.6],
    status: 'Rising Fast',
    rating: 'Tough',
    badgeColor: 'text-rose-300 bg-rose-950/60 border-rose-500/40',
    biteCondition:
      'The "Bluebird Sky" Lockdown: Post-cold front high pressure expands swim bladders and causes discomfort.',
    fishLocation:
      'Buried deep inside dense rootwads, logjams, or belly-to-the-mud in the deepest holes.',
    tactic:
      'Downsize baits, dead-stick directly in the brush, punch baits right in front of their noses.',
  },
  {
    range: 'Prolonged High (> 30.25 inHg)',
    inHgRange: [30.25, 30.8],
    status: 'High & Clear',
    rating: 'Fair',
    badgeColor: 'text-amber-300 bg-amber-950/60 border-amber-500/40',
    biteCondition:
      'Fish slowly acclimate after 48-72 hours. Bites improve around dawn, dusk, and shaded banks.',
    fishLocation:
      'Shaded river bends, deep scour holes under bridges, dense underwater timber.',
    tactic:
      'Fresh bloody cut bait heads placed right on the deepest edge of structure.',
  },
];

function loadSavedLaunchPin(): LaunchPinState | null {
  try {
    const raw = localStorage.getItem(LAUNCH_PIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LaunchPinState;
    if (
      typeof parsed?.pressureInHg === 'number' &&
      !Number.isNaN(parsed.pressureInHg) &&
      typeof parsed?.pinnedAt === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function formatPinTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Today';
  }
}

export const PressureGuideModal: React.FC<PressureGuideModalProps> = ({
  isOpen,
  onClose,
  weather,
}) => {
  const [launchPin, setLaunchPin] = useState<LaunchPinState | null>(() =>
    loadSavedLaunchPin()
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const livePressure = weather?.pressureInHg ?? 29.92;
  const liveHpa =
    weather?.pressureHpa ?? Math.round(livePressure * 33.86389 * 10) / 10;
  const liveTrend = weather?.pressureTrend ?? 'steady';

  // Auto 3-hour-ago reference pressure from Open-Meteo (with graceful fallback for older cache)
  const auto3hRefInHg = useMemo(() => {
    if (typeof weather?.pressure3hAgoInHg === 'number') {
      return weather.pressure3hAgoInHg;
    }
    if (liveTrend === 'rising') return Math.round((livePressure - 0.05) * 100) / 100;
    if (liveTrend === 'falling') return Math.round((livePressure + 0.05) * 100) / 100;
    return livePressure;
  }, [weather?.pressure3hAgoInHg, livePressure, liveTrend]);

  const displayRefInHg = launchPin ? launchPin.pressureInHg : auto3hRefInHg;
  const displayRefLabel = launchPin ? 'Launch Pin' : '3h Ago';
  const displayDelta = livePressure - displayRefInHg;
  const displayTrend: 'rising' | 'falling' | 'steady' = launchPin
    ? displayDelta > 0.02
      ? 'rising'
      : displayDelta < -0.02
      ? 'falling'
      : 'steady'
    : liveTrend;

  const dialCondition = getDialConditionRating(livePressure);

  // Determine current active catfish zone
  const activeZone = useMemo(() => {
    if (displayTrend === 'falling') return PRESSURE_ZONES[0];
    if (displayTrend === 'rising' && livePressure >= 30.1) return PRESSURE_ZONES[3];
    if (livePressure < 29.75) return PRESSURE_ZONES[1];
    if (livePressure > 30.2) return PRESSURE_ZONES[4];
    return PRESSURE_ZONES[2];
  }, [livePressure, displayTrend]);

  const handlePinLaunchPressure = () => {
    const nextPin: LaunchPinState = {
      pressureInHg: livePressure,
      pinnedAt: Date.now(),
    };
    setLaunchPin(nextPin);
    try {
      localStorage.setItem(LAUNCH_PIN_STORAGE_KEY, JSON.stringify(nextPin));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleResetToAuto3h = () => {
    setLaunchPin(null);
    try {
      localStorage.removeItem(LAUNCH_PIN_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  if (!isOpen) return null;

  const signedDeltaLabel =
    Math.abs(displayDelta) < 0.005
      ? '0.00 inHg'
      : `${displayDelta > 0 ? '+' : ''}${displayDelta.toFixed(2)} inHg`;

  return (
    <div
      id="barometric-pressure-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pressure-guide-title"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="pressure-guide-title"
                className="text-base sm:text-lg font-bold text-white tracking-tight truncate"
              >
                Fishing Barometer &amp; Pressure Guide
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Analog pressure dial · 3-hour trend tracking · Catfish bite timing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close pressure guide"
            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-200 text-sm font-sans">
          {/* HERO INSTRUMENT: Analog Fishing Barometer + Live Telemetry & Controls */}
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Rugged Analog Fishing Barometer Dial */}
              <div className="lg:col-span-6 flex flex-col items-center">
                <FishingBarometerDial
                  pressureInHg={livePressure}
                  pressureHpa={liveHpa}
                  referencePressureInHg={displayRefInHg}
                  referenceLabel={displayRefLabel}
                  trend={displayTrend}
                  onCenterKnobClick={handlePinLaunchPressure}
                  className="w-full max-w-[340px] sm:max-w-[380px]"
                />
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#ef442f] inline-block rounded-full" />
                    Red: Live Pressure
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#e3c16f] inline-block rounded-full" />
                    Gold: {displayRefLabel} ({displayRefInHg.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Right: Precision Readout, Gold Needle Pinning & Live Tactic */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                {/* Primary Numeric Telemetry */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono uppercase tracking-wider text-slate-300 font-semibold">
                      Live Station Barometer
                    </span>
                    <span className="font-mono text-slate-400">
                      Dial Zone:{' '}
                      <strong
                        className={
                          dialCondition === 'GREAT'
                            ? 'text-sky-400'
                            : dialCondition === 'GOOD'
                            ? 'text-blue-400'
                            : 'text-slate-300'
                        }
                      >
                        {dialCondition}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-white font-mono tabular-nums tracking-tight">
                        {livePressure.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono text-slate-400 uppercase">
                        inHg
                      </span>
                      <span className="text-slate-600 font-mono">·</span>
                      <span className="text-base font-mono font-semibold text-sky-300 tabular-nums">
                        {Math.round(liveHpa)} mb
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                      {displayTrend === 'rising' && (
                        <span className="inline-flex items-center text-emerald-400">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Rising ({signedDeltaLabel})
                        </span>
                      )}
                      {displayTrend === 'falling' && (
                        <span className="inline-flex items-center text-rose-400">
                          <TrendingDown className="w-4 h-4 mr-1" />
                          Falling ({signedDeltaLabel})
                        </span>
                      )}
                      {displayTrend === 'steady' && (
                        <span className="inline-flex items-center text-slate-300">
                          <Minus className="w-4 h-4 mr-1" />
                          Steady ({signedDeltaLabel})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/90 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">Catfish Bite Diagnosis</span>
                    <span
                      className={`font-mono font-bold px-2.5 py-1 rounded-lg border ${activeZone.badgeColor}`}
                    >
                      {activeZone.rating === 'Prime'
                        ? 'Prime Bite Window'
                        : `${activeZone.rating} Bite Conditions`}
                    </span>
                  </div>
                </div>

                {/* Gold Reference Needle Controls (3h Ago Auto vs Trip Launch Pin) */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                      <Pin className="w-3.5 h-3.5 text-amber-400" />
                      Gold Reference Needle
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {launchPin
                        ? `Pinned at ${formatPinTime(launchPin.pinnedAt)}`
                        : 'Auto: 3 hours ago'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Just like turning the brass knob on a physical barometer, pin the gold hand when you launch to track pressure movement throughout your trip.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePinLaunchPressure}
                      className="flex-1 min-w-[155px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 text-xs font-semibold transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <Pin className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {launchPin ? 'Update Launch Pin' : 'Pin Launch Pressure'}
                      </span>
                    </button>

                    {launchPin && (
                      <button
                        type="button"
                        onClick={handleResetToAuto3h}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Reset to 3h Auto</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Recommended Tactic */}
                <div className="p-4 rounded-xl bg-sky-950/35 border border-sky-500/35 flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-300 block">
                      Recommended Tactic Right Now
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {activeZone.tactic}{' '}
                      <strong className="text-white">Target Zone:</strong>{' '}
                      {activeZone.fishLocation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Good Bite Times vs Bad Bite Times Comparison Matrix */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Good Bite Times vs Bad Bite Times Breakdown</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Catfish peak on pre-front drops (&ldquo;Falling: Good at first&rdquo;) before post-front lockdown
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BEST BITE TIMES */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/35 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <h4 className="font-bold text-sm uppercase tracking-wide">
                    Prime &amp; Good Bite Times
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      1. The 12-24 Hours Before a Cold Front (Dropping Barometer)
                    </strong>
                    <span>
                      Atmospheric pressure plunges ahead of squall lines or rain. Fish feel this immediately through their swim bladders and feed voraciously knowing tough conditions will follow.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">
                      2. Prolonged Steady Pressure (29.90 - 30.10 inHg for 3+ Days)
                    </strong>
                    <span>
                      Stable weather produces predictable patterns. Fish maintain regular feeding routes on current seams, channel ledges, and wing dams without abrupt environmental stress.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
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
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-500/35 space-y-3">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <h4 className="font-bold text-sm uppercase tracking-wide">
                    Tough &amp; Bad Bite Times
                  </h4>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-rose-300 block mb-0.5">
                      1. The First 24-48 Hours After a Cold Front (Rapidly Rising &gt; 30.20)
                    </strong>
                    <span>
                      Post-frontal &quot;bluebird skies&quot; with crisp north winds and extreme high pressure. Fish swim bladders expand, creating physical pressure against organs. Fish shut their mouths and lock to the bottom.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                    <strong className="text-rose-300 block mb-0.5">
                      2. Mid-Storm Violent Spikes &amp; High Wind Changes
                    </strong>
                    <span>
                      Erratic fluctuations disorient baitfish and catfish. Presentations drift too fast or blow out of strike zones.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
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
            <h4 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Fish Biology: Why Do Catfish Care About Air Pressure?</span>
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed">
              Catfish are <strong>physostomous</strong> fish—their swim bladder is connected directly to their digestive tract via a pneumatic duct. While they can vent gas quickly compared to fish like perch or walleye, rapid atmospheric pressure drops and spikes alter the hydrostatic equilibrium in their body.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="font-bold text-sky-300 block mb-1">
                  When Pressure Drops
                </span>
                <span className="text-slate-300">
                  External water pressure slightly lessens. Fish feel energized and buoyant, encouraging them to swim aggressively and chase bait in shallower zones.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                <span className="font-bold text-rose-300 block mb-1">
                  When Pressure Rises
                </span>
                <span className="text-slate-300">
                  Dense atmospheric weight presses down on the water column. The swim bladder expands against internal organs, inducing lethargy. Fish seek deep scour holes and press tight against bottom timber to equalize.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-slate-400 tabular-nums truncate">
            Live Station:{' '}
            <strong className="text-sky-300">
              {livePressure.toFixed(2)} inHg ({Math.round(weather?.pressureHpa ?? livePressure * 33.86389)} mb)
            </strong>{' '}
            · {liveTrend}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            Back to Fishing
          </button>
        </div>
      </div>
    </div>
  );
};

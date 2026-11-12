import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Gauge,
  Thermometer,
  Waves,
  Flame,
  ArrowDown,
  Anchor,
  Layers,
  Fish,
  Sparkles,
  RefreshCw,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  CatchLog,
  EnvironmentalSnapshot,
  LiveGpsState,
  SpeciesCategory,
  BottomStructure,
  CurrentCondition,
} from '../types';
import { getLiveEnvironmentalSnapshot } from '../services/weatherAndWaterService';
import { calculateSolunar } from '../utils/solunar';
import { normalizeBaitName } from '../utils/baitNormalizer';

interface TacticalGameplanProps {
  catches: CatchLog[];
  gpsState?: LiveGpsState;
  liveWeather?: EnvironmentalSnapshot | null;
  onDeploySetup?: (setup: {
    species?: SpeciesCategory;
    presentation?: string;
    baitRig?: string;
    waterDepthFeet?: number;
    bottomStructure?: BottomStructure;
    current?: CurrentCondition;
  }) => void;
  onOpenGuide?: (section?: string) => void;
}

export const TacticalGameplan: React.FC<TacticalGameplanProps> = ({
  catches,
  gpsState,
  liveWeather,
  onDeploySetup,
  onOpenGuide,
}) => {
  const [selectedTargetSpecies, setSelectedTargetSpecies] = useState<SpeciesCategory | 'All Catfish'>('Blue Catfish');
  const [liveSnapshot, setLiveSnapshot] = useState<EnvironmentalSnapshot | null>(liveWeather ?? null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<number | null>(liveWeather?.fetchedAt ?? null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Target coordinates (GPS lock or fallback to last known river waypoint)
  const currentLat = gpsState?.lat ?? 32.461;
  const currentLon = gpsState?.lon ?? -84.987;

  // Track last coordinates fetched to enforce 0.05° (~3.5 mile) geographic deadband
  const lastFetchedLocationRef = useRef<{ lat: number; lon: number } | null>(
    liveWeather ? { lat: currentLat, lon: currentLon } : null
  );

  // Synchronize with top-level liveWeather if supplied and more recent
  useEffect(() => {
    if (liveWeather) {
      setLiveSnapshot(liveWeather);
      setLastFetchedTime(liveWeather.fetchedAt ?? Date.now());
      lastFetchedLocationRef.current = { lat: currentLat, lon: currentLon };
    }
  }, [liveWeather]);

  // Fetch telemetry only on initial mount or when vessel relocates to another pool (>0.05° / ~3.5 miles)
  const refreshTelemetry = async (force: boolean = false) => {
    if (isLoadingTelemetry) return;
    setIsLoadingTelemetry(true);
    setFetchError(null);
    try {
      const snap = await getLiveEnvironmentalSnapshot(currentLat, currentLon, !navigator.onLine, force);
      setLiveSnapshot(snap);
      setLastFetchedTime(Date.now());
      lastFetchedLocationRef.current = { lat: currentLat, lon: currentLon };
    } catch {
      setFetchError('Could not refresh live river telemetry. Using cached baseline.');
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    // If we already have a snapshot, check if vessel has actually relocated beyond the deadband
    const hasMovedSignificantly =
      !lastFetchedLocationRef.current ||
      Math.abs(lastFetchedLocationRef.current.lat - currentLat) > 0.05 ||
      Math.abs(lastFetchedLocationRef.current.lon - currentLon) > 0.05;

    if (hasMovedSignificantly && !liveSnapshot) {
      refreshTelemetry(false);
    }
  }, [currentLat, currentLon]);

  // Live Solunar calculation for current coordinates
  const solunar = useMemo(() => {
    return calculateSolunar(new Date(), currentLat, currentLon);
  }, [currentLat, currentLon]);

  // Filter gamefish catches (exclude bait gathering)
  const activeCatches = useMemo(() => catches.filter(c => !c.isBait), [catches]);

  // Species-filtered catch pool
  const speciesCatches = useMemo(() => {
    if (selectedTargetSpecies === 'All Catfish') return activeCatches;
    return activeCatches.filter(c => c.species === selectedTargetSpecies);
  }, [activeCatches, selectedTargetSpecies]);

  // Current real-time factors
  const liveTemp = liveSnapshot?.usgsWaterTempF ?? 54;
  const liveTrend = liveSnapshot?.pressureTrend ?? 'steady';
  const livePressure = liveSnapshot?.pressureInHg ?? 29.95;
  const liveFlow = liveSnapshot?.usgsFlowCfs ?? 22000;
  const currentHour = new Date().getHours();

  // Match historical catches against today's conditions
  const matchedAnalysis = useMemo(() => {
    // 1. Score every catch against current conditions
    const scoredCatches = speciesCatches.map(c => {
      let score = 0;

      // Water temp affinity (within 8°F)
      const catchTemp = c.environmentalSnapshot?.usgsWaterTempF;
      if (typeof catchTemp === 'number') {
        const diff = Math.abs(catchTemp - liveTemp);
        if (diff <= 4) score += 35;
        else if (diff <= 8) score += 20;
      } else {
        score += 15; // neutral credit if offline log
      }

      // Barometric trend affinity
      const catchTrend = c.environmentalSnapshot?.pressureTrend;
      if (catchTrend === liveTrend) {
        score += 25;
      } else if (catchTrend === 'steady') {
        score += 10;
      }

      // Time of day affinity (within 3 hours)
      const catchHour = new Date(c.timestamp).getHours();
      const hourDiff = Math.abs(catchHour - currentHour);
      if (hourDiff <= 2 || hourDiff >= 22) score += 20;
      else if (hourDiff <= 4) score += 10;

      // Current condition affinity
      score += 10;

      return { catch: c, score };
    });

    // High affinity matches (score >= 45)
    const matches = scoredCatches
      .filter(item => item.score >= 40)
      .sort((a, b) => b.score - a.score)
      .map(item => item.catch);

    const matchCount = matches.length;

    // A. Determine recommended depth
    let recommendedDepth = '24 – 32 ft';
    let targetDepthNum = 28;
    if (matchCount >= 2) {
      const depths = matches.map(c => c.waterDepthFeet).sort((a, b) => a - b);
      const medianDepth = depths[Math.floor(depths.length / 2)];
      const minD = Math.max(4, medianDepth - 4);
      const maxD = medianDepth + 4;
      recommendedDepth = `${minD} – ${maxD} ft`;
      targetDepthNum = medianDepth;
    } else {
      // Baseline river rules
      if (liveTemp < 48) {
        recommendedDepth = '32 – 46 ft (Deep winter scour holes)';
        targetDepthNum = 38;
      } else if (liveTemp <= 65) {
        recommendedDepth = '20 – 32 ft (Mid-channel drop ledge)';
        targetDepthNum = 26;
      } else {
        recommendedDepth = '14 – 24 ft (Current seams & humps)';
        targetDepthNum = 18;
      }
    }

    // B. Determine recommended presentation
    let recommendedPresentation = 'Santee Cooper Rig';
    if (matchCount >= 2) {
      const presCount: Record<string, number> = {};
      matches.forEach(c => {
        const p = c.presentation || 'Santee Cooper Rig';
        presCount[p] = (presCount[p] || 0) + 1;
      });
      recommendedPresentation = Object.entries(presCount).sort((a, b) => b[1] - a[1])[0][0];
    } else {
      if (selectedTargetSpecies === 'Flathead Catfish') {
        recommendedPresentation = 'Slip Bobber / Float (Suspended over timber)';
      } else if (liveFlow > 30000) {
        recommendedPresentation = 'Bumping Bottom (Controlled river drift)';
      } else {
        recommendedPresentation = 'Santee Cooper Rig (Off-bottom float presentation)';
      }
    }

    // C. Determine recommended bait
    let recommendedBait = 'Cut Gizzard Shad';
    if (matchCount >= 2) {
      const baitCount: Record<string, number> = {};
      matches.forEach(c => {
        const b = normalizeBaitName(c.baitRig || 'Cut Gizzard Shad');
        baitCount[b] = (baitCount[b] || 0) + 1;
      });
      recommendedBait = Object.entries(baitCount).sort((a, b) => b[1] - a[1])[0][0];
    } else {
      if (selectedTargetSpecies === 'Flathead Catfish') {
        recommendedBait = 'Live Bluegill';
      } else {
        recommendedBait = liveTemp < 50 ? 'Cut Skipjack Chunk' : 'Cut Gizzard Shad';
      }
    }

    // D. Recommended structure
    let recommendedStructure: BottomStructure = 'Ledge / Channel Edge';
    if (matchCount >= 2) {
      const structCount: Record<string, number> = {};
      matches.forEach(c => {
        const s = c.bottomStructure || 'Ledge / Channel Edge';
        structCount[s] = (structCount[s] || 0) + 1;
      });
      recommendedStructure = Object.entries(structCount).sort((a, b) => b[1] - a[1])[0][0] as BottomStructure;
    } else {
      recommendedStructure = selectedTargetSpecies === 'Flathead Catfish' ? 'Logjam / Timber' : 'Ledge / Channel Edge';
    }

    // E. Recommended current condition
    let recommendedCurrent: CurrentCondition = 'Eddy / Seam';
    if (matchCount >= 2) {
      const curCount: Record<string, number> = {};
      matches.forEach(c => {
        const cur = c.current || 'Eddy / Seam';
        curCount[cur] = (curCount[cur] || 0) + 1;
      });
      recommendedCurrent = Object.entries(curCount).sort((a, b) => b[1] - a[1])[0][0] as CurrentCondition;
    }

    // Tactical notes based on telemetry
    let tacticalStrategy = '';
    if (liveTrend === 'falling') {
      tacticalStrategy = '⚡ Pre-front barometric drop detected: Fish are actively roaming to feed before the front passes. Run aggressive drifts or anchor on primary current seams.';
    } else if (liveTrend === 'rising') {
      tacticalStrategy = '☀️ Post-front high pressure active: Fish are tight to bottom wood or deep scour holes. Downsize bait chunks and place rigs directly against structure.';
    } else {
      tacticalStrategy = '⚓ Stable barometric pressure: Fish are holding on steady channel drop-offs. Maintain standard Santee Cooper drifts or anchored bottom spreads along the ledge.';
    }

    return {
      matchCount,
      confidence: matchCount >= 5 ? 'High' : matchCount >= 2 ? 'Moderate' : 'Tactical Baseline',
      recommendedDepth,
      targetDepthNum,
      recommendedPresentation,
      recommendedBait,
      recommendedStructure,
      recommendedCurrent,
      tacticalStrategy,
    };
  }, [speciesCatches, liveTemp, liveTrend, liveFlow, currentHour, selectedTargetSpecies]);

  return (
    <div className="space-y-5 font-sans text-slate-100">
      
      {/* Real-time Telemetry Dashboard Strip */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live River Telemetry:
            </span>
            <span className="text-xs text-amber-400 truncate max-w-[200px] sm:max-w-none">
              {liveSnapshot?.usgsSiteName || `River Gauge (${currentLat.toFixed(3)}°, ${currentLon.toFixed(3)}°)`}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {lastFetchedTime && !isLoadingTelemetry && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                {Math.round((Date.now() - lastFetchedTime) / 60000) <= 0
                  ? 'Updated just now'
                  : `Updated ${Math.round((Date.now() - lastFetchedTime) / 60000)}m ago`}
              </span>
            )}
            <button
              type="button"
              onClick={() => refreshTelemetry(true)}
              disabled={isLoadingTelemetry}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              title="Force refresh river gauges from USGS NWIS & Open-Meteo"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTelemetry ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoadingTelemetry ? 'Reading Gauges...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Barometer */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Gauge className="w-3 h-3 text-orange-400" />
              <span>Barometer</span>
            </div>
            <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>{livePressure} inHg</span>
              {liveTrend === 'falling' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
              {liveTrend === 'rising' && <TrendingUp className="w-3.5 h-3.5 text-blue-400" />}
              {liveTrend === 'steady' && <Minus className="w-3.5 h-3.5 text-amber-400" />}
            </div>
            <div className="text-[10px] font-semibold text-orange-400 capitalize">
              {liveTrend} Trend
            </div>
          </div>

          {/* USGS Water Temp */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-emerald-400" />
              <span>Water Temp</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {liveSnapshot?.usgsWaterTempF ? `${liveSnapshot.usgsWaterTempF}°F` : `${liveTemp}°F (est)`}
            </div>
            <div className="text-[10px] font-semibold text-emerald-400">
              {liveTemp < 48 ? 'Winter Lethargy' : liveTemp <= 65 ? 'Pre-Spawn Active' : 'Summer Feed'}
            </div>
          </div>

          {/* USGS River Flow (CFS) */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Waves className="w-3 h-3 text-cyan-400" />
              <span>River Flow</span>
            </div>
            <div className="text-sm font-extrabold text-white">
              {liveSnapshot?.usgsFlowCfs ? `${liveSnapshot.usgsFlowCfs.toLocaleString()} CFS` : `${liveFlow.toLocaleString()} CFS`}
            </div>
            <div className="text-[10px] font-semibold text-cyan-400">
              {liveFlow > 35000 ? 'Heavy Swift Water' : liveFlow > 18000 ? 'Moderate Velocity' : 'Low / Stable'}
            </div>
          </div>

          {/* Solunar Window */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Solunar Window</span>
            </div>
            <div className="text-sm font-extrabold text-white truncate">
              {solunar.currentRating} Feed
            </div>
            <div className="text-[10px] font-semibold text-amber-400 truncate">
              {solunar.moonPhaseName}
            </div>
          </div>
        </div>
      </div>

      {/* Target Species Selector */}
      <div className="flex items-center gap-2 font-mono text-xs overflow-x-auto pb-1">
        <span className="text-slate-400 font-bold shrink-0">Target Gamefish:</span>
        {(['Blue Catfish', 'Flathead Catfish', 'Channel Catfish', 'All Catfish'] as const).map(sp => {
          const isSelected = selectedTargetSpecies === sp;
          return (
            <button
              key={sp}
              onClick={() => setSelectedTargetSpecies(sp)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {sp}
            </button>
          );
        })}
      </div>

      {/* THE TACTICAL GAMEPLAN HERO CARD */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 shadow-2xl space-y-5 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Personalized Tactical Match</span>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md text-[10px] border border-amber-500/30">
                Confidence: {matchedAnalysis.confidence}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Recommended River Gameplan for Today
            </h2>
          </div>

          <div className="text-xs text-slate-400 text-left sm:text-right flex flex-col items-start sm:items-end gap-1">
            <div>
              Based on <span className="text-amber-400 font-bold">{matchedAnalysis.matchCount} similar logs</span> ({selectedTargetSpecies})
            </div>
            {onOpenGuide && (
              <button
                type="button"
                id="btn-how-gameplan-works"
                onClick={() => onOpenGuide('step-07-gameplan')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold transition active:scale-95 cursor-pointer shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>How This Is Computed</span>
              </button>
            )}
          </div>
        </div>

        {/* Tactical Recommendation 4-Box Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          
          {/* 1. Presentation Rig */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="uppercase font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Primary Presentation Rig
              </span>
              <span className="text-sky-400 font-bold">Top Match</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {matchedAnalysis.recommendedPresentation}
            </div>
            <div className="text-[11px] text-slate-400">
              Optimal setup for current river stage & velocity
            </div>
          </div>

          {/* 2. Top Producing Bait */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="uppercase font-bold flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-orange-400" />
                Recommended Bait Choice
              </span>
              <span className="text-orange-400 font-bold">High Scent</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {matchedAnalysis.recommendedBait}
            </div>
            <div className="text-[11px] text-slate-400">
              Matches water temperature & seasonal feeding mood
            </div>
          </div>

          {/* 3. Strike Depth Band */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="uppercase font-bold flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                Target Water Depth
              </span>
              <span className="text-blue-400 font-bold">Drop Zone</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {matchedAnalysis.recommendedDepth}
            </div>
            <div className="text-[11px] text-slate-400">
              Historical strike zone in {liveTemp}°F water
            </div>
          </div>

          {/* 4. Target Structure & Current Seam */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="uppercase font-bold flex items-center gap-1.5">
                <Fish className="w-3.5 h-3.5 text-emerald-400" />
                Habitat & Current Target
              </span>
              <span className="text-emerald-400 font-bold">Ambush Zone</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {matchedAnalysis.recommendedStructure}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold">
              Focus along {matchedAnalysis.recommendedCurrent}
            </div>
          </div>

        </div>

        {/* Real-time Tactical Strategy Callout */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs leading-relaxed text-amber-200">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
            <Compass className="w-4 h-4" />
            <span>Today's Tactical Execution Strategy:</span>
          </div>
          <p>{matchedAnalysis.tacticalStrategy}</p>
        </div>

        {/* Action Button: Pre-fill Log Modal with this setup */}
        {onDeploySetup && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                onDeploySetup({
                  species: selectedTargetSpecies === 'All Catfish' ? 'Blue Catfish' : selectedTargetSpecies,
                  presentation: matchedAnalysis.recommendedPresentation,
                  baitRig: matchedAnalysis.recommendedBait,
                  waterDepthFeet: matchedAnalysis.targetDepthNum,
                  bottomStructure: matchedAnalysis.recommendedStructure,
                  current: matchedAnalysis.recommendedCurrent,
                });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95"
            >
              <span>🎣 Pre-fill Catch Log with this Setup</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

      {/* Hourly Bite Windows & Solunar Transits for Today */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Today's Feeding Window Schedule
          </span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-[#84CC16] font-medium">
              Rise: <strong className="font-mono text-white">{liveSnapshot?.sunriseTime || solunar.sunriseTime || '06:30 AM'}</strong>
            </span>
            <span className="text-[#F97316] font-medium">
              Set: <strong className="font-mono text-white">{liveSnapshot?.sunsetTime || solunar.sunsetTime || '05:15 PM'}</strong>
            </span>
            <span className="text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {solunar.dayRating} Solunar Rating
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Major periods */}
          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span>Major Feed Periods (Moon Transit)</span>
              <Flame className="w-3.5 h-3.5" />
            </div>
            {solunar.majorPeriods.length === 0 ? (
              <div className="text-slate-500 text-[11px]">No major transits during daylight hours</div>
            ) : (
              solunar.majorPeriods.map((p, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg flex items-center justify-between ${
                    p.isActiveNow
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {p.isActiveNow && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                    <span>{p.start} – {p.end}</span>
                  </div>
                  <span className="text-[10px] text-amber-400">{p.isActiveNow ? 'ACTIVE NOW' : p.description}</span>
                </div>
              ))
            )}
          </div>

          {/* Minor periods */}
          <div className="p-3 rounded-xl bg-slate-950 border border-yellow-500/30 space-y-2">
            <div className="flex items-center justify-between text-yellow-400 font-bold">
              <span>Minor Feed Periods (Moon Rise/Set)</span>
              <Flame className="w-3.5 h-3.5" />
            </div>
            {solunar.minorPeriods.length === 0 ? (
              <div className="text-slate-500 text-[11px]">No minor periods calculated</div>
            ) : (
              solunar.minorPeriods.map((p, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg flex items-center justify-between ${
                    p.isActiveNow
                      ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-300 font-bold'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {p.isActiveNow && <span className="h-2 w-2 rounded-full bg-yellow-400 animate-ping" />}
                    <span>{p.start} – {p.end}</span>
                  </div>
                  <span className="text-[10px] text-yellow-400">{p.isActiveNow ? 'ACTIVE NOW' : p.description}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Gauge,
  ArrowDown,
  Fish,
  Anchor,
  Flame,
  Award,
  Filter,
  Check,
  ChevronRight,
  Info,
  Clock,
  Thermometer,
  Waves,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Compass,
  BookOpen,
} from 'lucide-react';
import {
  CatchLog,
  SpeciesCategory,
  LiveGpsState,
  BottomStructure,
  CurrentCondition,
  EnvironmentalSnapshot,
} from '../types';
import { normalizeBaitName } from '../utils/baitNormalizer';
import { calculateSunTimes } from '../utils/solunar';
import { TacticalGameplan } from './TacticalGameplan';
import { AboutModal } from './AboutModal';

interface PatternInsightsProps {
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

interface SpeciesProfile {
  name: string;
  badgeColor: string;
  activeColor: string;
  tacticalNote: string;
}

const SPECIES_CONFIG: Record<string, SpeciesProfile> = {
  all: {
    name: 'All Species',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    activeColor: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500 text-amber-300',
    tacticalNote: 'Aggregated tactical patterns across all species, rigs, and river environments.',
  },
  'Blue Catfish': {
    name: 'Blue Catfish',
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    activeColor: 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border-sky-500 text-sky-300',
    tacticalNote: 'River current roamers: Target channel ledges, deep scour holes, and drifting current seams with cut bait.',
  },
  'Flathead Catfish': {
    name: 'Flathead Catfish',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    activeColor: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500 text-amber-300',
    tacticalNote: 'Apex ambush predators: Target heavy timber, rootwads, and slack-water eddy seams with lively bait.',
  },
  'Channel Catfish': {
    name: 'Channel Catfish',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    activeColor: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-500 text-emerald-300',
    tacticalNote: 'Versatile scavengers: Productive on gravel humps, mud flats, and drop-offs in gentle/moderate flow.',
  },
  Bullhead: {
    name: 'Bullhead',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    activeColor: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500 text-orange-300',
    tacticalNote: 'Shallow backwaters, slack sloughs, and muddy flats with scent-heavy baits.',
  },
};

type Daypart = 'Dawn' | 'Morning' | 'Afternoon' | 'Dusk' | 'Night';

function getDaypart(timestamp: number): Daypart {
  const hour = new Date(timestamp).getHours();
  if (hour >= 5 && hour < 9) return 'Dawn';
  if (hour >= 9 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Dusk';
  return 'Night';
}

export const PatternInsights: React.FC<PatternInsightsProps> = ({
  catches,
  gpsState,
  liveWeather,
  onDeploySetup,
  onOpenGuide,
}) => {
  const [mainView, setMainView] = useState<'gameplan' | 'analytics'>('gameplan');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [trophyOnly, setTrophyOnly] = useState<boolean>(false);
  const [trophyThreshold, setTrophyThreshold] = useState<number>(20); // 20 lbs default trophy line
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideSection, setGuideSection] = useState<string>('step-06-tactical');

  const handleOpenGuide = (section: string = 'step-06-tactical') => {
    if (onOpenGuide) {
      onOpenGuide(section);
    } else {
      setGuideSection(section);
      setIsGuideModalOpen(true);
    }
  };

  // Exclude bait gathering entries so analytics focus strictly on gamefish catches
  const activeCatches = useMemo(() => catches.filter(c => !c.isBait), [catches]);

  // Determine species counts across non-bait catches
  const speciesCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeCatches.length,
      'Blue Catfish': 0,
      'Flathead Catfish': 0,
      'Channel Catfish': 0,
    };

    activeCatches.forEach(c => {
      counts[c.species] = (counts[c.species] || 0) + 1;
    });

    return counts;
  }, [activeCatches]);

  // Available tabs: always show Big 3 + All, plus any other species with logs
  const availableSpeciesTabs = useMemo(() => {
    const defaultKeys = ['all', 'Blue Catfish', 'Flathead Catfish', 'Channel Catfish'];
    const otherKeys = Object.keys(speciesCounts).filter(
      k => !defaultKeys.includes(k) && speciesCounts[k] > 0
    );
    return [...defaultKeys, ...otherKeys];
  }, [speciesCounts]);

  // Trophy count in the active catches
  const totalTrophiesCount = useMemo(() => {
    return activeCatches.filter(c => (c.weightLbs ?? 0) >= trophyThreshold).length;
  }, [activeCatches, trophyThreshold]);

  // Primary filtering: species + trophy toggle
  const filteredCatches = useMemo(() => {
    let result = activeCatches;
    if (selectedSpecies !== 'all') {
      result = result.filter(c => c.species === selectedSpecies);
    }
    if (trophyOnly) {
      result = result.filter(c => (c.weightLbs ?? 0) >= trophyThreshold);
    }
    return result;
  }, [activeCatches, selectedSpecies, trophyOnly, trophyThreshold]);

  const totalFiltered = filteredCatches.length;

  // Global empty state
  if (activeCatches.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl font-mono text-slate-400">
        <BarChart3 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
        <h2 className="text-base font-bold text-slate-200">No catch patterns available yet.</h2>
        <p className="text-xs text-slate-500 mt-1">
          Record a few catches and the app will generate tactical pattern intelligence automatically.
        </p>
      </div>
    );
  }

  // 1. Bait Frequency and Efficiency
  const baitCounts: { [key: string]: { count: number; totalWeight: number; weightedCount: number } } = {};
  filteredCatches.forEach(c => {
    const bait = normalizeBaitName(c.baitRig || 'Other');
    if (!baitCounts[bait]) {
      baitCounts[bait] = { count: 0, totalWeight: 0, weightedCount: 0 };
    }
    baitCounts[bait].count += 1;
    if (c.weightLbs) {
      baitCounts[bait].totalWeight += c.weightLbs;
      baitCounts[bait].weightedCount += 1;
    }
  });

  const sortedBaits = Object.entries(baitCounts)
    .map(([bait, stats]) => ({
      bait,
      count: stats.count,
      avgWeight: stats.weightedCount > 0 ? Math.round((stats.totalWeight / stats.weightedCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);

  const topBait = sortedBaits[0];

  // 2. Presentations & Rigs (#2)
  const presentationCounts: { [key: string]: { count: number; totalWeight: number; weightedCount: number } } = {};
  filteredCatches.forEach(c => {
    const pres = c.presentation || 'Standard Bottom Rig';
    if (!presentationCounts[pres]) {
      presentationCounts[pres] = { count: 0, totalWeight: 0, weightedCount: 0 };
    }
    presentationCounts[pres].count += 1;
    if (c.weightLbs) {
      presentationCounts[pres].totalWeight += c.weightLbs;
      presentationCounts[pres].weightedCount += 1;
    }
  });

  const sortedPresentations = Object.entries(presentationCounts)
    .map(([presentation, stats]) => ({
      presentation,
      count: stats.count,
      avgWeight: stats.weightedCount > 0 ? Math.round((stats.totalWeight / stats.weightedCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count);

  const topPresentation = sortedPresentations[0];

  // 3. Top Bait + Rig Combos (#2)
  const comboCounts: { [key: string]: { presentation: string; bait: string; count: number; totalWeight: number; weightedCount: number } } = {};
  filteredCatches.forEach(c => {
    const pres = c.presentation || 'Bottom Rig';
    const bait = normalizeBaitName(c.baitRig || 'Other');
    const key = `${pres} + ${bait}`;
    if (!comboCounts[key]) {
      comboCounts[key] = { presentation: pres, bait, count: 0, totalWeight: 0, weightedCount: 0 };
    }
    comboCounts[key].count += 1;
    if (c.weightLbs) {
      comboCounts[key].totalWeight += c.weightLbs;
      comboCounts[key].weightedCount += 1;
    }
  });

  const sortedCombos = Object.values(comboCounts)
    .map(combo => ({
      ...combo,
      avgWeight: combo.weightedCount > 0 ? Math.round((combo.totalWeight / combo.weightedCount) * 10) / 10 : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 4. Barometric Pressure Ranges (#4)
  const pressureBands = {
    '< 29.85 inHg (Low)': 0,
    '29.85 - 29.99 inHg (Falling/Active)': 0,
    '30.00 - 30.15 inHg (High/Stable)': 0,
    '> 30.15 inHg (Post-Front High)': 0,
  };

  filteredCatches.forEach(c => {
    const p = c.environmentalSnapshot?.pressureInHg ?? 29.95;
    if (p < 29.85) pressureBands['< 29.85 inHg (Low)'] += 1;
    else if (p <= 29.99) pressureBands['29.85 - 29.99 inHg (Falling/Active)'] += 1;
    else if (p <= 30.15) pressureBands['30.00 - 30.15 inHg (High/Stable)'] += 1;
    else pressureBands['> 30.15 inHg (Post-Front High)'] += 1;
  });

  // 5. Pressure Trends: Falling front vs. Rising vs. Steady (#4)
  const pressureTrends = {
    falling: 0,
    steady: 0,
    rising: 0,
  };

  filteredCatches.forEach(c => {
    const trend = c.environmentalSnapshot?.pressureTrend || 'steady';
    if (trend === 'falling') pressureTrends.falling += 1;
    else if (trend === 'rising') pressureTrends.rising += 1;
    else pressureTrends.steady += 1;
  });

  // 6. Water Temperature Bands (USGS) (#3)
  const waterTempBands = {
    '< 45°F (Winter Lethargy)': 0,
    '45 - 54°F (Spring Awakening)': 0,
    '55 - 68°F (Pre-Spawn Prime Feed)': 0,
    '69°F+ (Summer Pattern)': 0,
  };

  let catchesWithWaterTemp = 0;
  filteredCatches.forEach(c => {
    const wt = c.environmentalSnapshot?.usgsWaterTempF;
    if (typeof wt === 'number' && !isNaN(wt)) {
      catchesWithWaterTemp += 1;
      if (wt < 45) waterTempBands['< 45°F (Winter Lethargy)'] += 1;
      else if (wt <= 54) waterTempBands['45 - 54°F (Spring Awakening)'] += 1;
      else if (wt <= 68) waterTempBands['55 - 68°F (Pre-Spawn Prime Feed)'] += 1;
      else waterTempBands['69°F+ (Summer Pattern)'] += 1;
    }
  });

  // 7. River Current Dynamics (#5)
  const currentBands: Record<string, number> = {
    'Eddy / Seam': 0,
    'Moderate': 0,
    'Heavy / Boiled': 0,
    'Gentle': 0,
    'Slack': 0,
  };

  filteredCatches.forEach(c => {
    const cur = c.current || 'Moderate';
    currentBands[cur] = (currentBands[cur] || 0) + 1;
  });

  // 8. River Flow Velocity (CFS) Bands (#3)
  const flowBands = {
    '< 15,000 CFS (Low / Stable)': 0,
    '15,000 - 30,000 CFS (Moderate Current)': 0,
    '30,001 - 50,000 CFS (Heavy Swift Flow)': 0,
    '> 50,000 CFS (High Discharge / Flood)': 0,
  };

  let catchesWithFlow = 0;
  filteredCatches.forEach(c => {
    const flow = c.environmentalSnapshot?.usgsFlowCfs;
    if (typeof flow === 'number' && !isNaN(flow)) {
      catchesWithFlow += 1;
      if (flow < 15000) flowBands['< 15,000 CFS (Low / Stable)'] += 1;
      else if (flow <= 30000) flowBands['15,000 - 30,000 CFS (Moderate Current)'] += 1;
      else if (flow <= 50000) flowBands['30,001 - 50,000 CFS (Heavy Swift Flow)'] += 1;
      else flowBands['> 50,000 CFS (High Discharge / Flood)'] += 1;
    }
  });

  // 9. Water Depth Distribution
  const depthBands = {
    '1 - 15 ft (Shallow/Flats)': 0,
    '16 - 30 ft (Mid-Ledge)': 0,
    '31 - 45 ft (Main Channel)': 0,
    '46+ ft (Deep Scour Holes)': 0,
  };

  filteredCatches.forEach(c => {
    const d = c.waterDepthFeet;
    if (d <= 15) depthBands['1 - 15 ft (Shallow/Flats)'] += 1;
    else if (d <= 30) depthBands['16 - 30 ft (Mid-Ledge)'] += 1;
    else if (d <= 45) depthBands['31 - 45 ft (Main Channel)'] += 1;
    else depthBands['46+ ft (Deep Scour Holes)'] += 1;
  });

  // 10. 24-Hour Feeding Daypart Clock (#6)
  const daypartCounts: Record<Daypart, number> = {
    Dawn: 0,
    Morning: 0,
    Afternoon: 0,
    Dusk: 0,
    Night: 0,
  };

  filteredCatches.forEach(c => {
    const dp = getDaypart(c.timestamp);
    daypartCounts[dp] += 1;
  });

  const sortedDayparts = (Object.entries(daypartCounts) as [Daypart, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  const peakDaypart = sortedDayparts[0];

  // 11. Astronomical Sun times & Solunar Window Success
  const sunTimes = useMemo(() => {
    return calculateSunTimes(new Date(), gpsState?.lat ?? 32.461, gpsState?.lon ?? -84.987);
  }, [gpsState?.lat, gpsState?.lon]);

  const solunarStats = {
    Major: filteredCatches.filter(c => c.environmentalSnapshot?.solunarRating === 'Major').length,
    Minor: filteredCatches.filter(c => c.environmentalSnapshot?.solunarRating === 'Minor').length,
    Inactive: filteredCatches.filter(
      c => !c.environmentalSnapshot?.solunarRating || c.environmentalSnapshot?.solunarRating === 'Inactive'
    ).length,
  };

  // 12. Trophy Record for this slice
  const heaviestFish = [...filteredCatches]
    .filter(c => c.weightLbs)
    .sort((a, b) => (b.weightLbs ?? 0) - (a.weightLbs ?? 0))[0];

  const currentProfile = SPECIES_CONFIG[selectedSpecies] || {
    name: selectedSpecies,
    badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    activeColor: 'bg-slate-800 border-slate-500 text-slate-100',
    tacticalNote: 'Species-specific environmental and tactical strike patterns.',
  };

  return (
    <div id="pattern-insights-view" className="max-w-6xl mx-auto p-3 sm:p-6 space-y-6 text-slate-100 font-sans">
      
      {/* Top Primary Navigation: Gameplan vs. Analytics */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl font-mono text-xs">
        <button
          onClick={() => setMainView('gameplan')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold transition-all ${
            mainView === 'gameplan'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500 text-amber-300 shadow-md scale-[1.01]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-400" />
          <span>🎯 Today's Tactical Gameplan</span>
        </button>
        <button
          onClick={() => setMainView('analytics')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold transition-all ${
            mainView === 'analytics'
              ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 border border-sky-500 text-sky-300 shadow-md scale-[1.01]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span>📊 Historical Pattern Suite</span>
        </button>
      </div>

      {mainView === 'gameplan' ? (
        <TacticalGameplan
          catches={catches}
          gpsState={gpsState}
          liveWeather={liveWeather}
          onDeploySetup={onDeploySetup}
          onOpenGuide={handleOpenGuide}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                <BarChart3 className="w-4 h-4" />
                <span>Tactical Pattern Analytics Suite</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-mono">
                Seasonal, Hydrological & Rigging Intelligence
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Computed from{' '}
                <span className="text-amber-400 font-bold">
                  {totalFiltered} {selectedSpecies === 'all' ? 'active catches' : `${selectedSpecies} catches`}
                </span>{' '}
                {trophyOnly ? `(Trophy Filter ≥ ${trophyThreshold} lbs active)` : `(${activeCatches.length} total logged catches)`}
                {' '}with USGS river hydrology & moment-of-catch weather.
              </p>
            </div>

            <button
              type="button"
              id="btn-open-tactical-guide-pattern"
              onClick={() => handleOpenGuide('step-06-tactical')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-mono font-bold transition active:scale-95 cursor-pointer shadow shrink-0 self-start sm:self-auto"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Tactical Field Manual</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>

      {/* Control Strip: Species Filter + Trophy Mode Toggle */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3">
        {/* Top bar: label and trophy toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Target Species Filter:</span>
          </div>

          {/* Trophy Giants Toggle (#7) */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800">
              <button
                onClick={() => setTrophyOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  !trophyOnly
                    ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                All Sizes ({selectedSpecies === 'all' ? activeCatches.length : speciesCounts[selectedSpecies] || 0})
              </button>
              <button
                onClick={() => setTrophyOnly(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  trophyOnly
                    ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border border-yellow-500/60 shadow-md'
                    : 'text-slate-400 hover:text-yellow-400'
                }`}
              >
                <Award className={`w-3.5 h-3.5 ${trophyOnly ? 'text-yellow-400' : 'text-slate-500'}`} />
                <span>Trophy (≥ {trophyThreshold}#)</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-yellow-500/20 text-yellow-300 font-bold ml-0.5">
                  {totalTrophiesCount}
                </span>
              </button>
            </div>

            {/* Threshold fine-tuning if trophy active */}
            {trophyOnly && (
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-yellow-500/30 text-[10px] font-mono">
                {[15, 20, 30].map(val => (
                  <button
                    key={val}
                    onClick={() => setTrophyThreshold(val)}
                    className={`px-2 py-1 rounded-md font-bold transition-all ${
                      trophyThreshold === val
                        ? 'bg-yellow-500 text-slate-950 font-extrabold'
                        : 'text-slate-400 hover:text-yellow-300'
                    }`}
                  >
                    ≥{val}#
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Species Chip Buttons */}
        <div className="flex flex-wrap gap-2">
          {availableSpeciesTabs.map(speciesKey => {
            const isSelected = selectedSpecies === speciesKey;
            const count = speciesCounts[speciesKey] || 0;
            const profile = SPECIES_CONFIG[speciesKey] || {
              name: speciesKey,
              badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
              activeColor: 'bg-slate-800 border-slate-500 text-slate-100',
              tacticalNote: '',
            };

            return (
              <button
                key={speciesKey}
                onClick={() => setSelectedSpecies(speciesKey)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                  isSelected
                    ? `${profile.activeColor} shadow-md ring-1 ring-amber-400/30 scale-[1.02]`
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <Fish className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{profile.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                    isSelected
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                  }`}
                >
                  {count}
                </span>
                {isSelected && <Check className="w-3 h-3 text-amber-400 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Tactical Species Hint Bar */}
        {currentProfile.tacticalNote && (
          <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs font-mono text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-bold text-amber-400">{currentProfile.name} Habitat Note:</span>{' '}
              {currentProfile.tacticalNote}
            </p>
          </div>
        )}
      </div>

      {/* Empty State for current slice */}
      {totalFiltered === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl font-mono text-slate-400 space-y-3">
          <Fish className="w-12 h-12 mx-auto text-slate-600 mb-1" />
          <h2 className="text-base font-bold text-slate-200">
            No catches match this filter combination.
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {trophyOnly
              ? `No ${selectedSpecies === 'all' ? 'fish' : selectedSpecies} recorded at or above ${trophyThreshold} lbs yet.`
              : `No ${selectedSpecies} logged yet.`}
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {trophyOnly && (
              <button
                onClick={() => setTrophyOnly(false)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Disable Trophy Filter
              </button>
            )}
            <button
              onClick={() => {
                setSelectedSpecies('all');
                setTrophyOnly(false);
              }}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <span>Reset to All Species ({activeCatches.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top 4 Key Tactical Metric Highlights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
            {/* 1. Top Bait */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="uppercase font-bold">#1 Top Bait</span>
                <Anchor className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-base font-extrabold text-white truncate">
                {topBait?.bait ?? 'N/A'}
              </div>
              <div className="text-xs text-orange-400 font-semibold mt-1">
                {topBait?.count ?? 0} Strikes {topBait?.avgWeight ? `• Avg ${topBait.avgWeight}#` : ''}
              </div>
            </div>

            {/* 2. Top Presentation Rig (#2) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="uppercase font-bold">#1 Producing Rig</span>
                <Layers className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-base font-extrabold text-white truncate">
                {topPresentation?.presentation ?? 'N/A'}
              </div>
              <div className="text-xs text-sky-400 font-semibold mt-1">
                {topPresentation?.count ?? 0} Strikes {topPresentation?.avgWeight ? `• Avg ${topPresentation.avgWeight}#` : ''}
              </div>
            </div>

            {/* 3. Peak Feeding Window (#6) */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="uppercase font-bold">Peak Daypart</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-base font-extrabold text-white truncate">
                {peakDaypart ? `${peakDaypart[0]} Window` : 'N/A'}
              </div>
              <div className="text-xs text-amber-400 font-semibold mt-1">
                {peakDaypart ? `${peakDaypart[1]} strikes (${Math.round((peakDaypart[1] / totalFiltered) * 100)}%)` : ''}
              </div>
            </div>

            {/* 4. Trophy Record */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="uppercase font-bold">Record in Filter</span>
                <Award className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-base font-extrabold text-white truncate">
                {heaviestFish ? `${heaviestFish.weightLbs} lbs ${heaviestFish.species}` : 'N/A'}
              </div>
              <div className="text-xs text-slate-400 mt-1 truncate">
                {heaviestFish ? `${heaviestFish.waterDepthFeet}ft • ${normalizeBaitName(heaviestFish.baitRig)}` : 'Log more fish'}
              </div>
            </div>
          </div>

          {/* Section 1: Rigging, Presentations & Deadly Combos (#2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Rig Presentation Ranking */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Presentation Rig Performance Ranking
                </span>
                <span className="text-slate-500 text-[10px]">Strikes & Avg Weight</span>
              </div>

              <div className="space-y-2.5">
                {sortedPresentations.map((item, idx) => {
                  const pct = Math.round((item.count / totalFiltered) * 100);
                  return (
                    <div key={item.presentation} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-200 truncate pr-2">
                          {idx + 1}. {item.presentation}
                        </span>
                        <span className="text-sky-400 font-bold shrink-0">
                          {item.count} ({pct}%) {item.avgWeight ? `• avg ${item.avgWeight}#` : ''}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-sky-600 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Deadly Bait + Rig Combos */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Deadliest Bait & Rig Synergies
                </span>
                <span className="text-slate-500 text-[10px]">Cross-Matched</span>
              </div>

              <div className="space-y-2">
                {sortedCombos.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">No combos logged yet</div>
                ) : (
                  sortedCombos.map((combo, idx) => {
                    const pct = Math.round((combo.count / totalFiltered) * 100);
                    return (
                      <div
                        key={`${combo.presentation}-${combo.bait}`}
                        className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-400 text-[10px]">#{idx + 1}</span>
                            <span className="font-bold text-slate-200 truncate">{combo.presentation}</span>
                          </div>
                          <div className="text-[11px] text-orange-300 font-semibold truncate mt-0.5">
                            🎣 with {combo.bait}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-amber-400 font-bold">{combo.count} catches</div>
                          <div className="text-[10px] text-slate-400">
                            {pct}% {combo.avgWeight ? `• ${combo.avgWeight}# avg` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Bait Performance Ranking */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                <Anchor className="w-4 h-4 text-orange-400" />
                Normalized Bait Ranking & Scent Profiles
              </span>
              <span className="text-slate-500 text-[10px]">
                {sortedBaits.length} distinct baits logged
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {sortedBaits.map((item, idx) => {
                const pct = Math.round((item.count / totalFiltered) * 100);
                return (
                  <div key={item.bait} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-200 truncate pr-2">
                        {idx + 1}. {item.bait}
                      </span>
                      <span className="text-orange-400 font-bold shrink-0">
                        {item.count} ({pct}%) {item.avgWeight ? `• avg ${item.avgWeight}#` : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Atmospheric Fronts & Barometric Dynamics (#4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Front Passage Pressure Trend (#4) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-orange-400" />
                  Barometric Pressure Trends (Front Dynamics)
                </span>
                <span className="text-slate-500 text-[10px]">Bite Windows</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* Falling front */}
                <div className="p-3 rounded-xl bg-slate-950 border border-red-500/30 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 text-red-400 font-bold text-[11px]">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Falling</span>
                  </div>
                  <div className="text-lg font-extrabold text-white">
                    {pressureTrends.falling}
                  </div>
                  <div className="text-[10px] text-red-400 font-semibold">
                    {totalFiltered > 0 ? Math.round((pressureTrends.falling / totalFiltered) * 100) : 0}% pre-front
                  </div>
                </div>

                {/* Steady pressure */}
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-[11px]">
                    <Minus className="w-3.5 h-3.5" />
                    <span>Steady</span>
                  </div>
                  <div className="text-lg font-extrabold text-white">
                    {pressureTrends.steady}
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold">
                    {totalFiltered > 0 ? Math.round((pressureTrends.steady / totalFiltered) * 100) : 0}% stable
                  </div>
                </div>

                {/* Rising post-front */}
                <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1 text-blue-400 font-bold text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Rising</span>
                  </div>
                  <div className="text-lg font-extrabold text-white">
                    {pressureTrends.rising}
                  </div>
                  <div className="text-[10px] text-blue-400 font-semibold">
                    {totalFiltered > 0 ? Math.round((pressureTrends.rising / totalFiltered) * 100) : 0}% post-front
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                ⚡ <strong>Tactical Rule:</strong> Catfish feed heavily on a <em>falling barometer</em> right before front arrival. Once the front passes and pressure surges high (bluebird skies), fish generally tuck tighter into wood or drop to the deepest ledges.
              </div>
            </div>

            {/* Raw InHg Ranges */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Productive Barometric inHg Ranges
                </span>
                <span className="text-slate-500 text-[10px]">Absolute Pressure</span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(pressureBands).map(([band, count]) => {
                  const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                  return (
                    <div key={band} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{band}</span>
                        <span className="text-amber-400 font-bold">{count} strikes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: River Hydrology (USGS Water Temp & River Flow CFS) (#3 & #5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* USGS Water Temp Brackets (#3) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-emerald-400" />
                  USGS River Water Temperature Bands
                </span>
                <span className="text-slate-500 text-[10px]">
                  {catchesWithWaterTemp} logs with gauge temp
                </span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(waterTempBands).map(([band, count]) => {
                  const pct = catchesWithWaterTemp > 0 ? Math.round((count / catchesWithWaterTemp) * 100) : 0;
                  return (
                    <div key={band} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{band}</span>
                        <span className="text-emerald-400 font-bold">{count} strikes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* River Flow CFS Bands (#3) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-cyan-400" />
                  USGS River Discharge & Flow (CFS)
                </span>
                <span className="text-slate-500 text-[10px]">
                  {catchesWithFlow} logs with flow CFS
                </span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(flowBands).map(([band, count]) => {
                  const pct = catchesWithFlow > 0 ? Math.round((count / catchesWithFlow) * 100) : 0;
                  return (
                    <div key={band} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{band}</span>
                        <span className="text-cyan-400 font-bold">{count} strikes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: River Current Dynamics & Habitat Structure (#5) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* River Current Condition (#5) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Waves className="w-4 h-4 text-teal-400" />
                  Strike Velocity: River Current Condition
                </span>
                <span className="text-slate-500 text-[10px]">Seams vs. Main Flow</span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(currentBands).map(([cond, count]) => {
                  const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                  return (
                    <div key={cond} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{cond}</span>
                        <span className="text-teal-400 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-teal-600 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Structure Hotspots */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Fish className="w-4 h-4 text-emerald-400" />
                  River Habitat & Bottom Structure
                </span>
                <span className="text-slate-500 text-[10px]">Holding Areas</span>
              </div>

              <div className="space-y-2">
                {['Ledge / Channel Edge', 'Deep Hole', 'Logjam / Timber', 'Hump / Sandbar', 'Mud Flat'].map(struct => {
                  const count = filteredCatches.filter(c => c.bottomStructure === struct).length;
                  const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                  return (
                    <div key={struct} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{struct}</span>
                        <span className="text-emerald-400 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-lime-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 6: Water Depth Bands & 24-Hour Daypart Feeding Clock (#6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Water Depth Distribution */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <ArrowDown className="w-4 h-4 text-blue-400" />
                  Water Depth Distribution Bands
                </span>
                <span className="text-slate-500 text-[10px]">Strike Depth (ft)</span>
              </div>

              <div className="space-y-2.5">
                {Object.entries(depthBands).map(([depthBand, count]) => {
                  const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                  return (
                    <div key={depthBand} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300">{depthBand}</span>
                        <span className="text-blue-400 font-bold">{count} strikes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 24-Hour Daypart Bite Clock (#6) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-2">
                <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  24-Hour Daypart Feeding Distribution
                </span>
                <div className="flex items-center gap-2.5 text-[10px] font-mono">
                  <span className="text-[#84CC16]">Rise: <strong className="text-white">{sunTimes.sunrise}</strong></span>
                  <span className="text-[#F97316]">Set: <strong className="text-white">{sunTimes.sunset}</strong></span>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { part: `Dawn (${sunTimes.sunrise} window)`, key: 'Dawn', icon: Sunrise, color: 'from-orange-500 to-amber-400' },
                  { part: 'Morning (09:00 - 11:59)', key: 'Morning', icon: Sun, color: 'from-amber-400 to-yellow-400' },
                  { part: 'Afternoon (12:00 - 16:59)', key: 'Afternoon', icon: Sun, color: 'from-yellow-500 to-orange-500' },
                  { part: `Dusk (${sunTimes.sunset} window)`, key: 'Dusk', icon: Sunset, color: 'from-orange-600 to-red-500' },
                  { part: 'Night (21:00 - 04:59)', key: 'Night', icon: Moon, color: 'from-indigo-600 to-blue-500' },
                ].map(item => {
                  const count = daypartCounts[item.key as Daypart];
                  const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
                  const Icon = item.icon;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          {item.part}
                        </span>
                        <span className="text-amber-400 font-bold">{count} strikes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 7: Solunar Peak Feeding Correlation */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold uppercase text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Solunar Minor & Major Feeding Windows
              </span>
              <span className="text-slate-500 text-[10px]">Moon Transit Alignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-1">
                <div className="text-amber-400 font-bold text-xs uppercase">Major Solunar Window</div>
                <div className="text-xl font-extrabold text-white">{solunarStats.Major}</div>
                <div className="text-[10px] text-amber-300">
                  {totalFiltered > 0 ? Math.round((solunarStats.Major / totalFiltered) * 100) : 0}% during moon overhead/underfoot
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-yellow-500/30 text-center space-y-1">
                <div className="text-yellow-400 font-bold text-xs uppercase">Minor Solunar Window</div>
                <div className="text-xl font-extrabold text-white">{solunarStats.Minor}</div>
                <div className="text-[10px] text-yellow-300">
                  {totalFiltered > 0 ? Math.round((solunarStats.Minor / totalFiltered) * 100) : 0}% during moonrise/moonset
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <div className="text-slate-400 font-bold text-xs uppercase">Inactive Windows</div>
                <div className="text-xl font-extrabold text-white">{solunarStats.Inactive}</div>
                <div className="text-[10px] text-slate-400">
                  {totalFiltered > 0 ? Math.round((solunarStats.Inactive / totalFiltered) * 100) : 0}% between windows
                </div>
              </div>
            </div>
          </div>

        </>
      )}

        </div>
      )}

      {/* Embedded Tactical Field Guide Modal */}
      <AboutModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        initialTab="guide"
        initialSection={guideSection}
      />
    </div>
  );
};

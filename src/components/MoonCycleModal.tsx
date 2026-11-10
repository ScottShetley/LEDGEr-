import React, { useEffect, useRef, useState } from 'react';
import {
  Moon,
  X,
  Compass,
  Sparkles,
  Info,
  Calendar,
  Eye,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { SolunarData } from '../types';

interface MoonCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  solunar: SolunarData;
}

interface PhaseDetail {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  illuminationRange: string;
  biteRating: 'Peak' | 'Good' | 'Fair' | 'Moderate';
  biteColor: string;
  overview: string;
  catfishBehavior: string;
  tactics: string[];
  bestBaitPresentation: string;
}

const ALL_PHASES: PhaseDetail[] = [
  {
    id: 'new',
    name: 'New Moon',
    shortName: 'New Moon',
    emoji: '🌑',
    illuminationRange: '0% - 2%',
    biteRating: 'Peak',
    biteColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
    overview:
      'Pitch-black river nights maximize big catfish stealth. Trophy Blue and Flathead catfish cruise shallow mud flats and channel edges under the safety of darkness.',
    catfishBehavior:
      'Without lunar ambient light, baitfish lose their schooling coordination. Catfish use their lateral lines and sensitive barbels to hunt relentlessly in water as shallow as 2 to 6 feet.',
    tactics: [
      'Anchor on shallow flats (3-8 ft) adjacent to deep river channels at night.',
      'Use fresh, bloody cut skipjack or gizzard shad heads with maximum scent dispersion.',
      'During daylight hours, target the major solunar feeding period when the moon transits overhead with the sun.',
    ],
    bestBaitPresentation: 'Santee Cooper Rig with fresh bloody cut bait drifting right over bottom silt.',
  },
  {
    id: 'waxing_crescent',
    name: 'Waxing Crescent',
    shortName: 'Waxing Crescent',
    emoji: '🌒',
    illuminationRange: '3% - 45%',
    biteRating: 'Good',
    biteColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
    overview:
      'Slight silver sliver visible in the western evening sky. A dependable feeding cycle as nighttime visibility begins a gentle transition.',
    catfishBehavior:
      'Fish establish predictable feeding routes between daytime deep holes and evening feeding flats. Active bites typically intensify during early dusk.',
    tactics: [
      'Set lines along channel drop-offs where fish stage before moving onto feeding flats.',
      'Live bluegill or lively gizzard shad suspended right above structure yield aggressive Flathead strikes.',
      'Watch for minor solunar windows around sunset.',
    ],
    bestBaitPresentation: 'Carolina Slip-Sinker Rig with live struggling bait near timber ledges.',
  },
  {
    id: 'first_quarter',
    name: 'First Quarter (Half Moon)',
    shortName: 'Half Moon (1st Qtr)',
    emoji: '🌓',
    illuminationRange: '46% - 54%',
    biteRating: 'Moderate',
    biteColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    overview:
      'Neap tide effect: gravitational gravitational influence of sun and moon are at right angles, resulting in moderate celestial pulling force.',
    catfishBehavior:
      'Catfish are less frenzied and stick to predictable river seams, current breaks, and logjams. Feeding windows tend to align tightly with current generation or dam releases.',
    tactics: [
      'Focus primarily on river current flow and structure rather than relying purely on celestial timing.',
      'Fish the front and back eddy seams of wing dams, bridge pilings, and rock humps.',
      'Downsize bait profile if bites are timid tap-taps.',
    ],
    bestBaitPresentation: '3-Way Swivel Drop Rig anchored tight into rocky river seams.',
  },
  {
    id: 'waxing_gibbous',
    name: 'Waxing Gibbous (Nearly Full)',
    shortName: 'Nearly Full (Waxing)',
    emoji: '🌔',
    illuminationRange: '55% - 97%',
    biteRating: 'Peak',
    biteColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
    overview:
      'The moon is more than half illuminated and waxing brighter each night. Massive energy shifts occur throughout the aquatic food chain.',
    catfishBehavior:
      'Shad and baitfish schools move higher in the water column lured by ambient surface glow. Giant catfish stage on current edges ready to intercept rising bait.',
    tactics: [
      'Trophy catfish bite aggressively from twilight until midnight before lunar zenith.',
      'If daytime fishing is sluggish, it is because predators gorged throughout the illuminated night.',
      'Drag boards or drift chunks over 10-15 ft flats bordering heavy river current.',
    ],
    bestBaitPresentation: 'Planer boards drifting large cut shad chunks 1-2 feet off bottom.',
  },
  {
    id: 'full',
    name: 'Full Moon',
    shortName: 'Full Moon',
    emoji: '🌕',
    illuminationRange: '98% - 100%',
    biteRating: 'Peak',
    biteColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
    overview:
      'Maximum gravitational alignment (Spring Tides) and 100% celestial illumination. One of the most legendary and misunderstood periods in catfishing.',
    catfishBehavior:
      'Nighttime is an absolute feeding frenzy. Blue cats and Flatheads will chase live bait directly on the surface or in water barely deep enough to cover their dorsal fins. Mid-day daytime bites can be notoriously slow because fish fed all night.',
    tactics: [
      'Night owl strategy: Fish from 9:00 PM to 4:00 AM on shallow gravel bars, sandbars, and rip-rap banks.',
      'If fishing daylight hours, target the deepest shaded holes, under heavy logjams, or fish right when overcast clouds block direct sunlight.',
      'Use loud rattle floats or large live bait that thumps hard in the water.',
    ],
    bestBaitPresentation: 'Santee Cooper float rig with demon dragon rattles and jumbo fresh bait.',
  },
  {
    id: 'waning_gibbous',
    name: 'Waning Gibbous (Nearly Full)',
    shortName: 'Nearly Full (Waning)',
    emoji: '🌖',
    illuminationRange: '97% - 55%',
    biteRating: 'Good',
    biteColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
    overview:
      'Moon rises later in the night (post-dusk), leaving early darkness followed by intense midnight moonlight.',
    catfishBehavior:
      'Creates a dual feeding spike: first in early pitch darkness right after sunset, and a second massive feed in the early dawn hours as the moon sets.',
    tactics: [
      'The pre-dawn window (4:00 AM - 7:30 AM) is exceptionally productive as catfish feed hard before retreating into deep daytime wintering holes.',
      'Anchor right on outside river bends where current sweeps bait directly past staging fish.',
    ],
    bestBaitPresentation: 'Fresh cut skipjack chunk on a slip-sinker rig cast to the edge of the channel drop.',
  },
  {
    id: 'last_quarter',
    name: 'Last Quarter (Half Moon)',
    shortName: 'Half Moon (3rd Qtr)',
    emoji: '🌗',
    illuminationRange: '54% - 46%',
    biteRating: 'Moderate',
    biteColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
    overview:
      'Decreasing illumination with moon rising around midnight. Daytime and late morning bites begin improving significantly.',
    catfishBehavior:
      'Because nighttime light diminishes, catfish shift their feeding habits back into daytime hours. Mid-morning major solunar periods become explosive.',
    tactics: [
      'Target morning hours (8:00 AM - 1:00 PM).',
      'Look for deep river holes with logjams and bottom structure where fish hold stationary.',
      'Bumping bottom with heavy lead while drifting with river current produces reaction strikes.',
    ],
    bestBaitPresentation: 'Bumping bottom down river channel ledges with compact, firm cut bait.',
  },
  {
    id: 'waning_crescent',
    name: 'Waning Crescent',
    shortName: 'Waning Crescent',
    emoji: '🌘',
    illuminationRange: '45% - 3%',
    biteRating: 'Good',
    biteColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
    overview:
      'Thin crescent visible in the eastern sky right before dawn. River nights return to dark skies, priming fish for the upcoming New Moon cycle.',
    catfishBehavior:
      'Predators become aggressive in shallow water throughout the night and in low-light dawn and dusk windows.',
    tactics: [
      'Work shallow river flats at dusk and early night.',
      'Great period for both live bait (Flathead) and fresh oily cut bait (Blue catfish).',
      'Pay close attention to daily solunar major feeding windows.',
    ],
    bestBaitPresentation: 'Live gizzard shad or live bluegill hooked through the back under a slip-bobber.',
  },
];

/**
 * Determine which phase ID best matches the current solunar phase name or illumination
 */
function matchCurrentPhaseId(phaseName: string, illumination: number): string {
  const p = (phaseName || '').toLowerCase();
  if (p.includes('new')) return 'new';
  if (p.includes('waxing crescent')) return 'waxing_crescent';
  if (p.includes('first quarter')) return 'first_quarter';
  if (p.includes('waxing gibbous')) return 'waxing_gibbous';
  if (p.includes('full')) return 'full';
  if (p.includes('waning gibbous')) return 'waning_gibbous';
  if (p.includes('last quarter') || p.includes('third quarter')) return 'last_quarter';
  if (p.includes('waning crescent')) return 'waning_crescent';

  // Fallback by percentage
  if (illumination >= 96) return 'full';
  if (illumination >= 55) return 'waxing_gibbous';
  if (illumination >= 45) return 'first_quarter';
  if (illumination >= 5) return 'waxing_crescent';
  return 'new';
}

export const MoonCycleModal: React.FC<MoonCycleModalProps> = ({
  isOpen,
  onClose,
  solunar,
}) => {
  const currentPhaseId = matchCurrentPhaseId(
    solunar.moonPhaseName,
    solunar.moonIlluminationPercent
  );

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(currentPhaseId);
  const activeCardRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync state whenever modal opens or current phase changes
  useEffect(() => {
    if (isOpen) {
      setSelectedPhaseId(currentPhaseId);
      // Auto-scroll to current phase card smoothly after modal paints
      const timer = setTimeout(() => {
        if (activeCardRef.current) {
          activeCardRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentPhaseId]);

  if (!isOpen) return null;

  const activePhase =
    ALL_PHASES.find((p) => p.id === selectedPhaseId) ||
    ALL_PHASES.find((p) => p.id === currentPhaseId) ||
    ALL_PHASES[0];

  const currentPhaseObj =
    ALL_PHASES.find((p) => p.id === currentPhaseId) || ALL_PHASES[0];

  return (
    <div
      id="moon-cycle-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moon-guide-title"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner">
              {currentPhaseObj.emoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="moon-guide-title"
                  className="text-base sm:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2"
                >
                  <span>Lunar Fishing Master Guide</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  SOLUNAR INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                How moon phases, nocturnal illumination, and gravitational cycles trigger giant catfish bites
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lunar guide"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-slate-200 text-sm font-sans"
        >
          {/* Current Live Status Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/60 border border-indigo-500/40 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="text-4xl sm:text-5xl shrink-0 p-2 rounded-2xl bg-slate-950/80 border border-indigo-500/30 shadow-inner">
                  {currentPhaseObj.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500 text-slate-950">
                      LIVE RIGHT NOW
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Age: {solunar.moonAgeDays.toFixed(1)} days
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
                    {solunar.moonPhaseName || currentPhaseObj.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-200/90 font-mono mt-0.5">
                    Illumination: <span className="font-bold text-white">{solunar.moonIlluminationPercent}%</span> • Current Bite Rating:{' '}
                    <span
                      className={`font-bold uppercase ${
                        solunar.currentRating === 'Major'
                          ? 'text-emerald-400'
                          : solunar.currentRating === 'Minor'
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {solunar.currentRating} Window
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch md:self-auto">
                <button
                  type="button"
                  onClick={() => setSelectedPhaseId(currentPhaseId)}
                  className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Current Phase</span>
                </button>
              </div>
            </div>
          </div>

          {/* Phase Selector Horizontal Rail */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Select Any Lunar Phase To Inspect:
              </span>
              <span className="text-[11px] font-mono text-indigo-400">
                8 Astronomical Phases
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {ALL_PHASES.map((p) => {
                const isSelected = p.id === activePhase.id;
                const isLive = p.id === currentPhaseId;

                return (
                  <button
                    key={p.id}
                    ref={isLive ? activeCardRef : undefined}
                    type="button"
                    onClick={() => setSelectedPhaseId(p.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition text-left ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-105'
                        : isLive
                        ? 'bg-indigo-950/70 border-indigo-500/70 text-indigo-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span className="text-lg leading-none">{p.emoji}</span>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{p.shortName}</span>
                        {isLive && (
                          <span className="text-[8px] bg-emerald-400 text-slate-950 font-black px-1 rounded uppercase">
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-75 font-mono">
                        {p.illuminationRange}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Phase Deep Dive Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl">{activePhase.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-white">
                      {activePhase.name}
                    </h4>
                    {activePhase.id === currentPhaseId && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        ACTIVE APP PHASE
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Illumination Range: {activePhase.illuminationRange}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-mono text-slate-400">Predicted Bite:</span>
                <span
                  className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border uppercase ${activePhase.biteColor}`}
                >
                  {activePhase.biteRating} Window
                </span>
              </div>
            </div>

            {/* Overview & Biology */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Phase Dynamics &amp; Lighting</span>
                </h5>
                <p className="text-xs leading-relaxed text-slate-300">
                  {activePhase.overview}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Catfish &amp; Predator Instinct</span>
                </h5>
                <p className="text-xs leading-relaxed text-slate-300">
                  {activePhase.catfishBehavior}
                </p>
              </div>
            </div>

            {/* Tactical Playbook */}
            <div className="space-y-2">
              <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tactical Adjustments For This Phase:</span>
              </h5>
              <div className="space-y-1.5">
                {activePhase.tactics.map((tactic, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{tactic}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Bait Presentation */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-2.5">
              <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 block">
                  Top Recommended Rig Presentation:
                </span>
                <span className="text-xs font-mono font-semibold text-white">
                  {activePhase.bestBaitPresentation}
                </span>
              </div>
            </div>
          </div>

          {/* Educational Breakdown: Why the Moon Affects Fishing */}
          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>The Science: Why Moon Cycles Dictate The River Bite</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-cyan-300 block mb-1">
                  1. Nocturnal Illumination
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Fish don&apos;t have eyelids. Full and Gibbous moons illuminate shallow sandbars and rocky ledges, allowing baitfish like shad and bluegill to school higher. Giant predators follow right behind them to feed under moonlight.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-amber-300 block mb-1">
                  2. Gravitational Solunar Pull
                </span>
                <p className="text-slate-300 leading-relaxed">
                  John Alden Knight&apos;s Solunar Theory proved that fish activity spikes when the moon is directly overhead (Lunar Transit) or directly underfoot (Opposite Transit). These create the 2-hour <strong>Major Periods</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-300 block mb-1">
                  3. The &quot;Full Moon Hangover&quot;
                </span>
                <p className="text-slate-300 leading-relaxed">
                  Anglers often complain that fishing is terrible on full moon days. In reality, the fish ate like crazy all night long! On bright moon days, focus on deep shading, heavily stained river stretches, or evening twilight.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Current Phase: <strong className="text-indigo-300">{solunar.moonPhaseName}</strong> ({solunar.moonIlluminationPercent}% illuminated)
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

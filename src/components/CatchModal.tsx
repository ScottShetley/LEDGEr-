import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Anchor,
  Compass,
  Gauge,
  Thermometer,
  Wind,
  Waves,
  Zap,
  Flame,
  Check,
  Clock,
  Sparkles,
  ArrowDown,
  Fish,
  Layers,
  Sliders,
  Calendar,
  Edit3,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
  HardDrive,
  RotateCw,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import {
  CatchLog,
  FishingMode,
  SpeciesCategory,
  BaitRigType,
  UnifiedPresentation,
  BaitCollectionMethod,
  BaitAbundance,
  BaitSizeProfile,
  CurrentCondition,
  BottomStructure,
  WaterClarity,
  EnvironmentalSnapshot,
} from '../types';
import { isBaitSpecies } from '../utils/storage';
import { normalizeBaitName } from '../utils/baitNormalizer';
import { getLiveEnvironmentalSnapshot } from '../services/weatherAndWaterService';
import { calculateSolunar } from '../utils/solunar';
import { compressImageUnder500KB } from '../utils/imageCompressor';
import { getSafeCurrentPosition, canAccessGeolocation } from '../utils/geolocation';

interface CatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: CatchLog, photoBlob?: Blob | null) => void;
  currentMode: FishingMode;
  initialCoords?: { lat: number; lon: number; accuracy?: number };
  initialIsBait?: boolean;
  prefill?: {
    waterDepthFeet?: number;
    current?: CurrentCondition;
    bottomStructure?: BottomStructure;
    waterClarity?: WaterClarity;
    presentation?: string;
    mode?: FishingMode;
    baitRig?: string;
    species?: SpeciesCategory;
    sourceSpotName?: string;
  };
}

// Dedicated Catfish Species
const CATFISH_SPECIES: SpeciesCategory[] = [
  'Blue Catfish',
  'Flathead Catfish',
  'Channel Catfish',
  'Bullhead',
  'Freshwater Drum',
  'Gar',
  'Other',
];

// Dedicated Bait Species
const BAIT_SPECIES: SpeciesCategory[] = [
  'Skipjack Herring',
  'Gizzard Shad',
  'Threadfin Shad',
  'Bluegill / Sunfish',
  'Crappie (Black / White)',
  'White Bass',
  'Largemouth Bass',
  'Carp (Common / Grass / Asian)',
  'Mooneye / Goldeye',
  'Asian / Silver Carp',
];

// Catfish Baits
const CATFISH_BAIT_OPTIONS: BaitRigType[] = [
  'Cut Skipjack Head',
  'Cut Skipjack Chunk',
  'Cut Bluegill',
  'Live Bluegill',
  'Live Gizzard Shad',
  'Cut Gizzard Shad',
  'Live Threadfin Shad',
  'Cut Threadfin Shad',
  'Largemouth Bass (Live / Cut)',
  'Cut Carp / Carp Chunk',
  'Crappie (Live / Cut)',
  'White Bass (Cut / Live)',
  'Live Shad',
  'Dip / Prepared Bait',
  'Nightcrawler',
  'Custom',
];

// Standardized Catfish Presentations (Unified for Boat & Bank)
const UNIFIED_CATFISH_PRESENTATIONS: UnifiedPresentation[] = [
  'Santee Cooper Rig',
  'Bumping Bottom',
  'Drifting / Dragging Boards',
  'Carolina Slip-Sinker',
  'Suspended / Down-Rod',
  '3-Way Swivel Drop Rig',
  'Slip Bobber / Float',
  'Anchored Bottom Spread',
];

// Dedicated Bait Gathering Methods
const BAIT_METHODS: BaitCollectionMethod[] = [
  'Sabiki Rig / Jigs',
  'Cast Net (8ft/10ft)',
  'Dip Net / Scoop',
  'Crankbait / Small Spoon',
  'Worm & Small Hook (#6)',
  'Umbrella / Drop Net',
  'Snagging',
  'Other / Custom',
];

const BAIT_ABUNDANCE_OPTIONS: BaitAbundance[] = [
  'Abundant / Boiling',
  'Steady Bites',
  'Scattered / Slow',
  'Hard to Find',
];

const BAIT_SIZE_OPTIONS: BaitSizeProfile[] = [
  'Small (3-5 in)',
  'Medium (6-8 in)',
  'Jumbo / Tanker (9-14 in)',
  'Mixed Sizes',
];

const CURRENT_OPTIONS: CurrentCondition[] = [
  'Slack',
  'Gentle',
  'Moderate',
  'Heavy / Boiled',
  'Eddy / Seam',
];

const STRUCTURE_OPTIONS: BottomStructure[] = [
  'Ledge / Channel Edge',
  'Deep Hole',
  'Logjam / Timber',
  'Hump / Sandbar',
  'Mud Flat',
];

const CLARITY_OPTIONS: WaterClarity[] = ['Muddy', 'Stained', 'Clear'];

export const CatchModal: React.FC<CatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentMode,
  initialCoords,
  initialIsBait = false,
  prefill,
}) => {
  // Log Type: catfish catch (bait gathering flow hidden for now)
  const [logType, setLogType] = useState<'catfish' | 'bait'>('catfish');
  const [mode, setMode] = useState<FishingMode>(prefill?.mode ?? currentMode);
  const [lat, setLat] = useState<number>(initialCoords?.lat ?? 32.4610);
  const [lon, setLon] = useState<number>(initialCoords?.lon ?? -84.9877);
  const [accuracy, setAccuracy] = useState<number | undefined>(initialCoords?.accuracy);
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  // Catfish Form Selections
  const [species, setSpecies] = useState<SpeciesCategory>(
    prefill?.species ?? (initialIsBait ? 'Skipjack Herring' : 'Blue Catfish')
  );
  const [baitRig, setBaitRig] = useState<BaitRigType | string>(prefill?.baitRig ?? 'Cut Skipjack Head');
  const [customBait, setCustomBait] = useState('');
  const [presentation, setPresentation] = useState<string>(prefill?.presentation ?? 'Santee Cooper Rig');
  const [waterDepth, setWaterDepth] = useState<number>(prefill?.waterDepthFeet ?? 32);
  const [current, setCurrent] = useState<CurrentCondition>(prefill?.current ?? 'Moderate');
  const [structure, setStructure] = useState<BottomStructure>(prefill?.bottomStructure ?? 'Ledge / Channel Edge');
  const [clarity, setClarity] = useState<WaterClarity>(prefill?.waterClarity ?? 'Muddy');
  const [weightLbs, setWeightLbs] = useState<string>('');
  const [lengthInches, setLengthInches] = useState<string>('');

  // Bait Gathering Form Selections
  const [baitMethod, setBaitMethod] = useState<BaitCollectionMethod>('Sabiki Rig / Jigs');
  const [customBaitMethod, setCustomBaitMethod] = useState('');
  const [baitAbundance, setBaitAbundance] = useState<BaitAbundance>('Abundant / Boiling');
  const [baitSize, setBaitSize] = useState<BaitSizeProfile>('Medium (6-8 in)');
  const [baitQuantityEstimate, setBaitQuantityEstimate] = useState<string>('25');

  const [notes, setNotes] = useState<string>('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const [photoSizeDisplay, setPhotoSizeDisplay] = useState<string>('');
  const [photoRotation, setPhotoRotation] = useState<number>(0);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [showLocationTimeEditor, setShowLocationTimeEditor] = useState<boolean>(false);
  const [isSnappingGps, setIsSnappingGps] = useState<boolean>(false);
  const [customDateTime, setCustomDateTime] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  );

  const handleSnapLiveGps = async () => {
    setIsSnappingGps(true);
    try {
      const coords = await getSafeCurrentPosition();
      setLat(coords.lat);
      setLon(coords.lon);
      setAccuracy(coords.accuracy);
    } finally {
      setIsSnappingGps(false);
    }
  };

  // Environmental snapshot fetching state
  const [envSnapshot, setEnvSnapshot] = useState<EnvironmentalSnapshot>({
    isOfflineQueued: false,
  });
  const [isFetchingEnv, setIsFetchingEnv] = useState<boolean>(true);

  // Sync initialCoords changes whenever opened
  useEffect(() => {
    if (initialCoords) {
      setLat(initialCoords.lat);
      setLon(initialCoords.lon);
      if (initialCoords.accuracy !== undefined) {
        setAccuracy(initialCoords.accuracy);
      }
    }
  }, [initialCoords, isOpen]);

  // Sync prefill changes if provided
  useEffect(() => {
    if (prefill) {
      if (prefill.waterDepthFeet !== undefined) setWaterDepth(prefill.waterDepthFeet);
      if (prefill.current) setCurrent(prefill.current);
      if (prefill.bottomStructure) setStructure(prefill.bottomStructure);
      if (prefill.waterClarity) setClarity(prefill.waterClarity);
      if (prefill.presentation) setPresentation(prefill.presentation);
      if (prefill.mode) setMode(prefill.mode);
      if (prefill.baitRig) setBaitRig(prefill.baitRig);
      if (prefill.species) setSpecies(prefill.species);
    }
  }, [prefill, isOpen]);

  // Sync log type toggle with species list
  useEffect(() => {
    if (logType === 'bait') {
      if (!isBaitSpecies(species)) {
        setSpecies('Skipjack Herring');
      }
    } else {
      if (isBaitSpecies(species)) {
        setSpecies('Blue Catfish');
      }
    }
  }, [logType]);

  // Lock GPS and fetch real-time atmospheric / river data on open
  useEffect(() => {
    let isCancelled = false;
    const now = Date.now();
    setTimestamp(now);

    const lockAndFetch = async () => {
      let targetLat = initialCoords ? initialCoords.lat : lat;
      let targetLon = initialCoords ? initialCoords.lon : lon;
      let targetAcc = initialCoords ? initialCoords.accuracy : accuracy;

      // CRITICAL: ONLY fetch live device GPS if NO explicit coordinates were provided
      if (!initialCoords) {
        try {
          const pos = await getSafeCurrentPosition();
          if (!isCancelled) {
            targetLat = pos.lat;
            targetLon = pos.lon;
            targetAcc = pos.accuracy;
            setLat(targetLat);
            setLon(targetLon);
            setAccuracy(targetAcc);
          }
        } catch {
          // Keep current fallback coordinates
        }
      } else if (initialCoords && !isCancelled) {
        setLat(initialCoords.lat);
        setLon(initialCoords.lon);
        setAccuracy(initialCoords.accuracy);
      }

      setIsFetchingEnv(true);
      try {
        const isOffline = !navigator.onLine;
        const snapshot = await getLiveEnvironmentalSnapshot(targetLat, targetLon, isOffline);
        if (!isCancelled) {
          setEnvSnapshot(snapshot);
        }
      } catch {
        if (!isCancelled) {
          const solunar = calculateSolunar(new Date(now), targetLat, targetLon);
          setEnvSnapshot({
            solunarRating: solunar.currentRating,
            moonPhaseName: solunar.moonPhaseName,
            isOfflineQueued: true,
          });
        }
      } finally {
        if (!isCancelled) setIsFetchingEnv(false);
      }
    };

    lockAndFetch();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsCompressingPhoto(true);
    try {
      // Compress client-side to strictly under 500KB for offline IndexedDB storage
      const compressed = await compressImageUnder500KB(file, 480 * 1024);
      setPhotoBlob(compressed.blob);
      setPhotoUrl(compressed.objectUrl || compressed.dataUrl);
      setPhotoRotation(0);
      const kb = Math.round(compressed.sizeBytes / 1024);
      setPhotoSizeDisplay(`${kb} KB`);
    } catch (err) {
      console.warn('Compression fallback to direct read:', err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotoUrl(ev.target.result as string);
          setPhotoBlob(file);
          setPhotoRotation(0);
          setPhotoSizeDisplay(`${Math.round(file.size / 1024)} KB`);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handleSave = async (isQuickPin: boolean = false) => {
    const isBait = logType === 'bait' || isBaitSpecies(species);

    let finalBaitRig = baitRig;
    let finalPresentation = presentation;
    let computedNotes = notes;

    if (isBait) {
      const finalMethod = baitMethod === 'Other / Custom' && customBaitMethod.trim()
        ? customBaitMethod.trim()
        : baitMethod;
      finalBaitRig = `Method: ${finalMethod}`;
      finalPresentation = `Gathering: ${finalMethod} (${baitAbundance}, ${baitSize})`;
      const baitNoteDetail = `[Bait Recon: ${baitAbundance} | Size: ${baitSize} | Est: ${baitQuantityEstimate || 'N/A'}]`;
      computedNotes = notes ? `${baitNoteDetail} ${notes}` : baitNoteDetail;
    } else {
      const enteredBait = baitRig === 'Custom' && customBait.trim() ? customBait.trim() : baitRig;
      finalBaitRig = normalizeBaitName(enteredBait);
    }

    // CRITICAL FIX: If coordinates were explicitly provided (from map, reticle, or prefilled waypoint),
    // or if the user edited them manually, NEVER overwrite them with the device's live geolocation.
    let saveLat = lat;
    let saveLon = lon;
    let saveAccuracy = accuracy;

    if (!initialCoords && !showLocationTimeEditor) {
      try {
        const quickPos = await getSafeCurrentPosition();
        saveLat = quickPos.lat;
        saveLon = quickPos.lon;
        saveAccuracy = quickPos.accuracy;
      } catch {
        // Use existing locked coordinates
      }
    }

    const newLog: CatchLog = {
      id: 'catch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp,
      lat: saveLat,
      lon: saveLon,
      accuracyMeters: saveAccuracy,
      mode,
      species,
      isBait,
      baitRig: finalBaitRig,
      presentation: finalPresentation,
      waterDepthFeet: waterDepth,
      current,
      bottomStructure: structure,
      waterClarity: clarity,
      weightLbs: !isBait && weightLbs ? parseFloat(weightLbs) : undefined,
      lengthInches: lengthInches ? parseFloat(lengthInches) : undefined,
      photoUrl: photoUrl || undefined,
      photoRotation: photoRotation || undefined,
      isSynced: false, // Default to false for offline queue
      photoSizeBytes: photoBlob ? photoBlob.size : undefined,
      notes: isQuickPin && !computedNotes ? '⚡ Quick Pin logged on the water (Edit later)' : computedNotes,
      environmentalSnapshot: envSnapshot,
    };

    onSave(newLog, photoBlob);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="rapid-catch-logging-modal"
      className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-[#1E293B] border-t sm:border border-slate-700 sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100 animate-in slide-in-from-bottom duration-200 z-[2001]">
        
        {/* Modal Header */}
        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-700 flex items-center justify-between gap-2 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-xl border shrink-0 ${logType === 'bait' ? 'bg-[#84CC16]/20 text-[#84CC16] border-[#84CC16]/30' : 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30'}`}>
              {logType === 'bait' ? <Fish className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-xs sm:text-base md:text-lg text-white uppercase tracking-wider font-mono flex flex-wrap items-center gap-1.5">
                <span className="truncate">{logType === 'bait' ? 'LOG BAIT SPOT' : 'DROP PIN & LOG CATCH'}</span>
                {initialCoords && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold font-mono tracking-normal shrink-0">
                    SPOT LOCKED
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] font-mono text-slate-400">
                <button
                  type="button"
                  onClick={() => setShowLocationTimeEditor(!showLocationTimeEditor)}
                  className="hover:text-orange-400 flex items-center gap-1 transition text-slate-300 underline decoration-dotted underline-offset-2 cursor-pointer truncate"
                  title="Click to edit GPS coordinates or timestamp manually"
                >
                  <Edit3 className="w-3 h-3 text-orange-400 shrink-0" />
                  <span>{lat.toFixed(5)}°, {lon.toFixed(5)}°</span>
                </button>
                {accuracy && <span className="text-slate-500 shrink-0">±{Math.round(accuracy)}m</span>}
                <span className="text-slate-600 hidden xs:inline">•</span>
                <button
                  type="button"
                  onClick={() => setShowLocationTimeEditor(!showLocationTimeEditor)}
                  className="hover:text-orange-400 flex items-center gap-1 transition text-slate-300 underline decoration-dotted underline-offset-2 cursor-pointer truncate"
                  title="Click to change date/time"
                >
                  <Calendar className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Mode Toggle */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('boat')}
                className={`px-2 py-1 rounded text-xs font-bold transition ${
                  mode === 'boat' ? 'bg-[#F97316] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🚤 Boat
              </button>
              <button
                type="button"
                onClick={() => setMode('bank')}
                className={`px-2 py-1 rounded text-xs font-bold transition ${
                  mode === 'bank' ? 'bg-[#84CC16] text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎣 Bank
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Manual Date/Time & Coordinate Customizer Panel */}
        {showLocationTimeEditor && (
          <div className="p-3 bg-slate-950 border-b border-orange-500/40 space-y-2.5 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between text-[11px] font-mono text-orange-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                Manual Location & Date/Time Override
              </span>
              <button
                type="button"
                onClick={() => setShowLocationTimeEditor(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
              >
                Done
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.00001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Date & Time Caught</label>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => {
                    setCustomDateTime(e.target.value);
                    const parsed = new Date(e.target.value).getTime();
                    if (!isNaN(parsed)) {
                      setTimestamp(parsed);
                    }
                  }}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSnapLiveGps}
                disabled={isSnappingGps}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-600/60 hover:bg-sky-900 text-xs font-mono font-bold transition cursor-pointer"
              >
                {isSnappingGps ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{isSnappingGps ? 'Acquiring Satellite GPS Fix...' : 'Snap Coordinates to Live Device GPS'}</span>
              </button>
              <p className="text-[10px] text-slate-400 italic">
                💡 Tip: You can also tap anywhere directly on the satellite map to pin that exact structure.
              </p>
            </div>
          </div>
        )}

        {/* Environmental Live Telemetry Bar */}
        <div className="bg-slate-950/60 px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300 overflow-x-auto gap-2">
          {isFetchingEnv ? (
            <div className="flex items-center gap-2 text-orange-400 animate-pulse text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fetching real-time baro & USGS streamflow data...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-1 text-slate-200">
                <Gauge className="w-3.5 h-3.5 text-[#F97316]" />
                <span>{envSnapshot.pressureInHg?.toFixed(2) ?? '29.95'} inHg</span>
                <span className="text-[10px] text-slate-400">({envSnapshot.pressureTrend ?? 'steady'})</span>
              </div>
              <div className="flex items-center gap-1 text-slate-200">
                <Thermometer className="w-3.5 h-3.5 text-sky-400" />
                <span>{envSnapshot.airTempF ?? 75}°F</span>
              </div>
              <div className="flex items-center gap-1 text-slate-200">
                <Wind className="w-3.5 h-3.5 text-teal-400" />
                <span>{envSnapshot.windSpeedMph ?? 6}mph {envSnapshot.windDirectionCompass ?? 'S'}</span>
              </div>
              {envSnapshot.usgsFlowCfs !== undefined && (
                <div className="flex items-center gap-1 text-[#84CC16]">
                  <Waves className="w-3.5 h-3.5 text-[#84CC16]" />
                  <span>{envSnapshot.usgsFlowCfs.toLocaleString()} CFS</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* ================= CATFISH CATCH WORKFLOW ================= */}
          {logType === 'catfish' && (
            <>
              {/* Section 1: Catfish Species Selection */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Fish className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>1. Target Species</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {CATFISH_SPECIES.map(sp => {
                    const isSelected = species === sp;
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSpecies(sp)}
                        className={`p-2.5 sm:p-3 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all flex items-center justify-between min-h-[44px] cursor-pointer ${
                          isSelected
                            ? 'bg-[#F97316] text-white border-orange-300 shadow-md scale-[1.02]'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span>{sp}</span>
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Catfish Bait Rig Selection */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>2. Bait Used</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {CATFISH_BAIT_OPTIONS.map(b => {
                    const isSelected = baitRig === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBaitRig(b)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md font-black'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
                {baitRig === 'Custom' && (
                  <input
                    type="text"
                    value={customBait}
                    onChange={(e) => setCustomBait(e.target.value)}
                    placeholder="Enter custom bait or rig description..."
                    className="mt-2 w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-orange-500 outline-none"
                  />
                )}

                {/* State DNR Regulation Warning for Bass as Bait */}
                {(baitRig.includes('Largemouth Bass') || (baitRig === 'Custom' && customBait.toLowerCase().includes('bass'))) && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-start gap-2.5 shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5 uppercase tracking-wider text-[11px]">
                        State DNR Regulation Advisory
                      </span>
                      <span className="text-[11px] leading-relaxed text-amber-200/90">
                        Check your state&apos;s Department of Natural Resources (DNR) or Fish &amp; Wildlife regulations regarding using Largemouth Bass as bait. Many states strictly prohibit using gamefish as bait or enforce minimum length, bag, and possession limits.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Standardized Presentation (Same for Boat & Bank) */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#F97316]" />
                    <span>3. Presentation & Tactical Rigging</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Standardized spread</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {UNIFIED_CATFISH_PRESENTATIONS.map(pres => {
                    const isSelected = presentation === pres;
                    return (
                      <button
                        key={pres}
                        type="button"
                        onClick={() => setPresentation(pres)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md font-black'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pres}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Catfish Weight & Length */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-slate-400 mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(e.target.value)}
                    placeholder="e.g. 42.5"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-slate-400 mb-1">
                    Length (in)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={lengthInches}
                    onChange={(e) => setLengthInches(e.target.value)}
                    placeholder="e.g. 41.0"
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* ================= DEDICATED BAIT GATHERING WORKFLOW ================= */}
          {logType === 'bait' && (
            <>
              {/* Section 1: Bait Species Selection */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-[#84CC16] mb-2 flex items-center gap-1.5">
                  <Fish className="w-3.5 h-3.5 text-[#84CC16]" />
                  <span>1. Target Baitfish Species</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                  {BAIT_SPECIES.map(sp => {
                    const isSelected = species === sp;
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setSpecies(sp)}
                        className={`p-2.5 sm:p-3 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all flex items-center justify-between min-h-[44px] cursor-pointer ${
                          isSelected
                            ? 'bg-[#84CC16] text-slate-950 border-lime-300 shadow-md font-black scale-[1.02]'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <span>{sp}</span>
                        {isSelected && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                {/* State DNR Regulation Warning for Bass when gathering bait */}
                {species === 'Largemouth Bass' && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-start gap-2.5 shadow-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5 uppercase tracking-wider text-[11px]">
                        State DNR Regulation Advisory
                      </span>
                      <span className="text-[11px] leading-relaxed text-amber-200/90">
                        Always check your state&apos;s Department of Natural Resources (DNR) or Wildlife Commission regulations before harvesting or keeping Largemouth Bass as bait. Most states prohibit using black bass species as bait, require minimum size limits, or restrict cast-netting gamefish.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Dedicated Bait Gathering Method (Sabiki, Cast Net, etc.) */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#84CC16]" />
                  <span>2. Bait Gathering Method</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {BAIT_METHODS.map(method => {
                    const isSelected = baitMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setBaitMethod(method)}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#84CC16] text-slate-950 border-lime-300 shadow-md font-black'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {method}
                      </button>
                    );
                  })}
                </div>
                {baitMethod === 'Other / Custom' && (
                  <input
                    type="text"
                    value={customBaitMethod}
                    onChange={(e) => setCustomBaitMethod(e.target.value)}
                    placeholder="Enter custom bait catching method..."
                    className="mt-2 w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-lime-500 outline-none"
                  />
                )}
              </div>

              {/* Section 3: Bait Abundance & Size Profile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5">
                    Bait Activity / Abundance
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {BAIT_ABUNDANCE_OPTIONS.map(ab => (
                      <button
                        key={ab}
                        type="button"
                        onClick={() => setBaitAbundance(ab)}
                        className={`p-2 rounded-lg text-center font-bold text-[11px] border transition min-h-[40px] flex items-center justify-center cursor-pointer ${
                          baitAbundance === ab
                            ? 'bg-[#84CC16] text-slate-950 border-lime-300 font-black'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {ab}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5">
                    Bait Size Class
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {BAIT_SIZE_OPTIONS.map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setBaitSize(sz)}
                        className={`p-2 rounded-lg text-center font-bold text-[11px] border transition min-h-[40px] flex items-center justify-center cursor-pointer ${
                          baitSize === sz
                            ? 'bg-sky-500 text-slate-950 border-sky-300 font-black'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Estimated Count Caught / Seen */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-slate-400 mb-1">
                  Estimated Quantity in Livewell / In Area
                </label>
                <input
                  type="text"
                  value={baitQuantityEstimate}
                  onChange={(e) => setBaitQuantityEstimate(e.target.value)}
                  placeholder="e.g. 25-30 live tanked"
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:border-lime-500 outline-none"
                />
              </div>
            </>
          )}

          {/* ================= COMMON WATER HABITAT & DEPTH ================= */}
          {/* Water Depth Slider & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5 font-mono">
              <span className="text-xs uppercase font-bold text-slate-300 flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5 text-[#F97316]" />
                Water Depth: <span className="text-[#F97316] font-extrabold text-sm sm:text-base">{waterDepth} ft</span>
              </span>
              <div className="flex gap-1">
                {[6, 15, 28, 42, 60].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWaterDepth(d)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 cursor-pointer"
                  >
                    {d}ft
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={waterDepth}
              onChange={(e) => setWaterDepth(parseInt(e.target.value, 10))}
              className="w-full accent-[#F97316] h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Current & Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5">
                Local River Current
              </label>
              <div className="grid grid-cols-3 gap-1">
                {CURRENT_OPTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrent(c)}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition min-h-[40px] flex items-center justify-center cursor-pointer ${
                      current === c
                        ? 'bg-blue-600 text-white border-blue-400 font-black'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5">
                Bottom Structure / Habitat
              </label>
              <div className="grid grid-cols-2 gap-1">
                {STRUCTURE_OPTIONS.map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStructure(st)}
                    className={`p-2 rounded-lg text-center font-bold text-[11px] border transition min-h-[40px] flex items-center justify-center cursor-pointer ${
                      structure === st
                        ? 'bg-[#F97316] text-white border-orange-400 font-black'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Water Clarity */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-1.5">
              Water Clarity
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CLARITY_OPTIONS.map(cl => (
                <button
                  key={cl}
                  type="button"
                  onClick={() => setClarity(cl)}
                  className={`p-2 rounded-lg text-center font-bold text-xs border transition cursor-pointer ${
                    clarity === cl
                      ? 'bg-teal-600 text-white border-teal-400 font-black'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cl}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Attachment with Client-Side Compression (<500KB) */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Trophy Fish Photo (Optional)</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-mono font-bold flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-amber-400" />
                <span>Auto-Compressed &lt;500KB for Offline DB</span>
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              ref={photoInputRef}
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {isCompressingPhoto ? (
              <div className="rounded-xl border border-amber-500/40 bg-slate-950 p-4 flex items-center justify-center gap-2.5 text-amber-300 font-mono text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Compressing photo to &lt;500KB for offline storage...</span>
              </div>
            ) : photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-amber-500/50 bg-slate-950 p-2.5 flex flex-col gap-2">
                {/* Full Uncropped Photo Container */}
                <div className="relative w-full h-52 sm:h-60 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-center overflow-hidden">
                  {/* Subtle ambient blur in letterbox areas */}
                  <img
                    src={photoUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md brightness-30 scale-110 pointer-events-none"
                    style={{ transform: `rotate(${photoRotation}deg)` }}
                  />
                  {/* Distortion-free uncropped photo */}
                  <img
                    src={photoUrl}
                    alt="Fish Preview"
                    style={{ transform: `rotate(${photoRotation}deg)` }}
                    className="relative z-10 max-w-full max-h-full object-contain transition-transform duration-200"
                  />
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-slate-950/85 border border-emerald-500/50 text-[10px] font-mono text-emerald-300 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Full Photo Fit</span>
                  </div>
                  {photoSizeDisplay && (
                    <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[10px] font-mono text-slate-300 font-bold">
                      {photoSizeDisplay}
                    </div>
                  )}
                </div>

                {/* Quick Actions: Rotate 90° & Replace & Remove */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPhotoRotation((prev) => (prev + 90) % 360)}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (photoInputRef.current) {
                          photoInputRef.current.value = '';
                          photoInputRef.current.click();
                        }
                      }}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Replace</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl('');
                      setPhotoBlob(null);
                      setPhotoSizeDisplay('');
                      setPhotoRotation(0);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 text-xs font-mono font-bold border border-slate-700 transition cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (photoInputRef.current) {
                    photoInputRef.current.value = '';
                    photoInputRef.current.click();
                  }
                }}
                className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-dashed border-slate-700 hover:border-amber-500/60 text-slate-300 font-mono text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Snap Camera Photo or Upload from Gallery</span>
              </button>
            )}
          </div>

          {/* Field Notes */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold text-slate-400 mb-1">
              Field Notes / Tactical Recon Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={logType === 'bait' ? 'e.g. Sabiki jigs on 1/4oz sinker near dam boil eddy. Hit within 5 feet of surface.' : 'e.g. Hit instantly on the current seam edge near timber. Heavy head thumps.'}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-orange-500 outline-none resize-none"
            />
          </div>

        </div>

        {/* Modal Actions Footer */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-700 flex flex-col sm:flex-row gap-2 items-center justify-between sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs sm:text-sm font-mono transition flex items-center justify-center gap-1.5 min-h-[48px] cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>⚡ Quick Pin & Edit Later</span>
          </button>

          <button
            type="button"
            id="save-full-catch-log-btn"
            onClick={() => handleSave(false)}
            className={`w-full sm:flex-1 px-6 py-3 rounded-xl font-black text-sm sm:text-base font-mono uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 min-h-[48px] cursor-pointer ${
              logType === 'bait'
                ? 'bg-[#84CC16] hover:bg-lime-400 text-slate-950 border border-lime-300'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-orange-400/50'
            }`}
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{logType === 'bait' ? 'SAVE BAIT SPOT LOG' : 'SAVE FULL CATCH LOG'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

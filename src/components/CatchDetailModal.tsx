import React, { useState, useRef } from 'react';
import {
  X,
  MapPin,
  Gauge,
  Moon,
  Trash2,
  Edit2,
  Navigation,
  Check,
  Flame,
  Award,
  Camera,
  Plus,
  Crosshair,
  Loader2,
  CheckCircle2,
  Lock,
  RotateCw,
  Upload,
  Fish,
  Sliders,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  CatchLog,
  FishingMode,
  SpeciesCategory,
  BaitRigType,
  UnifiedPresentation,
  BaitCollectionMethod,
  CurrentCondition,
  BottomStructure,
  WaterClarity,
} from '../types';
import { getSafeCurrentPosition } from '../utils/geolocation';
import { isBaitSpecies } from '../utils/storage';
import { compressImageUnder500KB } from '../utils/imageCompressor';

interface CatchDetailModalProps {
  catchLog: CatchLog | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CatchLog>, photoBlob?: Blob | null) => void;
  onCenterOnMap: (lat: number, lon: number) => void;
  onOpenTrophyCard?: (catchLog: CatchLog) => void;
  onLogAnother?: (catchLog: CatchLog) => void;
}

const CATFISH_SPECIES: SpeciesCategory[] = [
  'Blue Catfish',
  'Flathead Catfish',
  'Channel Catfish',
  'Bullhead',
  'Freshwater Drum',
  'Gar',
  'Other',
];

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

function toLocalDateTimeInputValue(ts: number): string {
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export const CatchDetailModal: React.FC<CatchDetailModalProps> = ({
  catchLog,
  onClose,
  onDelete,
  onUpdate,
  onCenterOnMap,
  onOpenTrophyCard,
  onLogAnother,
}) => {
  // Per-section edit toggles
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isEditingTactics, setIsEditingTactics] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingCoords, setIsEditingCoords] = useState(false);

  // Fish Identity, Measurements, Mode & Date/Time state
  const [editSpecies, setEditSpecies] = useState<SpeciesCategory>(catchLog?.species || 'Blue Catfish');
  const [showBaitSpeciesPicker, setShowBaitSpeciesPicker] = useState(false);
  const [editMode, setEditMode] = useState<FishingMode>(catchLog?.mode || 'boat');
  const [editDateTime, setEditDateTime] = useState<string>(
    catchLog ? toLocalDateTimeInputValue(catchLog.timestamp) : ''
  );
  const [editWeight, setEditWeight] = useState(catchLog?.weightLbs != null ? String(catchLog.weightLbs) : '');
  const [editLength, setEditLength] = useState(catchLog?.lengthInches != null ? String(catchLog.lengthInches) : '');

  // Tactical Setup state
  const [editBaitRig, setEditBaitRig] = useState<string>(catchLog?.baitRig || 'Cut Skipjack Head');
  const [editCustomBait, setEditCustomBait] = useState<string>('');
  const [editPresentation, setEditPresentation] = useState<string>(catchLog?.presentation || 'Santee Cooper Rig');
  const [editDepth, setEditDepth] = useState<string>(catchLog?.waterDepthFeet != null ? String(catchLog.waterDepthFeet) : '20');
  const [editCurrent, setEditCurrent] = useState<CurrentCondition>(catchLog?.current || 'Moderate');
  const [editStructure, setEditStructure] = useState<BottomStructure>(catchLog?.bottomStructure || 'Ledge / Channel Edge');
  const [editClarity, setEditClarity] = useState<WaterClarity>(catchLog?.waterClarity || 'Muddy');

  // Field Notes state
  const [editNotes, setEditNotes] = useState(catchLog?.notes || '');

  // Coordinate adjustment state
  const [editLat, setEditLat] = useState<number>(catchLog?.lat ?? 0);
  const [editLon, setEditLon] = useState<number>(catchLog?.lon ?? 0);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // Photo state
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string | undefined>(catchLog?.photoUrl);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Feedback & Delete confirmation
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const showToastMessage = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const syncFormFieldsFromCatch = (log: CatchLog) => {
    setEditSpecies(log.species);
    setShowBaitSpeciesPicker(BAIT_SPECIES.includes(log.species));
    setEditMode(log.mode);
    setEditDateTime(toLocalDateTimeInputValue(log.timestamp));
    setEditWeight(log.weightLbs != null ? String(log.weightLbs) : '');
    setEditLength(log.lengthInches != null ? String(log.lengthInches) : '');

    const isPresetBait = CATFISH_BAIT_OPTIONS.includes(log.baitRig as BaitRigType) && log.baitRig !== 'Custom';
    if (isPresetBait) {
      setEditBaitRig(log.baitRig);
      setEditCustomBait('');
    } else if (log.baitRig) {
      setEditBaitRig('Custom');
      setEditCustomBait(log.baitRig);
    } else {
      setEditBaitRig('Cut Skipjack Head');
      setEditCustomBait('');
    }

    setEditPresentation(log.presentation || 'Santee Cooper Rig');
    setEditDepth(log.waterDepthFeet != null ? String(log.waterDepthFeet) : '20');
    setEditCurrent(log.current || 'Moderate');
    setEditStructure(log.bottomStructure || 'Ledge / Channel Edge');
    setEditClarity(log.waterClarity || 'Muddy');
    setEditNotes(log.notes || '');
    setEditLat(log.lat);
    setEditLon(log.lon);
  };

  React.useEffect(() => {
    if (catchLog) {
      setIsEditingIdentity(false);
      setIsEditingTactics(false);
      setIsEditingNotes(false);
      setIsEditingCoords(false);
      setConfirmRemovePhoto(false);
      setShowConfirmDelete(false);
      setSaveToast(null);
      syncFormFieldsFromCatch(catchLog);
      setDisplayPhotoUrl(catchLog.photoUrl);

      // Proactively resolve the best fresh photo URL from IndexedDB or server backup ONLY if this catch has a photo
      const hasPhoto = Boolean(catchLog.photoUrl || catchLog.photoBlobId);
      if (hasPhoto) {
        import('../utils/indexedDb').then(({ resolvePhotoBlobUrl }) => {
          resolvePhotoBlobUrl(catchLog.id).then((freshUrl) => {
            if (freshUrl) {
              setDisplayPhotoUrl(freshUrl);
              if (catchLog.photoUrl !== freshUrl) {
                onUpdate(catchLog.id, { photoUrl: freshUrl });
              }
            }
          });
        });
      }
    }
  }, [catchLog?.id]);

  if (!catchLog) return null;

  const env = catchLog.environmentalSnapshot;
  const isBait = catchLog.isBait;

  const openIdentityEditor = () => {
    setEditSpecies(catchLog.species);
    setShowBaitSpeciesPicker(BAIT_SPECIES.includes(catchLog.species));
    setEditMode(catchLog.mode);
    setEditDateTime(toLocalDateTimeInputValue(catchLog.timestamp));
    setEditWeight(catchLog.weightLbs != null ? String(catchLog.weightLbs) : '');
    setEditLength(catchLog.lengthInches != null ? String(catchLog.lengthInches) : '');
    setIsEditingIdentity(true);
  };

  const handleSaveIdentity = () => {
    const parsedTs = editDateTime ? new Date(editDateTime).getTime() : catchLog.timestamp;
    const validTs = !isNaN(parsedTs) ? parsedTs : catchLog.timestamp;
    const parsedWeight = editWeight.trim() !== '' ? parseFloat(editWeight) : undefined;
    const parsedLength = editLength.trim() !== '' ? parseFloat(editLength) : undefined;

    onUpdate(catchLog.id, {
      species: editSpecies,
      isBait: isBaitSpecies(editSpecies),
      mode: editMode,
      timestamp: validTs,
      weightLbs: parsedWeight !== undefined && !isNaN(parsedWeight) ? parsedWeight : undefined,
      lengthInches: parsedLength !== undefined && !isNaN(parsedLength) ? parsedLength : undefined,
    });
    setIsEditingIdentity(false);
    showToastMessage('Fish identity & details updated');
  };

  const openTacticsEditor = () => {
    const isPresetBait = CATFISH_BAIT_OPTIONS.includes(catchLog.baitRig as BaitRigType) && catchLog.baitRig !== 'Custom';
    if (isPresetBait) {
      setEditBaitRig(catchLog.baitRig);
      setEditCustomBait('');
    } else if (catchLog.baitRig) {
      setEditBaitRig('Custom');
      setEditCustomBait(catchLog.baitRig);
    } else {
      setEditBaitRig('Cut Skipjack Head');
      setEditCustomBait('');
    }
    setEditPresentation(catchLog.presentation || 'Santee Cooper Rig');
    setEditDepth(catchLog.waterDepthFeet != null ? String(catchLog.waterDepthFeet) : '20');
    setEditCurrent(catchLog.current || 'Moderate');
    setEditStructure(catchLog.bottomStructure || 'Ledge / Channel Edge');
    setEditClarity(catchLog.waterClarity || 'Muddy');
    setIsEditingTactics(true);
  };

  const handleSaveTactics = () => {
    const finalBait =
      editBaitRig === 'Custom'
        ? editCustomBait.trim() || catchLog.baitRig || 'Custom Bait'
        : editBaitRig;
    const parsedDepth = parseFloat(editDepth);

    onUpdate(catchLog.id, {
      baitRig: finalBait,
      presentation: editPresentation.trim() || catchLog.presentation,
      waterDepthFeet: !isNaN(parsedDepth) && parsedDepth >= 0 ? parsedDepth : catchLog.waterDepthFeet,
      current: editCurrent,
      bottomStructure: editStructure,
      waterClarity: editClarity,
    });
    setIsEditingTactics(false);
    showToastMessage('Tactical setup updated');
  };

  const openNotesEditor = () => {
    setEditNotes(catchLog.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    onUpdate(catchLog.id, {
      notes: editNotes.trim(),
    });
    setIsEditingNotes(false);
    showToastMessage('Field notes saved');
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const compressed = await compressImageUnder500KB(file);
      setDisplayPhotoUrl(compressed.dataUrl);
      setConfirmRemovePhoto(false);
      onUpdate(
        catchLog.id,
        {
          photoUrl: compressed.dataUrl,
          photoRotation: 0,
          photoSizeBytes: compressed.sizeBytes,
        },
        compressed.blob
      );
      showToastMessage('Catch photo updated');
    } catch (err) {
      console.error('Failed to process replacement photo:', err);
    } finally {
      setIsProcessingPhoto(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleRotatePhoto = () => {
    const nextRotation = ((catchLog.photoRotation || 0) + 90) % 360;
    onUpdate(catchLog.id, { photoRotation: nextRotation });
    showToastMessage(`Photo rotated to ${nextRotation}°`);
  };

  const handleRemovePhoto = () => {
    setDisplayPhotoUrl(undefined);
    setConfirmRemovePhoto(false);
    onUpdate(
      catchLog.id,
      {
        photoUrl: '',
        photoBlobId: undefined,
        photoSizeBytes: undefined,
        photoRotation: 0,
      },
      null
    );
    showToastMessage('Photo removed from catch log');
  };

  const handleSnapLiveGps = async () => {
    setIsLocatingGps(true);
    try {
      const coords = await getSafeCurrentPosition();
      setEditLat(coords.lat);
      setEditLon(coords.lon);
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleSaveCoords = () => {
    if (isNaN(editLat) || isNaN(editLon)) return;
    onUpdate(catchLog.id, {
      lat: editLat,
      lon: editLon,
    });
    setIsEditingCoords(false);
    showToastMessage('GPS coordinates updated & map pin repositioned');
  };

  const presentationOptions = isBait
    ? [...BAIT_METHODS, ...UNIFIED_CATFISH_PRESENTATIONS]
    : UNIFIED_CATFISH_PRESENTATIONS;

  return (
    <div
      id="catch-detail-modal"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-150 z-[2001]">
        {/* Hidden Photo File Input */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoFileSelected}
          className="hidden"
        />

        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isBait
                  ? 'bg-lime-500/20 text-lime-400 border-lime-500/40'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
              }`}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base sm:text-lg text-white uppercase tracking-wider font-mono truncate">
                  {catchLog.species}
                </h2>
                {catchLog.weightLbs != null && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-slate-950">
                    {catchLog.weightLbs} lbs
                  </span>
                )}
                {catchLog.lengthInches != null && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                    {catchLog.lengthInches}&quot;
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono text-slate-400 mt-1">
                <span>
                  {new Date(catchLog.timestamp).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span>•</span>
                <span>
                  {new Date(catchLog.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">
                  {catchLog.mode}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    catchLog.isSynced
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                  }`}
                >
                  {catchLog.isSynced ? '☁️ Synced' : '⚡ Local'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => (isEditingIdentity ? setIsEditingIdentity(false) : openIdentityEditor())}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer border ${
                isEditingIdentity
                  ? 'bg-orange-500 text-slate-950 border-orange-400'
                  : 'bg-slate-800 text-orange-400 hover:bg-slate-700 border-slate-700'
              }`}
              title="Edit species, weight, length, mode, or date/time"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{isEditingIdentity ? 'Close' : 'Edit'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          {/* Unified Save Confirmation Toast */}
          {saveToast && (
            <div className="flex items-center gap-2 text-emerald-300 text-xs bg-emerald-950/80 px-3 py-2 rounded-xl border border-emerald-500/50 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-bold">{saveToast}</span>
            </div>
          )}

          {/* Section 1: Inline Fish Identity, Size, Mode & Date/Time Editor */}
          {isEditingIdentity && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-orange-500/50 space-y-3 animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-orange-400 font-bold text-xs uppercase flex items-center gap-1.5">
                  <Fish className="w-4 h-4" />
                  Edit Fish Identity, Size &amp; Time
                </span>
                <button
                  type="button"
                  onClick={() => setShowBaitSpeciesPicker(!showBaitSpeciesPicker)}
                  className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                >
                  {showBaitSpeciesPicker ? 'Hide Bait Species' : 'Show Bait Species'}
                </button>
              </div>

              {/* Species Quick-Select Chips */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-bold block">
                  Species
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATFISH_SPECIES.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setEditSpecies(sp)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        editSpecies === sp
                          ? 'bg-orange-500 text-slate-950 border-orange-400 shadow'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
                {showBaitSpeciesPicker && (
                  <div className="pt-1.5 space-y-1">
                    <span className="text-[10px] text-lime-400 uppercase font-bold block">
                      Bait &amp; Forage Species
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {BAIT_SPECIES.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => setEditSpecies(sp)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            editSpecies === sp
                              ? 'bg-lime-500 text-slate-950 border-lime-400 shadow'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {sp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Weight & Length */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 24.5"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Length (inches)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 36"
                    value={editLength}
                    onChange={(e) => setEditLength(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* Fishing Mode & Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Fishing Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['boat', 'bank'] as FishingMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setEditMode(m)}
                        className={`py-2 rounded-lg text-xs font-bold uppercase border transition cursor-pointer ${
                          editMode === m
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Catch Date &amp; Time</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime}
                    onChange={(e) => setEditDateTime(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingIdentity(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveIdentity}
                  className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Save Identity</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Catch Photo & Trophy Card */}
          {displayPhotoUrl ? (
            <div className="space-y-2">
              <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-slate-950 flex items-center justify-center">
                {/* Ambient blurred backdrop for letterbox framing */}
                <img
                  src={displayPhotoUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-md brightness-30 scale-110 pointer-events-none"
                  style={{ transform: `rotate(${catchLog.photoRotation || 0}deg)` }}
                />
                <img
                  src={displayPhotoUrl}
                  alt="Catch Photo"
                  className="relative z-10 max-w-full max-h-full object-contain"
                  style={{ transform: `rotate(${catchLog.photoRotation || 0}deg)` }}
                  referrerPolicy="no-referrer"
                  onError={async () => {
                    try {
                      const { resolvePhotoBlobUrl } = await import('../utils/indexedDb');
                      const freshUrl = await resolvePhotoBlobUrl(catchLog.id);
                      if (freshUrl && displayPhotoUrl !== freshUrl) {
                        setDisplayPhotoUrl(freshUrl);
                        onUpdate(catchLog.id, { photoUrl: freshUrl });
                      }
                    } catch (e) {
                      console.warn('Auto-repair catch photo failed:', e);
                    }
                  }}
                />

                {/* Top-right Photo Quick Edit Controls */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRotatePhoto}
                    className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur-sm transition cursor-pointer"
                    title="Rotate photo 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="px-2 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-800 text-amber-300 border border-slate-700 backdrop-blur-sm transition flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer"
                    title="Replace catch photo"
                  >
                    {isProcessingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>Replace</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemovePhoto(true)}
                    className="p-1.5 rounded-lg bg-slate-950/85 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 backdrop-blur-sm transition cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3 justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase font-mono">
                      ★ Official Catch Photo
                    </span>
                  </div>
                  {onOpenTrophyCard && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTrophyCard(catchLog);
                        onClose();
                      }}
                      className="pointer-events-auto px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Open Baseball Card Studio</span>
                    </button>
                  )}
                </div>
              </div>

              {confirmRemovePhoto && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-rose-950/70 border border-rose-600/60 text-xs">
                  <span className="text-rose-200 font-bold">Remove this catch photo?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmRemovePhoto(false)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block font-mono">
                    Catch Photo &amp; Baseball Card
                  </span>
                  <span className="text-[10px] text-slate-400 block font-sans">
                    Attach a photo anytime or open the Trophy Card Studio
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isProcessingPhoto}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessingPhoto ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isProcessingPhoto ? 'Adding...' : 'Add Photo'}</span>
                </button>
                {onOpenTrophyCard && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTrophyCard(catchLog);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Studio</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Tactical Setup (Bait, Presentation, Depth, Current, Structure, Clarity) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5 text-sky-400 text-[11px] uppercase font-bold">
                <Sliders className="w-3.5 h-3.5" />
                Tactical Setup &amp; River Conditions
              </span>
              <button
                type="button"
                onClick={() => (isEditingTactics ? setIsEditingTactics(false) : openTacticsEditor())}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  isEditingTactics
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-800 text-orange-400 hover:bg-slate-700'
                }`}
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingTactics ? 'Close' : 'Edit'}</span>
              </button>
            </div>

            {isEditingTactics ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                {/* Bait / Rig */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block">
                    Bait / Rig
                  </label>
                  <select
                    value={editBaitRig}
                    onChange={(e) => setEditBaitRig(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none text-xs"
                  >
                    {CATFISH_BAIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {editBaitRig === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom bait or rig..."
                      value={editCustomBait}
                      onChange={(e) => setEditCustomBait(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-orange-500/60 rounded-lg text-white focus:border-orange-500 outline-none text-xs"
                    />
                  )}
                </div>

                {/* Presentation & Depth */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Presentation
                    </label>
                    <select
                      value={
                        presentationOptions.includes(editPresentation as any)
                          ? editPresentation
                          : '__custom__'
                      }
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') {
                          setEditPresentation(e.target.value);
                        }
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none text-xs"
                    >
                      {!presentationOptions.includes(editPresentation as any) && (
                        <option value="__custom__">{editPresentation}</option>
                      )}
                      {presentationOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                      Water Depth (ft)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      value={editDepth}
                      onChange={(e) => setEditDepth(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-orange-500 outline-none text-xs"
                    />
                  </div>
                </div>

                {/* River Current */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block">
                    River Current
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CURRENT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditCurrent(opt)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          editCurrent === opt
                            ? 'bg-blue-500 text-slate-950 border-blue-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Structure */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block">
                    Bottom Structure
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {STRUCTURE_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditStructure(opt)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          editStructure === opt
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Water Clarity */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold block">
                    Water Clarity
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CLARITY_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditClarity(opt)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          editClarity === opt
                            ? 'bg-teal-500 text-slate-950 border-teal-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingTactics(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTactics}
                    className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Setup</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Bait / Rig
                  </span>
                  <span className="font-bold text-sky-400 text-sm">{catchLog.baitRig}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Presentation
                  </span>
                  <span className="font-bold text-amber-400 text-sm">{catchLog.presentation}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Water Depth
                  </span>
                  <span className="font-bold text-orange-400 text-sm">{catchLog.waterDepthFeet} ft</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    River Current
                  </span>
                  <span className="font-bold text-blue-400">{catchLog.current}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Structure
                  </span>
                  <span className="font-bold text-emerald-400">{catchLog.bottomStructure}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">
                    Water Clarity
                  </span>
                  <span className="font-bold text-teal-400">{catchLog.waterClarity}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Moment-of-Catch Environmental Snapshot (LOCKED) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5 text-slate-400 text-[11px] uppercase font-bold">
              <span className="flex items-center gap-1.5 text-orange-400">
                <Gauge className="w-3.5 h-3.5" />
                Moment-of-Catch Environmental Snapshot
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0"
                title="Historical weather & river gauge snapshot is locked to preserve accuracy"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>{env?.isOfflineQueued ? 'Offline Est.' : 'Locked'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Barometer</span>
                <span className="font-bold text-white text-sm">
                  {env?.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.95 inHg'}
                </span>
                <span className="text-[10px] text-slate-400 block capitalize">
                  {env?.pressureTrend ?? 'steady'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Air Temp / Wind</span>
                <span className="font-bold text-white text-sm">{env?.airTempF ?? 75}°F</span>
                <span className="text-[10px] text-slate-400 block">
                  {env?.windSpeedMph ?? 6}mph {env?.windDirectionCompass ?? 'S'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">River Flow</span>
                <span className="font-bold text-sky-400 text-sm">
                  {env?.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'N/A'}
                </span>
                {env?.usgsStageFt && (
                  <span className="text-[10px] text-slate-400 block">{env.usgsStageFt} ft stage</span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Solunar Rating</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  {env?.solunarRating === 'Major' ? (
                    <Flame className="w-3 h-3 text-orange-400" />
                  ) : (
                    <Moon className="w-3 h-3 text-slate-400" />
                  )}
                  {env?.solunarRating ?? 'Normal'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {env?.moonPhaseName ?? 'Gibbous'}
                </span>
              </div>
            </div>

            {env?.usgsSiteName && (
              <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/40">
                Gage: {env.usgsSiteName}
              </div>
            )}
          </div>

          {/* Section 5: Field Notes */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-300 uppercase font-bold">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Field Notes
              </span>
              <button
                type="button"
                onClick={() => (isEditingNotes ? setIsEditingNotes(false) : openNotesEditor())}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  isEditingNotes
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-800 text-orange-400 hover:bg-slate-700'
                }`}
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingNotes ? 'Close' : catchLog.notes ? 'Edit' : 'Add Note'}</span>
              </button>
            </div>

            {isEditingNotes ? (
              <div className="space-y-2 animate-in fade-in duration-150">
                <textarea
                  rows={3}
                  placeholder="Add river observations, hook size, bite pattern, or sonar notes..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-sans text-xs resize-none focus:border-orange-500 outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Notes</span>
                  </button>
                </div>
              </div>
            ) : catchLog.notes ? (
              <p className="text-xs leading-relaxed font-sans text-slate-300 whitespace-pre-wrap">
                {catchLog.notes}
              </p>
            ) : (
              <p className="text-xs font-sans text-slate-500 italic">
                No field notes recorded yet. Tap Add Note to jot down bite details.
              </p>
            )}
          </div>

          {/* Section 6: GPS Coordinates Bar & Inline Editor */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="font-mono truncate">
                Map Waypoint:{' '}
                <span className="text-white font-bold">
                  {catchLog.lat.toFixed(6)}°, {catchLog.lon.toFixed(6)}°
                </span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (!isEditingCoords) {
                      setEditLat(catchLog.lat);
                      setEditLon(catchLog.lon);
                    }
                    setIsEditingCoords(!isEditingCoords);
                  }}
                  className={`flex items-center gap-1 font-bold px-2 py-1 rounded-lg text-xs transition cursor-pointer ${
                    isEditingCoords
                      ? 'bg-orange-500 text-slate-950'
                      : 'bg-slate-800 text-orange-400 hover:text-orange-300'
                  }`}
                  title="Adjust or fix coordinates for this catch"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isEditingCoords ? 'Close' : 'Adjust Location'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCenterOnMap(catchLog.lat, catchLog.lon);
                    onClose();
                  }}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-bold cursor-pointer transition active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>Center on Map</span>
                </button>

                {onLogAnother && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogAnother(catchLog);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold pl-2 border-l border-slate-800 cursor-pointer transition active:scale-95"
                    title="Log another fish at these exact coordinates"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Log Another Here</span>
                  </button>
                )}
              </div>
            </div>

            {/* Inline Coordinate Correction Panel */}
            {isEditingCoords && (
              <div className="p-3 bg-slate-900 border border-orange-500/50 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between text-xs text-orange-400 font-bold uppercase">
                  <span>Correct Map Coordinates</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    Preserves locked telemetry &amp; date/time
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLat}
                      onChange={(e) => setEditLat(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono focus:border-orange-500 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={editLon}
                      onChange={(e) => setEditLon(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono focus:border-orange-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSnapLiveGps}
                    disabled={isLocatingGps}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950 text-sky-300 border border-sky-600/60 hover:bg-sky-900 text-xs font-bold transition cursor-pointer"
                  >
                    {isLocatingGps ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" />
                    )}
                    <span>{isLocatingGps ? 'Locking Satellite GPS...' : 'Snap to Current GPS Fix'}</span>
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditingCoords(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCoords}
                      className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Save &amp; Reposition Pin</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
          {showConfirmDelete ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 w-full bg-rose-950/80 border border-rose-600/80 p-2.5 rounded-xl animate-in fade-in duration-100">
              <span className="text-xs text-rose-200 font-bold font-mono">
                Permanently delete this catch record?
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(catchLog.id);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-2.5 sm:px-3 py-2 rounded-lg text-rose-400 hover:text-white hover:bg-rose-600 border border-rose-500/30 transition flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer"
                  title="Delete catch"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xs:inline sm:inline">Delete</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end ml-auto">
                {onLogAnother && (
                  <button
                    type="button"
                    onClick={() => {
                      onLogAnother(catchLog);
                      onClose();
                    }}
                    className="px-3 sm:px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
                    title="Log another catch at this exact waypoint with identical telemetry"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Log Another<span className="hidden sm:inline"> Fish Here</span>
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onCenterOnMap(catchLog.lat, catchLog.lon);
                    onClose();
                  }}
                  className="px-3 sm:px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs font-mono uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-950/40 active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    View<span className="hidden sm:inline"> On</span> Map
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

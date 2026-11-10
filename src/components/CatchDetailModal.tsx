import React, { useState } from 'react';
import {
  X,
  MapPin,
  Anchor,
  Compass,
  Gauge,
  Thermometer,
  Wind,
  Waves,
  Moon,
  Trash2,
  Edit2,
  Navigation,
  Check,
  Flame,
  Zap,
  Calendar,
  Layers,
  ArrowDown,
  Award,
  Camera,
  Share2,
  Plus,
  Crosshair,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { CatchLog } from '../types';
import { getSafeCurrentPosition } from '../utils/geolocation';

interface CatchDetailModalProps {
  catchLog: CatchLog | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CatchLog>) => void;
  onCenterOnMap: (lat: number, lon: number) => void;
  onOpenTrophyCard?: (catchLog: CatchLog) => void;
  onLogAnother?: (catchLog: CatchLog) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [weight, setWeight] = useState(catchLog?.weightLbs ? String(catchLog.weightLbs) : '');
  const [length, setLength] = useState(catchLog?.lengthInches ? String(catchLog.lengthInches) : '');
  const [notes, setNotes] = useState(catchLog?.notes || '');
  const [depth, setDepth] = useState(catchLog?.waterDepthFeet || 20);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Coordinate adjustment state
  const [isEditingCoords, setIsEditingCoords] = useState(false);
  const [editLat, setEditLat] = useState<number>(catchLog?.lat ?? 0);
  const [editLon, setEditLon] = useState<number>(catchLog?.lon ?? 0);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [coordSaveSuccess, setCoordSaveSuccess] = useState(false);

  // Local auto-healing photo URL state
  const [displayPhotoUrl, setDisplayPhotoUrl] = useState<string | undefined>(catchLog?.photoUrl);

  React.useEffect(() => {
    if (catchLog) {
      setIsEditing(false);
      setIsEditingCoords(false);
      setWeight(catchLog.weightLbs ? String(catchLog.weightLbs) : '');
      setLength(catchLog.lengthInches ? String(catchLog.lengthInches) : '');
      setNotes(catchLog.notes || '');
      setDepth(catchLog.waterDepthFeet || 20);
      setEditLat(catchLog.lat);
      setEditLon(catchLog.lon);
      setShowConfirmDelete(false);
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

  const handleSaveEdits = () => {
    onUpdate(catchLog.id, {
      weightLbs: weight ? parseFloat(weight) : undefined,
      lengthInches: length ? parseFloat(length) : undefined,
      waterDepthFeet: depth,
      notes: notes.trim(),
    });
    setIsEditing(false);
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
    setCoordSaveSuccess(true);
    setTimeout(() => setCoordSaveSuccess(false), 3500);
  };

  return (
    <div
      id="catch-detail-modal"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-150 z-[2001]">
        
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isBait 
                ? 'bg-lime-500/20 text-lime-400 border-lime-500/40' 
                : 'bg-orange-500/20 text-orange-400 border-orange-500/40'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-lg text-white uppercase tracking-wider font-mono">
                  {catchLog.species}
                </h2>
                {catchLog.weightLbs && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-slate-950">
                    {catchLog.weightLbs} lbs
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span>{new Date(catchLog.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span>•</span>
                <span>{new Date(catchLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">
                  {catchLog.mode}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border ${
                    catchLog.isSynced
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                      : 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                  }`}
                >
                  {catchLog.isSynced ? '☁️ Synced to Cloud' : '⚡ Saved Locally (IndexedDB)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          
          {/* Catch Photo & Trophy Card Banner */}
          {displayPhotoUrl ? (
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
              <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3 justify-between">
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
          ) : (
            onOpenTrophyCard && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-950 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-amber-300 block font-mono">Collectible Baseball Card</span>
                    <span className="text-[10px] text-slate-400 block font-sans">Flip 3D card, generate AI quote, and export to socials</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenTrophyCard(catchLog);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <span>Studio</span>
                </button>
              </div>
            )
          )}

          {/* Tactical Catch Specs Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Bait / Rig</span>
              <span className="font-bold text-sky-400 text-sm">{catchLog.baitRig}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Presentation</span>
              <span className="font-bold text-amber-400 text-sm">{catchLog.presentation}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Water Depth</span>
              <span className="font-bold text-orange-400 text-sm">{catchLog.waterDepthFeet} ft</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">River Current</span>
              <span className="font-bold text-blue-400">{catchLog.current}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Structure</span>
              <span className="font-bold text-emerald-400">{catchLog.bottomStructure}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Water Clarity</span>
              <span className="font-bold text-teal-400">{catchLog.waterClarity}</span>
            </div>
          </div>

          {/* Environmental Telemetry Snapshot at Catch Moment */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 text-slate-400 text-[11px] uppercase font-bold">
              <span className="flex items-center gap-1.5 text-orange-400">
                <Gauge className="w-3.5 h-3.5" />
                Moment-of-Catch Environmental Snapshot
              </span>
              <span>{env?.isOfflineQueued ? '⚡ Offline estimate' : '✓ Live API Verified'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Barometer</span>
                <span className="font-bold text-white text-sm">
                  {env?.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.95 inHg'}
                </span>
                <span className="text-[10px] text-slate-400 block capitalize">{env?.pressureTrend ?? 'steady'}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Air Temp / Wind</span>
                <span className="font-bold text-white text-sm">{env?.airTempF ?? 75}°F</span>
                <span className="text-[10px] text-slate-400 block">{env?.windSpeedMph ?? 6}mph {env?.windDirectionCompass ?? 'S'}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">River Flow</span>
                <span className="font-bold text-sky-400 text-sm">
                  {env?.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'N/A'}
                </span>
                {env?.usgsStageFt && <span className="text-[10px] text-slate-400 block">{env.usgsStageFt} ft stage</span>}
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Solunar Rating</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  {env?.solunarRating === 'Major' ? <Flame className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3 text-slate-400" />}
                  {env?.solunarRating ?? 'Normal'}
                </span>
                <span className="text-[10px] text-slate-400 block">{env?.moonPhaseName ?? 'Gibbous'}</span>
              </div>
            </div>

            {env?.usgsSiteName && (
              <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-800/40">
                Gage: {env.usgsSiteName}
              </div>
            )}
          </div>

          {/* Edit Form or Read-Only Specs */}
          {isEditing ? (
            <div className="p-3 rounded-xl bg-slate-950 border border-orange-500/40 space-y-3">
              <span className="text-orange-400 font-bold text-xs uppercase block">Edit Catch Details</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Length (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Depth (ft)</label>
                  <input
                    type="number"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value, 10))}
                    className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="px-4 py-1.5 rounded bg-orange-600 text-white font-bold hover:bg-orange-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div>
              {catchLog.notes && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Field Notes</span>
                  <p className="text-xs leading-relaxed font-sans">{catchLog.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* GPS Coordinates Bar & Quick Action */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="font-mono truncate">
                Map Waypoint: <span className="text-white font-bold">{catchLog.lat.toFixed(6)}°, {catchLog.lon.toFixed(6)}°</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsEditingCoords(!isEditingCoords)}
                  className={`flex items-center gap-1 font-bold px-2 py-1 rounded text-xs transition cursor-pointer ${
                    isEditingCoords
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-800 text-orange-400 hover:text-orange-300'
                  }`}
                  title="Adjust or fix coordinates for this catch"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isEditingCoords ? 'Close Editor' : 'Adjust Location'}</span>
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

            {/* Success Toast */}
            {coordSaveSuccess && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-950/60 p-2 rounded border border-emerald-600/50">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>GPS coordinates updated successfully! Map pin repositioned.</span>
              </div>
            )}

            {/* Inline Coordinate Correction Panel */}
            {isEditingCoords && (
              <div className="p-3 bg-slate-900 border border-orange-500/50 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between text-xs text-orange-400 font-bold uppercase">
                  <span>Correct Map Coordinates</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">Preserves all telemetry &amp; date/time</span>
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
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs"
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
              <span className="text-xs text-rose-200 font-bold font-mono">Permanently delete this catch record?</span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(catchLog.id);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow"
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

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-2.5 sm:px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 text-xs font-mono font-bold cursor-pointer"
                    title="Edit catch"
                  >
                    <Edit2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden xs:inline sm:inline">Edit</span>
                  </button>
                )}
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
                    <span>Log Another<span className="hidden sm:inline"> Fish Here</span></span>
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
                  <span>View<span className="hidden sm:inline"> On</span> Map</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

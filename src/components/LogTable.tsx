import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  Download,
  Search,
  ArrowUpDown,
  Navigation,
  ChevronRight,
  ChevronLeft,
  Fish,
  Scale,
  Ruler,
  Waves,
  Gauge,
  Sparkles,
  Trash2,
  AlertTriangle,
  Award,
  Plus,
  Anchor,
  Sliders,
  Layers,
  Thermometer,
  RotateCw,
  MapPin,
  Eye,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CatchLog } from '../types';
import { exportCatchesToCsv, exportCatchesToJson } from '../utils/storage';
import { resolvePhotoBlobUrl } from '../utils/indexedDb';

interface LogTableProps {
  catches: CatchLog[];
  onSelectCatch: (log: CatchLog) => void;
  onCenterOnMap: (lat: number, lon: number) => void;
  onDeleteCatch: (id: string) => void;
  onOpenTrophyCard?: (log: CatchLog) => void;
  onLogAnother?: (log: CatchLog) => void;
}

// Helper to cleanly extract structured bait info from notes or fields
function parseBaitDetails(log: CatchLog) {
  let method = log.baitRig?.replace(/^Method:\s*/i, '') || 'Gathering';
  let abundance = '';
  let size = '';
  let estCount = '';

  if (log.notes) {
    const match = log.notes.match(/\[Bait Recon:\s*([^|]+)\s*\|\s*Size:\s*([^|]+)\s*\|\s*Est:\s*([^\]]+)\]/i);
    if (match) {
      abundance = match[1].trim();
      size = match[2].trim();
      estCount = match[3].trim();
    }
  }

  if (!abundance && log.presentation) {
    const presMatch = log.presentation.match(/\(([^,]+),\s*([^)]+)\)/);
    if (presMatch) {
      abundance = presMatch[1].trim();
      size = presMatch[2].trim();
    }
  }

  return {
    method,
    abundance: abundance || 'Recorded Spot',
    size: size || 'Standard',
    estCount: estCount && estCount !== 'N/A' ? estCount : undefined,
  };
}

interface DeckCarouselViewProps {
  catches: CatchLog[];
  categoryFilter: 'catfish' | 'bait' | 'all';
  onSelectCatch: (log: CatchLog) => void;
  onCenterOnMap: (lat: number, lon: number) => void;
  onOpenTrophyCard?: (log: CatchLog) => void;
  onClose: () => void;
}

const DeckCarouselView: React.FC<DeckCarouselViewProps> = ({
  catches,
  categoryFilter,
  onSelectCatch,
  onCenterOnMap,
  onOpenTrophyCard,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Cinema Mode: HUD auto-hides after inactivity or toggles on backdrop tap
  const [showHud, setShowHud] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHudTimer = useCallback(() => {
    setShowHud(true);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setShowHud(false);
    }, 3200);
  }, []);

  // Show HUD briefly upon open, then auto-hide
  useEffect(() => {
    resetHudTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetHudTimer]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target?.id === 'deck-showcase-theater-modal' || target?.id === 'deck-stage-wrapper') {
      if (showHud) {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setShowHud(false);
      } else {
        resetHudTimer();
      }
    }
  };

  // Keep index within bounds if filters change
  useEffect(() => {
    if (currentIndex >= catches.length) {
      setCurrentIndex(Math.max(0, catches.length - 1));
    }
  }, [catches.length, currentIndex]);

  const currentCatch = catches[currentIndex];

  // Resolve fresh photo URL from IndexedDB when card changes
  useEffect(() => {
    setIsFlipped(false);
    if (!currentCatch) {
      setPhotoUrl('');
      return;
    }
    const initial = currentCatch.photoUrl || '';
    setPhotoUrl(initial);

    if (currentCatch.id && (currentCatch.photoUrl || currentCatch.photoBlobId)) {
      resolvePhotoBlobUrl(currentCatch.id).then((fresh) => {
        if (fresh) setPhotoUrl(fresh);
      });
    }
  }, [currentCatch?.id, currentCatch?.photoUrl]);

  const goToNext = useCallback(() => {
    if (catches.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % catches.length);
    resetHudTimer();
    try {
      if ('vibrate' in navigator) navigator.vibrate(12);
    } catch {}
  }, [catches.length, resetHudTimer]);

  const goToPrev = useCallback(() => {
    if (catches.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + catches.length) % catches.length);
    resetHudTimer();
    try {
      if ('vibrate' in navigator) navigator.vibrate(12);
    } catch {}
  }, [catches.length, resetHudTimer]);

  // Touch swipe support across entire screen on mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Android hardware back button and escape key handler
  useEffect(() => {
    window.history.pushState({ isDeckFullscreen: true }, '');
    const handlePop = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
    };
  }, [onClose]);

  // Keyboard arrow listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === ' ' || e.key === 'f') {
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  if (!currentCatch || catches.length === 0) {
    return (
      <div className="fixed inset-0 z-[2600] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-slate-100 select-none">
        <div className="p-8 text-center text-slate-400 font-mono text-xs bg-slate-900 rounded-3xl border border-slate-800 max-w-sm">
          <Fish className="w-12 h-12 mx-auto text-amber-500/40 mb-3 animate-pulse" />
          <p className="font-bold text-white text-base">No catches found in current deck filter.</p>
          <p className="text-xs text-slate-500 mt-1">Adjust search or filter tabs to browse cards.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition border border-slate-700 cursor-pointer"
          >
            Back to Logbook
          </button>
        </div>
      </div>
    );
  }

  const env = currentCatch.environmentalSnapshot || {};
  const formattedDate = new Date(currentCatch.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date(currentCatch.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getCardNumber = () => {
    const hash = currentCatch.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `#${(hash % 900 + 100)}`;
  };

  const isBait = currentCatch.isBait;

  return (
    <div
      id="deck-showcase-theater-modal"
      onClick={handleBackdropClick}
      onMouseMove={resetHudTimer}
      className="fixed inset-0 z-[2600] bg-slate-950 flex flex-col items-center justify-center p-1 sm:p-3 text-slate-100 select-none overflow-hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Floating Top-Left Card Studio Button - Auto-hides in Cinema Mode */}
      {onOpenTrophyCard && (
        <button
          type="button"
          onClick={() => onOpenTrophyCard(currentCatch)}
          className={`absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-40 px-3 py-2 rounded-full bg-slate-900/85 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-700/60 shadow-2xl backdrop-blur-md font-mono text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer active:scale-90 ${
            showHud ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          title="Open Card Studio"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Card Studio</span>
        </button>
      )}

      {/* Floating Top Exit Button - Auto-hides in Cinema Mode */}
      <button
        type="button"
        id="exit-deck-theater-btn"
        onClick={onClose}
        className={`absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-40 p-2.5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 shadow-2xl backdrop-blur-md transition-all duration-300 cursor-pointer active:scale-90 ${
          showHud ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        title="Exit 3D Deck"
      >
        <X className="w-5 h-5 text-amber-400" />
      </button>

      {/* Floating Top Center Pill - Auto-hides in Cinema Mode */}
      <div
        className={`absolute top-2.5 sm:top-4 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/60 backdrop-blur-md shadow-2xl flex items-center gap-2 font-mono text-xs pointer-events-none max-w-[70vw] sm:max-w-[50vw] transition-all duration-300 ${
          showHud ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <span className="text-amber-400 font-black">{currentIndex + 1} / {catches.length}</span>
        <span className="text-slate-600">•</span>
        <span className="text-white font-bold uppercase truncate">{currentCatch.species}</span>
        {currentCatch.weightLbs && (
          <>
            <span className="text-slate-600">•</span>
            <span className="text-amber-300 font-semibold">{currentCatch.weightLbs} LBS</span>
          </>
        )}
      </div>

      {/* Floating Left Advance Arrow - Auto-hides in Cinema Mode */}
      {catches.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
            resetHudTimer();
          }}
          aria-label="Previous card"
          className={`absolute left-1.5 sm:left-4 z-40 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-md active:scale-90 -translate-y-1/2 top-1/2 ${
            showHud ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-2 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Floating Right Advance Arrow - Auto-hides in Cinema Mode */}
      {catches.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
            resetHudTimer();
          }}
          aria-label="Next card"
          className={`absolute right-1.5 sm:right-4 z-40 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/30 shadow-2xl transition-all duration-300 cursor-pointer backdrop-blur-md active:scale-90 -translate-y-1/2 top-1/2 ${
            showHud ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-2 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Pure Full-Screen 3D Card Stage */}
      <div
        id="deck-stage-wrapper"
        className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fullscreen 3D Card: Maximum screen coverage */}
        <div
          className="relative h-[86dvh] sm:h-[88dvh] max-h-[820px] aspect-[2.5/3.5] w-auto max-w-[94vw] cursor-pointer select-none group shrink-0"
          style={{ perspective: '1200px' }}
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(!isFlipped);
          }}
        >
          <div
            className="w-full h-full duration-500 transition-transform relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* ================= CARD FRONT ================= */}
            <div
              className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 sm:p-3.5 border-4 shadow-2xl flex flex-col justify-between overflow-hidden bg-slate-950 ${
                isBait
                  ? 'border-lime-500 bg-gradient-to-b from-slate-950 via-slate-900 to-lime-950/40 text-lime-400'
                  : 'border-amber-500 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 text-amber-400'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Top Banner */}
              <div className={`${isBait ? 'bg-lime-600' : 'bg-amber-600'} text-white py-1.5 px-3 rounded-lg border ${isBait ? 'border-lime-300' : 'border-amber-300'} shadow flex items-center ${isBait ? 'justify-between' : 'justify-center'} shrink-0`}>
                <span className="font-black text-xs sm:text-sm font-mono tracking-wider">LEDGEr</span>
                {isBait && <span className="text-[10px] sm:text-xs font-bold font-mono uppercase">BAIT RECON</span>}
              </div>

              {/* Photo Area */}
              <div className={`relative flex-1 my-2 rounded-xl overflow-hidden border-2 ${isBait ? 'border-lime-500/80' : 'border-amber-500/80'} bg-slate-900 flex items-center justify-center group/photo min-h-0`}>
                {photoUrl ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
                    {/* Ambient blurred backdrop for letterbox framing */}
                    <img
                      src={photoUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md brightness-35 scale-125 pointer-events-none"
                    />
                    {/* Sharp distortion-free uncropped photo */}
                    <img
                      src={photoUrl}
                      alt={currentCatch.species}
                      className="relative z-10 max-w-full max-h-full object-contain shadow-2xl transition-all duration-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-4">
                    <Fish className={`w-16 h-16 sm:w-20 sm:h-20 ${isBait ? 'text-lime-500/40' : 'text-amber-500/40'} mb-2 animate-pulse`} />
                    <span className={`font-mono text-xs sm:text-sm font-bold ${isBait ? 'text-lime-300' : 'text-amber-300'}`}>TACTICAL CATCH RECORD</span>
                    <span className="text-[10px] text-slate-400 mt-1">Tap card to see tactical river telemetry</span>
                  </div>
                )}

                {/* Hover overlay hint */}
                <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center text-white text-xs sm:text-sm font-mono font-bold">
                  Tap to flip card ↷
                </div>
              </div>

              {/* Bottom Nameplate */}
              <div className={`bg-slate-900/95 border-2 ${isBait ? 'border-lime-500/80' : 'border-amber-500/80'} rounded-xl p-2.5 sm:p-3 shadow-lg text-center font-mono shrink-0`}>
                <div className="font-black text-sm sm:text-lg text-white tracking-wide uppercase font-sans">
                  {currentCatch.species}
                </div>
                <div className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-black text-xs sm:text-base tracking-wider my-0.5`}>
                  {currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : isBait ? 'FORAGE SPOT' : 'RECORD CATCH'}
                  {currentCatch.lengthInches ? ` • ${currentCatch.lengthInches}"` : ''}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-300 truncate">
                  {currentCatch.baitRig || currentCatch.presentation} • {formattedDate}
                </div>
              </div>
            </div>

            {/* ================= CARD BACK ================= */}
            <div
              className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 sm:p-3.5 border-4 shadow-2xl flex flex-col justify-between overflow-hidden bg-slate-950 ${
                isBait
                  ? 'border-lime-500 bg-gradient-to-b from-slate-950 via-slate-900 to-lime-950/40 text-lime-400'
                  : 'border-amber-500 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 text-amber-400'
              }`}
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Back Header */}
              <div className={`${isBait ? 'bg-lime-600' : 'bg-amber-600'} text-white py-1.5 px-3 rounded-lg border ${isBait ? 'border-lime-300' : 'border-amber-300'} shadow flex items-center justify-between font-mono text-[10px] sm:text-xs shrink-0`}>
                <span className="font-black">LOG {getCardNumber()}</span>
                <span className="font-bold">2026 COLLECTION</span>
              </div>

              {/* Hero Specs Bar */}
              <div className={`my-1.5 sm:my-2 p-2 sm:p-2.5 rounded-lg bg-slate-900 border ${isBait ? 'border-lime-500/50' : 'border-amber-500/50'} flex items-center justify-between shrink-0`}>
                <div>
                  <span className="text-white font-extrabold text-xs sm:text-sm block uppercase font-sans">
                    {currentCatch.species}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] ${isBait ? 'text-lime-400' : 'text-amber-400'} font-mono`}>
                    {formattedDate} • {formattedTime} ({currentCatch.mode.toUpperCase()})
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className={`text-xs sm:text-sm font-black ${isBait ? 'text-lime-300' : 'text-amber-300'} block`}>
                    {currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : isBait ? 'LOGGED' : 'RECORD'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-300">
                    {currentCatch.lengthInches ? `${currentCatch.lengthInches} IN` : 'LENGTH N/A'}
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] sm:text-xs font-mono space-y-1 shrink-0">
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>BAIT / RIG</span>
                  <span className="text-white font-medium truncate max-w-[170px] sm:max-w-[200px]">{currentCatch.baitRig}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>PRESENTATION</span>
                  <span className="text-white font-medium truncate max-w-[170px] sm:max-w-[200px]">{currentCatch.presentation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>WATER DEPTH</span>
                  <span className="text-white font-medium">{currentCatch.waterDepthFeet} FT ({currentCatch.bottomStructure})</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>CURRENT / CLARITY</span>
                  <span className="text-white font-medium">{currentCatch.current} • {currentCatch.waterClarity}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>STREAMFLOW</span>
                  <span className="text-sky-400 font-medium">
                    {env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady flow'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-0.5">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>SOLUNAR FEED</span>
                  <span className="text-amber-300 font-medium">{env.moonPhaseName || 'Gibbous'} ({env.solunarRating || 'Major'})</span>
                </div>
                <div className="flex justify-between">
                  <span className={`${isBait ? 'text-lime-400' : 'text-amber-400'} font-bold`}>BARO / TEMP</span>
                  <span className="text-white font-medium">{env.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.92 inHg'} • {env.airTempF ?? 75}°F</span>
                </div>
              </div>

              {/* Notes */}
              <div className={`my-1.5 p-2 sm:p-2.5 rounded-lg bg-slate-900 border ${isBait ? 'border-lime-500/50' : 'border-amber-500/50'} flex-1 flex flex-col justify-center min-h-0`}>
                <span className={`text-[9px] sm:text-[10px] font-mono font-black ${isBait ? 'text-lime-400' : 'text-amber-400'} uppercase tracking-wider block mb-0.5`}>
                  FIELD NOTES:
                </span>
                <p className="text-[11px] sm:text-xs font-serif italic text-slate-100 leading-snug line-clamp-3">
                  "{currentCatch.notes || `Hooked on ${currentCatch.baitRig} along river ledge during active flow.`}"
                </p>
              </div>

              {/* GPS coordinates */}
              <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-center font-mono text-[9px] sm:text-[10px] text-slate-400 shrink-0">
                <span className="flex items-center justify-center gap-1 text-slate-300">
                  <span className="text-emerald-400">📍</span>
                  <span className={`font-bold ${isBait ? 'text-lime-300' : 'text-amber-300'}`}>HONEY-HOLE:</span>
                  <span>{currentCatch.lat.toFixed(5)}°, {currentCatch.lon.toFixed(5)}°</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Floating Bottom Action Pill - Auto-hides in Cinema Mode */}
      <div
        className={`absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 transition-all duration-300 ${
          showHud ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <button
          type="button"
          id="logbook-deck-flip-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(!isFlipped);
            resetHudTimer();
          }}
          className="px-4 py-2 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 shadow-2xl backdrop-blur-md font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Flip to {isFlipped ? 'Front' : 'Stats'}</span>
        </button>

        {onOpenTrophyCard && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTrophyCard(currentCatch);
            }}
            className="px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/70 shadow-2xl backdrop-blur-md font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Open Card Studio"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Card Studio</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const LogTable: React.FC<LogTableProps> = ({
  catches,
  onSelectCatch,
  onCenterOnMap,
  onDeleteCatch,
  onOpenTrophyCard,
  onLogAnother,
}) => {
  // View mode layout: 'table' vs 'deck' (3D flippable carousel)
  const [viewLayout, setViewLayout] = useState<'table' | 'deck'>('table');

  // Category Segment: 'catfish' (predators) vs 'bait' (forage recon) vs 'all'
  const [categoryFilter, setCategoryFilter] = useState<'catfish' | 'bait' | 'all'>('catfish');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'weight' | 'depth'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [modeFilter, setModeFilter] = useState<'all' | 'boat' | 'bank'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const catfishCount = useMemo(() => catches.filter(c => !c.isBait).length, [catches]);
  const baitCount = useMemo(() => catches.filter(c => c.isBait).length, [catches]);

  const filtered = useMemo(() => {
    return catches.filter(c => {
      // 1. Category segmentation
      if (categoryFilter === 'catfish' && c.isBait) return false;
      if (categoryFilter === 'bait' && !c.isBait) return false;

      // 2. Platform mode filter
      if (modeFilter !== 'all' && c.mode !== modeFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchSp = c.species.toLowerCase().includes(q);
        const matchBait = c.baitRig?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchStruct = c.bottomStructure?.toLowerCase().includes(q);
        const matchPres = c.presentation?.toLowerCase().includes(q);
        if (!matchSp && !matchBait && !matchNotes && !matchStruct && !matchPres) return false;
      }
      return true;
    });
  }, [catches, categoryFilter, modeFilter, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortBy === 'date') {
        diff = a.timestamp - b.timestamp;
      } else if (sortBy === 'weight') {
        diff = (a.weightLbs ?? 0) - (b.weightLbs ?? 0);
      } else if (sortBy === 'depth') {
        diff = a.waterDepthFeet - b.waterDepthFeet;
      }
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortBy, sortAsc]);

  const toggleSort = (type: 'date' | 'weight' | 'depth') => {
    if (sortBy === type) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(type);
      setSortAsc(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteCatch(id);
    setConfirmDeleteId(null);
  };

  return (
    <div id="catch-log-history" className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4 text-slate-100 font-sans pb-16">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Master Logbook &amp; Catch Intel</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-mono">
            Recorded Catches &amp; Telemetry
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            <span className="text-orange-400 font-bold">{catfishCount} Recorded Catches</span> • 100% saved offline on device.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Layout Mode Pill Switch: Table vs 3D Deck */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs shadow-inner">
            <button
              type="button"
              id="logbook-table-view-btn"
              onClick={() => setViewLayout('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewLayout === 'table'
                  ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              id="logbook-deck-view-btn"
              onClick={() => setViewLayout('deck')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                viewLayout === 'deck'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>🎴 3D Deck</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportCatchesToCsv(catches)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-mono font-bold text-xs transition shadow cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportCatchesToJson(catches)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-mono font-bold text-xs transition shadow cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* PRIMARY SEGMENTATION TABS: Catfish Catches vs. Bait Spots vs. All */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setCategoryFilter('catfish');
            if (sortBy === 'weight' && sortAsc) setSortAsc(false);
          }}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            categoryFilter === 'catfish'
              ? 'bg-[#F97316] text-white shadow-lg shadow-orange-950/50 border border-orange-400/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Anchor className="w-4 h-4" />
          <span>CATFISH CATCHES</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            categoryFilter === 'catfish' ? 'bg-slate-950/60 text-white' : 'bg-slate-800 text-orange-400'
          }`}>
            {catfishCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
            categoryFilter === 'all'
              ? 'bg-slate-800 text-sky-300 shadow-md border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ALL RECORDS</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            categoryFilter === 'all' ? 'bg-slate-950 text-sky-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {catches.length}
          </span>
        </button>
      </div>

      {/* Search & Secondary Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-2 justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 font-mono text-xs">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              categoryFilter === 'bait'
                ? 'Search bait species, net method, notes...'
                : categoryFilter === 'catfish'
                ? 'Search catfish species, rig, notes...'
                : 'Search species, bait, notes...'
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-sky-500 outline-none text-xs"
          />
        </div>

        {/* Quick Sort & Platform Mode Filter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Mobile Sort Controls */}
          <div className="flex sm:hidden items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Sort:</span>
            <button
              type="button"
              onClick={() => toggleSort('date')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${sortBy === 'date' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
            >
              Date
            </button>
            {categoryFilter !== 'bait' && (
              <button
                type="button"
                onClick={() => toggleSort('weight')}
                className={`px-2 py-1 rounded text-[11px] font-bold ${sortBy === 'weight' ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              >
                Weight
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleSort('depth')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${sortBy === 'depth' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
            >
              Depth
            </button>
          </div>

          {/* Platform Mode (Boat / Bank) */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold mr-1 hidden sm:inline">Platform:</span>
            {(['all', 'boat', 'bank'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`px-2.5 py-1.5 rounded-lg capitalize font-bold transition text-[11px] sm:text-xs ${
                  modeFilter === m
                    ? categoryFilter === 'bait'
                      ? 'bg-lime-500 text-slate-950 font-black'
                      : 'bg-orange-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Display: 3D Deck Carousel OR Standard Table / List */}
      {viewLayout === 'deck' ? (
        <DeckCarouselView
          catches={sorted}
          categoryFilter={categoryFilter}
          onSelectCatch={onSelectCatch}
          onCenterOnMap={onCenterOnMap}
          onOpenTrophyCard={onOpenTrophyCard}
          onClose={() => setViewLayout('table')}
        />
      ) : (
        <>
          {/* ============================================================== */}
          {/* MOBILE CARD FEED VIEW (Displayed on screens < sm)              */}
          {/* ============================================================== */}
          <div className="block sm:hidden space-y-3 font-mono">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
            {categoryFilter === 'bait' ? (
              <Fish className="w-8 h-8 mx-auto text-lime-500/50 mb-2" />
            ) : (
              <Anchor className="w-8 h-8 mx-auto text-orange-500/50 mb-2" />
            )}
            <p className="font-bold text-slate-300">
              {categoryFilter === 'bait'
                ? 'No bait or forage spots recorded yet.'
                : categoryFilter === 'catfish'
                ? 'No catfish catches found.'
                : 'No catches found matching filter.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {categoryFilter === 'bait'
                ? 'Drop a pin on the map or tap "Bait Spot / Gathering" to log fresh bait!'
                : 'Drop a pin on the map whenever you land a catfish!'}
            </p>
          </div>
        ) : (
          sorted.map(log => {
            const env = log.environmentalSnapshot;
            const isBait = log.isBait;
            const baitInfo = isBait ? parseBaitDetails(log) : null;

            return (
              <div
                key={log.id}
                onClick={() => onSelectCatch(log)}
                className={`p-3.5 bg-slate-900 rounded-2xl border transition shadow-lg space-y-2.5 cursor-pointer active:scale-98 ${
                  isBait
                    ? 'border-lime-500/30 hover:border-lime-400/70 bg-gradient-to-br from-slate-900 via-slate-900 to-lime-950/20'
                    : 'border-slate-800 hover:border-orange-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-white text-sm truncate">{log.species}</h3>
                      {isBait ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-lime-500/20 text-lime-400 border border-lime-500/30">
                          FORAGE RECON
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          CATFISH
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 uppercase bg-slate-800 px-1.5 py-0.2 rounded font-bold">
                        {log.mode}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                          log.isSynced
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/40'
                            : 'bg-amber-950/60 text-amber-400 border-amber-700/40'
                        }`}
                      >
                        {log.isSynced ? '☁️' : '⚡'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(log.timestamp).toLocaleDateString()} at{' '}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Right side metric: Weight for catfish, Abundance / Count for bait */}
                  {isBait ? (
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-lime-400 bg-lime-500/10 border border-lime-500/30 px-2 py-1 rounded-lg">
                        {baitInfo?.abundance}
                      </div>
                      {baitInfo?.estCount && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
                          {baitInfo.estCount}
                        </div>
                      )}
                    </div>
                  ) : (
                    log.weightLbs ? (
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-orange-400 leading-none">
                          {log.weightLbs} <span className="text-xs font-normal">lbs</span>
                        </div>
                        {log.lengthInches ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">{log.lengthInches} inches</div>
                        ) : null}
                      </div>
                    ) : null
                  )}
                </div>

                {/* Tactical details chips */}
                {isBait ? (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-lime-500/20">
                    <div>
                      <span className="text-[9px] text-lime-400/80 uppercase block font-bold">Gathering Gear</span>
                      <span className="text-white font-bold truncate block">{baitInfo?.method}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-sky-400/80 uppercase block font-bold">Size &amp; Depth</span>
                      <span className="text-sky-300 font-bold block">{baitInfo?.size} • {log.waterDepthFeet}ft</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Bait &amp; Rig</span>
                      <span className="text-sky-300 font-bold truncate block">{log.baitRig}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-bold">Depth &amp; Structure</span>
                      <span className="text-amber-400 font-bold block">{log.waterDepthFeet} ft • {log.bottomStructure}</span>
                    </div>
                  </div>
                )}

                {/* Telemetry pill */}
                {env && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-800/50">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-cyan-400" />
                      {env.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.95'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Waves className="w-3 h-3 text-lime-400" />
                      {env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Flow N/A'}
                    </span>
                    <span className="text-orange-300 font-bold">
                      {env.solunarRating ?? 'Normal'}
                    </span>
                  </div>
                )}

                {/* Bottom actions */}
                <div className="pt-2 border-t border-slate-800/80">
                  {confirmDeleteId === log.id ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-rose-950/80 border border-rose-600/70 rounded-xl flex items-center justify-between gap-2"
                    >
                      <span className="text-[11px] text-rose-200 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        Delete permanently?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, log.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px] sm:max-w-[200px]">
                        {log.notes || (isBait ? 'Tap to inspect bait intel' : 'Tap to inspect spot')}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end ml-auto">
                        {onLogAnother && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onLogAnother(log);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer font-mono active:scale-95 border ${
                              isBait
                                ? 'bg-lime-500/20 hover:bg-lime-500 text-lime-300 hover:text-slate-950 border-lime-500/40'
                                : 'bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                            }`}
                            title={isBait ? 'Restock bait at this exact spot' : 'Log another catch at this spot'}
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>{isBait ? '+ Restock' : '+ Spot'}</span>
                          </button>
                        )}
                        {!isBait && onOpenTrophyCard && log.photoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTrophyCard(log);
                            }}
                            className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-bold transition shadow cursor-pointer font-mono active:scale-95"
                            title="Open Baseball Trophy Card"
                          >
                            <Award className="w-3.5 h-3.5 shrink-0" />
                            <span>Card</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(log.id);
                          }}
                          className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 text-xs font-bold transition shadow"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCenterOnMap(log.lat, log.lon);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-bold transition shadow active:scale-95 ${
                            isBait
                              ? 'bg-lime-500/20 hover:bg-lime-500 text-lime-300 hover:text-slate-950 border-lime-500/40'
                              : 'bg-sky-500/20 hover:bg-sky-600 text-sky-300 hover:text-white border-sky-500/40'
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5 fill-current shrink-0" />
                          <span>Map</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* DESKTOP TABLE VIEW (Displayed on screens >= sm)                */}
      {/* ============================================================== */}
      <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl font-mono text-xs">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {categoryFilter === 'bait' ? (
              <Fish className="w-8 h-8 mx-auto text-lime-500/50 mb-2" />
            ) : (
              <Anchor className="w-8 h-8 mx-auto text-orange-500/50 mb-2" />
            )}
            <p className="font-bold text-slate-300 text-sm">
              {categoryFilter === 'bait'
                ? 'No bait or forage spots recorded yet.'
                : categoryFilter === 'catfish'
                ? 'No catfish catches found.'
                : 'No records found matching search query.'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {categoryFilter === 'bait'
                ? 'Switch to the Tactical Map, drop a pin, and select "Bait Spot / Gathering" to log fresh bait.'
                : 'Drop a pin on the Tactical Map whenever you hook a catfish.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider select-none">
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-1">
                      <span>Date / Time</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>

                  <th className="p-3">
                    {categoryFilter === 'bait' ? 'Forage Species' : categoryFilter === 'catfish' ? 'Catfish Species' : 'Species / Type'}
                  </th>

                  {/* Dynamic Column 3 */}
                  {categoryFilter === 'bait' ? (
                    <th className="p-3">Gathering Gear</th>
                  ) : categoryFilter === 'catfish' ? (
                    <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('weight')}>
                      <div className="flex items-center gap-1">
                        <span>Weight &amp; Length</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                  ) : (
                    <th className="p-3">Weight / Method</th>
                  )}

                  {/* Dynamic Column 4 */}
                  {categoryFilter === 'bait' ? (
                    <th className="p-3">Abundance &amp; Size</th>
                  ) : (
                    <th className="p-3">Bait Rig &amp; Presentation</th>
                  )}

                  {/* Depth / Structure */}
                  <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('depth')}>
                    <div className="flex items-center gap-1">
                      <span>Depth &amp; {categoryFilter === 'bait' ? 'Current' : 'Structure'}</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>

                  <th className="p-3">Telemetry</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sorted.map(log => {
                  const env = log.environmentalSnapshot;
                  const isBait = log.isBait;
                  const baitInfo = isBait ? parseBaitDetails(log) : null;

                  return (
                    <tr
                      key={log.id}
                      onClick={() => onSelectCatch(log)}
                      className={`transition cursor-pointer group ${
                        isBait
                          ? 'hover:bg-lime-950/20 bg-lime-950/5'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      {/* Date / Time */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-slate-200">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.mode.toUpperCase()}
                        </div>
                      </td>

                      {/* Species & Status Tag */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isBait ? 'text-lime-200' : 'text-white'}`}>
                            {log.species}
                          </span>
                          {isBait ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-lime-500/20 text-lime-400 border border-lime-500/30">
                              FORAGE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              CATFISH
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                              log.isSynced
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/40'
                                : 'bg-amber-950/60 text-amber-400 border-amber-700/40'
                            }`}
                          >
                            {log.isSynced ? '☁️' : '⚡'}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: For Bait -> Method; For Catfish -> Weight & Length */}
                      <td className="p-3 whitespace-nowrap">
                        {isBait ? (
                          <div>
                            <span className="font-bold text-white text-xs">{baitInfo?.method}</span>
                            {baitInfo?.estCount && (
                              <span className="text-[10px] text-lime-400 font-mono block">
                                Est: {baitInfo.estCount}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {log.weightLbs ? (
                              <span className="font-extrabold text-orange-400 text-sm">
                                {log.weightLbs} lbs
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                            {log.lengthInches && (
                              <span className="text-[10px] text-slate-400 block">{log.lengthInches}"</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Column 4: For Bait -> Abundance & Size; For Catfish -> Bait Rig & Presentation */}
                      <td className="p-3 whitespace-nowrap">
                        {isBait ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-lime-500/15 text-lime-300 border border-lime-500/30">
                              {baitInfo?.abundance}
                            </span>
                            <span className="text-[10px] text-sky-300 block font-bold">
                              {baitInfo?.size}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-sky-300 font-semibold">{log.baitRig}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">{log.presentation}</span>
                          </div>
                        )}
                      </td>

                      {/* Column 5: Depth & Structure / Current */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-amber-400 font-bold">{log.waterDepthFeet} ft</span>
                        <span className="text-[10px] text-slate-400 block">
                          {isBait ? `${log.current} current` : log.bottomStructure}
                        </span>
                      </td>

                      {/* Column 6: Telemetry */}
                      <td className="p-3 whitespace-nowrap text-[11px] text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>{env?.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.95'}</span>
                          <span>•</span>
                          <span>{env?.airTempF ?? 75}°F</span>
                          {env?.usgsFlowCfs && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">{env.usgsFlowCfs.toLocaleString()} CFS</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Column 7: Actions */}
                      <td className="p-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {confirmDeleteId === log.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-600/80 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-rose-200 font-bold mr-1">Delete?</span>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(e, log.id)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              {onLogAnother && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLogAnother(log);
                                  }}
                                  title={isBait ? 'Restock bait at this exact spot' : 'Log another fish at this spot'}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer border ${
                                    isBait
                                      ? 'bg-lime-500/20 hover:bg-lime-500 text-lime-300 hover:text-slate-950 border-lime-500/40'
                                      : 'bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border-emerald-500/40'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{isBait ? '+ Restock' : '+ Spot'}</span>
                                </button>
                              )}

                              {!isBait && onOpenTrophyCard && log.photoUrl && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTrophyCard(log);
                                  }}
                                  title="Open Baseball Trophy Card"
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-xs font-mono font-bold transition shadow-sm cursor-pointer"
                                >
                                  <Award className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Card</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCenterOnMap(log.lat, log.lon);
                                }}
                                title="Fly to exact location on map"
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shadow-sm cursor-pointer border ${
                                  isBait
                                    ? 'bg-lime-500/20 hover:bg-lime-500 text-lime-300 hover:text-slate-950 border-lime-500/40'
                                    : 'bg-sky-500/20 hover:bg-sky-600 text-sky-300 hover:text-white border-sky-500/40'
                                }`}
                              >
                                <Navigation className="w-3.5 h-3.5 fill-current" />
                                <span className="hidden sm:inline">Map</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(log.id);
                                }}
                                title="Delete record"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-500 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectCatch(log);
                                }}
                                title="Inspect details"
                                className={`p-1.5 rounded-lg bg-slate-800 transition cursor-pointer ${
                                  isBait
                                    ? 'hover:bg-lime-500 text-lime-400 hover:text-slate-950'
                                    : 'hover:bg-orange-600 text-orange-400 hover:text-white'
                                }`}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

    </div>
  );
};

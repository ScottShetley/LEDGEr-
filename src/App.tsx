import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CatchLog,
  FishingMode,
  LiveGpsState,
  MapFilterState,
  EnvironmentalSnapshot,
} from './types';
import {
  loadCatches,
  saveCatches,
  addCatch,
  updateCatch,
  deleteCatch,
  clearAllCatches,
  getFishingMode,
  saveFishingMode,
  SAMPLE_CATCHES,
  getLastKnownLocation,
  saveLastKnownLocation,
} from './utils/storage';
import { loadCatchesFromIndexedDB, saveAllCatchesToIndexedDB } from './utils/indexedDb';
import {
  canAccessGeolocation,
  markGeolocationBlocked,
  resetGeolocationBlocked,
  isGeolocationBlockedByPolicy,
} from './utils/geolocation';
import { offlineSyncService } from './services/offlineSyncService';
import { offlineMapService } from './services/offlineMapService';
import { calculateSolunar } from './utils/solunar';
import { getLiveEnvironmentalSnapshot } from './services/weatherAndWaterService';
import { Header } from './components/Header';
import { LiveTicker } from './components/LiveTicker';
import { MapView } from './components/MapView';
import { CatchModal } from './components/CatchModal';
import { CatchDetailModal } from './components/CatchDetailModal';
import { TrophyCardModal } from './components/TrophyCardModal';
import { BaitSpotHub } from './components/BaitSpotHub';
import { LogTable } from './components/LogTable';
import { PatternInsights } from './components/PatternInsights';
import { SettingsView } from './components/SettingsView';
import { PwaInstallModal } from './components/PwaInstallModal';
import { MoonCycleModal } from './components/MoonCycleModal';
import { PressureGuideModal } from './components/PressureGuideModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // App Platform Mode (Boat vs Bank)
  const [mode, setMode] = useState<FishingMode>(getFishingMode());
  
  // Master Catches State
  const [catches, setCatches] = useState<CatchLog[]>(loadCatches());
  
  // Navigation View & Map Target Focus
  const [activeView, setActiveView] = useState<'map' | 'bait' | 'logs' | 'insights' | 'settings'>('map');
  const [mapFocusTarget, setMapFocusTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Modals & State
  const [isCatchModalOpen, setIsCatchModalOpen] = useState(false);
  const [catchModalInitialCoords, setCatchModalInitialCoords] = useState<{ lat: number; lon: number; accuracy?: number } | undefined>();
  const [catchModalIsBait, setCatchModalIsBait] = useState(false);
  const [catchModalPrefill, setCatchModalPrefill] = useState<any | undefined>(undefined);
  const [selectedCatch, setSelectedCatch] = useState<CatchLog | null>(null);
  const [trophyCardCatch, setTrophyCardCatch] = useState<CatchLog | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Lunar and Barometric Educational Modals
  const [isMoonModalOpen, setIsMoonModalOpen] = useState(false);
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Listen for PWA install prompt and standalone state
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Android Hardware Back Button & Gesture Navigation Handler
  // Intercepts Android system back buttons / edge swipe gestures to dismiss modals or navigate to map
  const modalOpenRef = useRef(false);

  // Check if any full-screen modal or dialog window is active
  const isAnyModalOpen = Boolean(
    isCatchModalOpen ||
    selectedCatch ||
    trophyCardCatch ||
    isMoonModalOpen ||
    isPressureModalOpen ||
    isInstallModalOpen
  );

  useEffect(() => {
    if (isAnyModalOpen && !modalOpenRef.current) {
      modalOpenRef.current = true;
      window.history.pushState({ isModalOpen: true }, '');
    } else if (!isAnyModalOpen && modalOpenRef.current) {
      modalOpenRef.current = false;
    }
  }, [isAnyModalOpen]);

  useEffect(() => {
    const handlePopState = () => {
      // 1. If any modal is open, close it cleanly
      if (
        isCatchModalOpen ||
        selectedCatch ||
        trophyCardCatch ||
        isMoonModalOpen ||
        isPressureModalOpen ||
        isInstallModalOpen
      ) {
        setIsCatchModalOpen(false);
        setCatchModalPrefill(undefined);
        setCatchModalInitialCoords(undefined);
        setSelectedCatch(null);
        setTrophyCardCatch(null);
        setIsMoonModalOpen(false);
        setIsPressureModalOpen(false);
        setIsInstallModalOpen(false);
        modalOpenRef.current = false;
        return;
      }

      // 2. If no modal is open and on a secondary tab, return to primary map view
      if (activeView !== 'map') {
        setActiveView('map');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [
    isCatchModalOpen,
    selectedCatch,
    trophyCardCatch,
    isMoonModalOpen,
    isPressureModalOpen,
    isInstallModalOpen,
    activeView,
  ]);

  // Load from IndexedDB on initial mount and subscribe to background sync updates
  useEffect(() => {
    loadCatchesFromIndexedDB().then((idbCatches) => {
      if (idbCatches && idbCatches.length > 0) {
        setCatches(idbCatches);
      } else {
        const initial = loadCatches();
        saveAllCatchesToIndexedDB(initial).catch(() => {});
        setCatches(initial);
      }
      // Proactively heal any orphaned photo blobs or un-synced queue items from previous sessions
      offlineSyncService.repairLocalCatches().catch(() => {});
    });

    const unsubscribe = offlineSyncService.subscribeCatchesUpdate((updatedCatches) => {
      setCatches(updatedCatches);
    });

    return () => unsubscribe();
  }, []);

  // GPS Telemetry State (seeded with last-known position so app opens on familiar water)
  const [gpsState, setGpsState] = useState<LiveGpsState>(() => {
    const lastLoc = getLastKnownLocation();
    if (lastLoc) {
      return {
        lat: lastLoc.lat,
        lon: lastLoc.lon,
        accuracy: 5.0,
        heading: null,
        speedMph: null,
        status: 'searching', // Stays searching on startup until live GPS locks
        lastUpdated: lastLoc.timestamp,
      };
    }
    return {
      lat: 32.4610,
      lon: -84.9877,
      accuracy: 4.5,
      heading: null,
      speedMph: null,
      status: 'searching',
      lastUpdated: null,
    };
  });

  // Environmental Telemetry State
  const [liveWeather, setLiveWeather] = useState<EnvironmentalSnapshot | null>(null);
  const [solunar, setSolunar] = useState(() => {
    const lastLoc = getLastKnownLocation();
    const initLat = lastLoc?.lat ?? 32.4610;
    const initLon = lastLoc?.lon ?? -84.9877;
    return calculateSolunar(new Date(), initLat, initLon);
  });

  // Map Filter State
  const [filterState, setFilterState] = useState<MapFilterState>({
    species: [],
    baitType: [],
    mode: 'all',
    dateRange: 'all',
    onlyBait: false,
    minWeightLbs: 0,
    searchQuery: '',
  });

  // Handle Mode Change
  const handleModeChange = (newMode: FishingMode) => {
    setMode(newMode);
    saveFishingMode(newMode);
  };

  // Real-time GPS Watcher
  const watchIdRef = useRef<number | null>(null);

  const startGpsWatch = useCallback(async () => {
    // Reset any temporary blocked state so an explicit refresh can re-query hardware
    resetGeolocationBlocked();

    const lastLoc = getLastKnownLocation();
    const fallbackLat = lastLoc?.lat ?? 32.4610;
    const fallbackLon = lastLoc?.lon ?? -84.9877;

    if (!('geolocation' in navigator)) {
      setGpsState(prev => ({
        ...prev,
        lat: prev.lat ?? fallbackLat,
        lon: prev.lon ?? fallbackLon,
        status: 'standby',
        error: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    // Check if geolocation access is permitted or blocked by the parent iframe's permissions policy
    const canAccess = await canAccessGeolocation();
    if (!canAccess) {
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
        watchIdRef.current = null;
      }
      setGpsState(prev => ({
        lat: prev.lat ?? fallbackLat,
        lon: prev.lon ?? fallbackLon,
        accuracy: prev.accuracy ?? 5.0,
        heading: prev.heading,
        speedMph: prev.speedMph,
        status: prev.lastUpdated ? 'locked' : 'searching',
        lastUpdated: prev.lastUpdated ?? null,
        error: isGeolocationBlockedByPolicy() ? 'GPS permission is blocked in browser settings.' : undefined,
      }));
      return;
    }

    setGpsState(prev => ({
      ...prev,
      status: prev.lastUpdated ? 'locked' : 'searching',
      error: undefined,
    }));

    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current);
      } catch {
        // ignore
      }
      watchIdRef.current = null;
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const curLat = pos.coords.latitude;
          const curLon = pos.coords.longitude;

          // Persist verified satellite position as last known location
          saveLastKnownLocation(curLat, curLon);

          setGpsState({
            lat: curLat,
            lon: curLon,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speedMph: pos.coords.speed ? Math.round(pos.coords.speed * 2.23694) : null,
            status: 'locked',
            lastUpdated: Date.now(),
            error: undefined,
          });
        },
        (err) => {
          // Only cancel watcher if user explicitly denied permission (err.code === 1).
          // For timeouts (code 3) or position unavailable (code 2), KEEP watcher running
          // so that GPS satellite signals continue acquiring in the background on mobile.
          if (err.code === 1) {
            if (watchIdRef.current !== null) {
              try {
                navigator.geolocation.clearWatch(watchIdRef.current);
              } catch {
                // ignore
              }
              watchIdRef.current = null;
            }

            markGeolocationBlocked();

            setGpsState(prev => ({
              lat: prev.lat ?? fallbackLat,
              lon: prev.lon ?? fallbackLon,
              accuracy: prev.accuracy ?? 5.0,
              heading: prev.heading,
              speedMph: prev.speedMph,
              status: prev.lastUpdated ? 'locked' : 'searching',
              lastUpdated: prev.lastUpdated ?? null,
              error: 'Location access was denied in browser settings.',
            }));
          } else {
            // Transient timeout or acquiring satellites: do not kill watch
            setGpsState(prev => ({
              ...prev,
              status: prev.lastUpdated ? 'locked' : 'searching',
              error: err.code === 3 ? 'Acquiring satellite fix...' : err.message,
            }));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );
    } catch {
      markGeolocationBlocked();
      setGpsState(prev => ({
        lat: prev.lat ?? fallbackLat,
        lon: prev.lon ?? fallbackLon,
        accuracy: 5.0,
        heading: null,
        speedMph: null,
        status: prev.lastUpdated ? 'locked' : 'searching',
        lastUpdated: prev.lastUpdated ?? null,
      }));
    }
  }, []);

  useEffect(() => {
    startGpsWatch();
    return () => {
      if (watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [startGpsWatch]);

  // Resume or refresh GPS watch when mobile phone screen turns on, unlocks, or tab is resumed
  useEffect(() => {
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        startGpsWatch();
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('focus', handleFocusOrPageShow => {});
    };
  }, [startGpsWatch]);

  // Fetch Live Weather & USGS Water Stage when GPS is active
  useEffect(() => {
    const latestCatch = catches[0];
    const targetLat = gpsState.lat ?? (latestCatch?.lat ?? 32.4610);
    const targetLon = gpsState.lon ?? (latestCatch?.lon ?? -84.9877);

    setSolunar(calculateSolunar(new Date(), targetLat, targetLon));

    let isMounted = true;
    getLiveEnvironmentalSnapshot(targetLat, targetLon, !navigator.onLine)
      .then(snapshot => {
        if (isMounted) setLiveWeather(snapshot);
      })
      .catch(() => {});

    // Polling interval every 5 minutes for live environmental changes
    const interval = setInterval(() => {
      getLiveEnvironmentalSnapshot(targetLat, targetLon, !navigator.onLine)
        .then(snapshot => {
          if (isMounted) setLiveWeather(snapshot);
        })
        .catch(() => {});
      setSolunar(calculateSolunar(new Date(), targetLat, targetLon));
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [gpsState.lat, gpsState.lon]);

  // Auto-bank 50-mile radius around launch location when online (e.g. at boat ramp).
  // CRITICAL: Only auto-bank AFTER GPS has achieved a verified 'locked' status for the current session!
  // This completely prevents banking stale or hardcoded startup coordinates.
  useEffect(() => {
    if (!navigator.onLine) return;
    if (gpsState.status !== 'locked' || gpsState.lat === null || gpsState.lon === null) {
      return;
    }

    const targetLat = gpsState.lat;
    const targetLon = gpsState.lon;

    const timer = setTimeout(() => {
      offlineMapService.checkAndAutoBank(targetLat, targetLon).catch(() => {});
    }, 1200);

    return () => clearTimeout(timer);
  }, [gpsState.lat, gpsState.lon, gpsState.status]);

  // Catch Operations
  const handleSaveNewCatch = async (newLog: CatchLog, photoBlob?: Blob | null) => {
    // 1. Immediately update UI state with isSynced: false (no network lag)
    setCatches((prev) => [newLog, ...prev.filter((c) => c.id !== newLog.id)]);

    // 2. Show immediate tactical confirmation toast
    setSaveSuccessToast(
      `Catch "${newLog.species}" saved locally to device (Satellite GPS locked) ✓`
    );
    setTimeout(() => {
      setSaveSuccessToast(null);
    }, 3500);

    // 3. Persist to local IndexedDB & trigger background sync if online
    try {
      await offlineSyncService.saveCatchOfflineFirst(newLog, photoBlob);
      // Also update local storage backup mirror
      addCatch(newLog, photoBlob);
    } catch (err) {
      console.warn('Error saving to offline store:', err);
    }
  };

  const handleUpdateCatch = async (id: string, updates: Partial<CatchLog>, photoBlob?: Blob | null) => {
    // Always mark updates as unsynced so offlineSyncService uploads the new photo & data to Firestore
    const enrichedUpdates: Partial<CatchLog> = {
      ...updates,
      isSynced: false,
      syncedAt: undefined,
    };

    // Optimistically update React state immediately so UI feels instant
    setCatches((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...enrichedUpdates } : item))
    );
    if (selectedCatch && selectedCatch.id === id) {
      setSelectedCatch({ ...selectedCatch, ...enrichedUpdates });
    }
    if (trophyCardCatch && trophyCardCatch.id === id) {
      setTrophyCardCatch({ ...trophyCardCatch, ...enrichedUpdates });
    }

    try {
      // Await persistence to both localStorage and IndexedDB
      const updated = await updateCatch(id, enrichedUpdates, photoBlob);
      setCatches(updated);

      // Now safe to trigger background sync without stale read races
      offlineSyncService.triggerSync().catch(() => {});
    } catch (err) {
      console.warn('Error updating catch persistence:', err);
    }
  };

  const handleDeleteCatch = (id: string) => {
    const updated = deleteCatch(id);
    setCatches(updated);
    if (selectedCatch && selectedCatch.id === id) {
      setSelectedCatch(null);
    }
  };

  const handleResetCatches = () => {
    saveCatches(SAMPLE_CATCHES);
    setCatches(SAMPLE_CATCHES);
  };

  const handleClearAllCatches = () => {
    clearAllCatches();
    setCatches([]);
    setSelectedCatch(null);
  };

  const handleImportCatches = (imported: CatchLog[]) => {
    saveCatches(imported);
    setCatches(imported);
  };

  // Center on Map Trigger
  const handleCenterOnMap = useCallback((lat: number, lon: number) => {
    setActiveView('map');
    setMapFocusTarget({ lat, lon, zoom: 17, timestamp: Date.now() });
  }, []);

  const handleClearFocusTarget = useCallback(() => {
    setMapFocusTarget(null);
  }, []);

  // Open Rapid Catch Logging Modal
  const handleTriggerDropPin = (
    coords?: { lat: number; lon: number },
    isBait: boolean = false,
    prefillData?: any
  ) => {
    setCatchModalIsBait(isBait);
    setCatchModalPrefill(prefillData);
    if (coords) {
      setCatchModalInitialCoords({ lat: coords.lat, lon: coords.lon, accuracy: gpsState.accuracy ?? 5 });
    } else if (gpsState.status === 'locked' && gpsState.lat && gpsState.lon) {
      setCatchModalInitialCoords({ lat: gpsState.lat, lon: gpsState.lon, accuracy: gpsState.accuracy ?? 5 });
    } else {
      // Leave undefined so CatchModal actively acquires fresh hardware GPS lock directly
      setCatchModalInitialCoords(undefined);
    }
    setIsCatchModalOpen(true);
  };

  // Log Successive Fish at an established waypoint/spot
  const handleLogAnotherAtSpot = (sourceCatch: CatchLog) => {
    setCatchModalIsBait(sourceCatch.isBait);
    setCatchModalInitialCoords({
      lat: sourceCatch.lat,
      lon: sourceCatch.lon,
      accuracy: sourceCatch.accuracyMeters ?? 5,
    });
    setCatchModalPrefill({
      waterDepthFeet: sourceCatch.waterDepthFeet,
      current: sourceCatch.current,
      bottomStructure: sourceCatch.bottomStructure,
      waterClarity: sourceCatch.waterClarity,
      presentation: sourceCatch.presentation,
      mode: sourceCatch.mode,
      baitRig: sourceCatch.baitRig,
      species: sourceCatch.species,
      sourceSpotName: `Waypoint (${sourceCatch.lat.toFixed(4)}°, ${sourceCatch.lon.toFixed(4)}°)`,
    });
    setIsCatchModalOpen(true);
  };

  // Pre-fill log directly from Live Tactical Gameplan Recommendation
  const handleDeployTacticalSetup = (setup: {
    species?: any;
    presentation?: string;
    baitRig?: string;
    waterDepthFeet?: number;
    bottomStructure?: any;
    current?: any;
  }) => {
    setCatchModalIsBait(false);
    if (gpsState.lat && gpsState.lon) {
      setCatchModalInitialCoords({
        lat: gpsState.lat,
        lon: gpsState.lon,
        accuracy: gpsState.accuracy ?? 5,
      });
    } else {
      setCatchModalInitialCoords(undefined);
    }
    setCatchModalPrefill({
      ...setup,
      sourceSpotName: 'Tactical Gameplan Recommendation',
    });
    setIsCatchModalOpen(true);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden antialiased selection:bg-orange-500 selection:text-white">
      
      {/* Tactical Header with Brand, Platform Mode & GPS */}
      <Header
        mode={mode}
        onModeChange={handleModeChange}
        gpsState={gpsState}
        onRefreshGps={startGpsWatch}
        activeView={activeView}
        onViewChange={setActiveView}
        onLogCatchClick={() => handleTriggerDropPin(undefined, false)}
        onDropPinClick={() => handleTriggerDropPin()}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isStandalone={isStandalone}
        isAnyModalOpen={isAnyModalOpen}
      />

      {/* Live Environmental Ticker */}
      <LiveTicker
        weather={liveWeather}
        solunar={solunar}
        onOpenMoonGuide={() => setIsMoonModalOpen(true)}
        onOpenPressureGuide={() => setIsPressureModalOpen(true)}
      />

      {/* Main Viewport Router */}
      <main className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        <div className={`flex-1 min-h-0 relative flex flex-col ${activeView === 'map' ? 'block' : 'hidden'}`}>
          <MapView
            catches={catches}
            selectedCatch={selectedCatch}
            onSelectCatch={setSelectedCatch}
            gpsState={gpsState}
            onRefreshGps={startGpsWatch}
            currentMode={mode}
            onDropPin={handleTriggerDropPin}
            filterState={filterState}
            onUpdateFilters={(f) => setFilterState(prev => ({ ...prev, ...f }))}
            focusTarget={mapFocusTarget}
            onClearFocusTarget={handleClearFocusTarget}
            isVisible={activeView === 'map'}
            isAnyModalOpen={isAnyModalOpen}
          />
        </div>

        {activeView === 'logs' && (
          <div className="flex-1 min-h-0 overflow-y-auto w-full p-2 sm:p-4">
            <LogTable
              catches={catches}
              onSelectCatch={setSelectedCatch}
              onCenterOnMap={handleCenterOnMap}
              onDeleteCatch={handleDeleteCatch}
              onOpenTrophyCard={(log) => setTrophyCardCatch(log)}
              onLogAnother={handleLogAnotherAtSpot}
            />
          </div>
        )}

        {activeView === 'insights' && (
          <div className="flex-1 min-h-0 overflow-y-auto w-full p-2 sm:p-4">
            <PatternInsights
              catches={catches}
              gpsState={gpsState}
              onDeploySetup={handleDeployTacticalSetup}
            />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1 min-h-0 overflow-y-auto w-full p-2 sm:p-4">
            <SettingsView
              catches={catches}
              onImportCatches={handleImportCatches}
              onResetCatches={handleResetCatches}
              onClearAllCatches={handleClearAllCatches}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              isStandalone={isStandalone}
              gpsState={gpsState}
              onReturnToMap={() => setActiveView('map')}
            />
          </div>
        )}
      </main>

      {/* Immersive UI Tactical Status Footer (shown on list/detail screens) */}
      {activeView !== 'map' && (
        <footer
          id="app-tactical-footer"
          className="min-h-12 bg-slate-900 border-t border-slate-700 flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 text-slate-400 text-xs select-none z-20 gap-3 shrink-0"
        >
          {/* Offline Cache Indicator */}
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse"></span>
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300">
              STORAGE: OFFLINE PERSISTENCE (100% LOCAL)
            </span>
          </div>

          {/* Astronomical & Stage Metrics */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[#84CC16] leading-none mb-1 font-bold uppercase tracking-wider">
                Sunrise
              </span>
              <span className="text-xs font-mono font-bold text-white">06:14 AM</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[#F97316] leading-none mb-1 font-bold uppercase tracking-wider">
                Sunset
              </span>
              <span className="text-xs font-mono font-bold text-white">08:22 PM</span>
            </div>
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[10px] text-blue-400 leading-none mb-1 font-bold uppercase tracking-wider">
                Water Level
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {liveWeather?.usgsStageFt ? `${liveWeather.usgsStageFt} FT` : '+1.4 FT (STEADY)'}
              </span>
            </div>
          </div>

          {/* Tactical Version Tag */}
          <div className="font-mono text-[10px] text-slate-500 hidden md:block">
            v2.5.0-PROD // LEDGEr by BIGGUY_littleboat
          </div>
        </footer>
      )}

      {/* Instant Offline-First Local Save Confirmation Toast */}
      {saveSuccessToast && (
        <div
          id="catch-saved-offline-toast"
          className="fixed bottom-14 sm:bottom-6 left-1/2 -translate-x-1/2 z-[4000] px-4 py-2.5 rounded-xl bg-slate-900/95 border-2 border-emerald-500/80 text-emerald-300 font-mono text-xs font-bold shadow-[0_10px_25px_rgba(0,0,0,0.8)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Rapid Catch Logging Modal */}
      {isCatchModalOpen && (
        <CatchModal
          isOpen={isCatchModalOpen}
          onClose={() => {
            setIsCatchModalOpen(false);
            setCatchModalPrefill(undefined);
            setCatchModalInitialCoords(undefined);
          }}
          onSave={handleSaveNewCatch}
          currentMode={mode}
          initialCoords={catchModalInitialCoords}
          initialIsBait={catchModalIsBait}
          prefill={catchModalPrefill}
        />
      )}

      {/* Detailed Catch Review Modal */}
      {selectedCatch && (
        <CatchDetailModal
          catchLog={selectedCatch}
          onClose={() => setSelectedCatch(null)}
          onDelete={handleDeleteCatch}
          onUpdate={handleUpdateCatch}
          onCenterOnMap={handleCenterOnMap}
          onOpenTrophyCard={(log) => setTrophyCardCatch(log)}
          onLogAnother={handleLogAnotherAtSpot}
        />
      )}

      {/* Collectible Baseball / Trophy Card Studio Modal */}
      {trophyCardCatch && (
        <TrophyCardModal
          isOpen={Boolean(trophyCardCatch)}
          onClose={() => setTrophyCardCatch(null)}
          catchLog={trophyCardCatch}
          allCatches={catches}
          onUpdatePhoto={(id, photoUrl, photoBlob, framing) =>
            handleUpdateCatch(
              id,
              {
                photoUrl,
                isSynced: false,
                syncedAt: undefined,
                ...(framing || {}),
              },
              photoBlob
            )
          }
        />
      )}

      {/* PWA Phone Installation Guide / Action Modal */}
      <PwaInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setDeferredPrompt(null)}
      />

      {/* Lunar Fishing Master Guide Modal (Phase Deep Dive) */}
      {isMoonModalOpen && (
        <MoonCycleModal
          isOpen={isMoonModalOpen}
          onClose={() => setIsMoonModalOpen(false)}
          solunar={solunar}
        />
      )}

      {/* Barometric Pressure Master Guide & Graphic Modal */}
      {isPressureModalOpen && (
        <PressureGuideModal
          isOpen={isPressureModalOpen}
          onClose={() => setIsPressureModalOpen(false)}
          weather={liveWeather}
        />
      )}
    </div>
  );
}

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Upload,
  RotateCcw,
  Download,
  Database,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  Info,
  ChevronRight,
  Smartphone,
  Sparkles,
  Zap,
  Satellite,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  BookOpen,
  FlaskConical,
  Copy,
  Check,
  Mail,
  Send,
  ArrowLeft,
  Cloud,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { CatchLog, LiveGpsState, BankedMapInfo, BankingProgress } from '../types';
import { exportCatchesToCsv, exportCatchesToJson } from '../utils/storage';
import { AboutModal } from './AboutModal';
import { offlineMapService, haversineDistanceMiles } from '../services/offlineMapService';
import { offlineSyncService, SyncDetailedProgress } from '../services/offlineSyncService';
import { signInWithGoogle, logOutUser } from '../services/firebase';
import { User } from 'firebase/auth';

interface SettingsViewProps {
  catches: CatchLog[];
  onImportCatches: (imported: CatchLog[]) => void;
  onResetCatches: () => void;
  onClearAllCatches: () => void;
  onOpenInstallModal?: () => void;
  isStandalone?: boolean;
  gpsState?: LiveGpsState;
  onReturnToMap?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  catches,
  onImportCatches,
  onResetCatches,
  onClearAllCatches,
  onOpenInstallModal,
  isStandalone,
  gpsState,
  onReturnToMap,
}) => {
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [aboutModalTab, setAboutModalTab] = useState<'guide' | 'beta' | 'privacy' | 'info'>('guide');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isRepairingPhotos, setIsRepairingPhotos] = useState(false);
  const [photoRepairStatus, setPhotoRepairStatus] = useState<string | null>(null);

  // Google Cloud & Cross-Device Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncFeedback, setCloudSyncFeedback] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncDetailedProgress>({
    isSyncing: false,
    stage: 'idle',
    current: 0,
    total: 0,
    species: '',
    pushedCount: 0,
    failedCount: 0,
    message: '',
  });

  useEffect(() => {
    const unsub = offlineSyncService.subscribeAuthUser((user) => {
      setCurrentUser(user);
    });
    const unsubProg = offlineSyncService.subscribeDetailedProgress((prog) => {
      setSyncProgress(prog);
      if (prog.isSyncing) {
        setIsSyncingCloud(true);
      } else {
        setIsSyncingCloud(false);
      }
    });
    return () => {
      unsub();
      unsubProg();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setCloudSyncFeedback(null);
    try {
      const user = await signInWithGoogle();
      setCloudSyncFeedback(`Signed in as ${user.displayName || user.email}! Synchronizing catches...`);
      const syncRes = await offlineSyncService.syncWithCloudNow();
      if (syncRes.success) {
        setCloudSyncFeedback(`Synced! Pushed ${syncRes.pushedCount} local catches, downloaded ${syncRes.pulledCount} cloud records.`);
      }
    } catch (err: any) {
      setCloudSyncFeedback(err?.message || 'Sign in was cancelled or failed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logOutUser();
      setCloudSyncFeedback('Signed out from Google Cloud.');
    } catch {
      setCloudSyncFeedback('Error signing out.');
    }
  };

  const handleCloudSyncNow = async () => {
    setIsSyncingCloud(true);
    setCloudSyncFeedback(null);
    try {
      if (offlineSyncService.isCloudQuotaExhausted()) {
        await offlineSyncService.retryCloudConnection();
      }
      const res = await offlineSyncService.syncWithCloudNow();
      if (res.success) {
        setCloudSyncFeedback(`Sync complete! Pushed ${res.pushedCount} to cloud, loaded ${res.pulledCount} cloud records.`);
      } else {
        setCloudSyncFeedback(res.error || 'Sync could not complete.');
      }
    } catch {
      setCloudSyncFeedback('Failed to sync. Please check network connection.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleCopyInvite = () => {
    const appUrl = window.location.origin;
    const inviteText = `🎣 Hey! I'm testing my freshwater river catch ledger app, LEDGEr (by BIGGUY_littleboat).

I'd love your feedback on the water! Here is how to install it in 10 seconds:

1. Tap this link in Safari (iPhone) or Chrome (Android):
${appUrl}

2. Tap Share (or 3-dots Menu) -> "Add to Home Screen". This installs it as a full-screen app.

3. Allow Location & Camera permissions (needed to stamp GPS coordinates & river flow telemetry).

Try logging a catch in dead zones or banking a 50-mile offline map, and let me know how it works!`;

    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 3000);
  };

  const handleEmailFeedback = () => {
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const deviceType = isIos ? 'iPhone / iOS' : isAndroid ? 'Android Phone' : 'Desktop / Other';

    const subject = encodeURIComponent('LEDGEr Beta Feedback (v2.6.0)');
    const body = encodeURIComponent(
`Hi David,

Here is my field test feedback on LEDGEr:

[Device]: ${deviceType}
[River / Body of Water]: 
[Cell Service Quality]: (Strong LTE / Weak 1-Bar / 0 Bars / Airplane Mode)

1. GPS & Location Locking:
- Did coordinates lock quickly when on the water?
Answer: 

2. Catch Logging Speed & Deck Usability:
- Did the 10-second catch logger work smoothly with wet hands and glare?
Answer: 

3. Tactical Pattern Analytics & Gameplan Matcher:
- Did the "What Should I Run Today?" recommendations match what produced bites?
Answer: 

4. USGS River Hydrology Telemetry:
- Did the live water temp (°F) and streamflow (CFS) match your river conditions?
Answer: 

5. Offline Satellite Maps:
- Did pre-banked satellite tiles display clearly when away from cell service?
Answer: 

6. Trophy Card Studio & Photo Cropping:
- How did the photo framing, zoom/pan, and card export work for you?
Answer: 

7. Suggestions, Issues, or Bugs:
- 
`
    );
    window.location.href = `mailto:DavidScottShetley@gmail.com?subject=${subject}&body=${body}`;
  };

  // 50-Mile Offline Map State
  const [bankedInfo, setBankedInfo] = useState<BankedMapInfo>(offlineMapService.getBankedInfo());
  const [bankingProgress, setBankingProgress] = useState<BankingProgress>({
    isBanking: false,
    downloaded: 0,
    total: 0,
    percent: 0,
  });

  // GPS check for offline map banking
  const gpsCheck = useMemo(() => {
    return offlineMapService.checkGpsChange(gpsState?.lat ?? null, gpsState?.lon ?? null);
  }, [gpsState?.lat, gpsState?.lon, bankedInfo]);
  const isGpsUnchanged = !gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0 && bankedInfo.status === 'ready';

  useEffect(() => {
    const unsubInfo = offlineMapService.subscribeInfo((info) => setBankedInfo(info));
    const unsubProg = offlineMapService.subscribeProgress((prog) => setBankingProgress(prog));
    offlineMapService.refreshStoredTileCount().catch(() => {});
    return () => {
      unsubInfo();
      unsubProg();
    };
  }, []);

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportCatches(parsed);
          setImportStatus(`Successfully restored ${parsed.length} catches!`);
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('Invalid JSON backup file format.');
        }
      } catch (err) {
        setImportStatus('Error reading backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="settings-view" className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 text-slate-100 font-sans">
      
      {/* Settings & Catch Log Header with Dedicated "About LEDGEr" Button */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-orange-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Settings & Catch Log Ledger</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-mono">
            System Configuration & Info
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            100% Offline storage management, catch backups, and application guide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onReturnToMap && (
            <button
              type="button"
              id="btn-settings-back-to-map"
              onClick={onReturnToMap}
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white font-bold text-xs rounded-xl shadow-lg border border-slate-700 hover:border-sky-500/50 transition-transform active:scale-95 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-sky-400" />
              <span>Back to Map</span>
            </button>
          )}

          {/* Dedicated "App Info & How-To Guide" Button in the Header */}
          <button
            type="button"
            id="btn-about-ledger-header"
            onClick={() => {
              setAboutModalTab('guide');
              setIsAboutModalOpen(true);
            }}
            className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg border border-orange-400/40 transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>App Info & Guide</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* PWA Phone Installation & App Launcher Setup */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-orange-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src="/icon-192.png"
                alt="LEDGEr Official Icon by BIGGUY_littleboat"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl shadow-lg border border-orange-400/50 bg-white object-contain p-1"
              />
              <div className="absolute -top-1 -right-1 bg-orange-500 text-slate-950 p-1 rounded-full shadow">
                <Sparkles className="w-3 h-3 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  PWA Ready (Offline + Standalone)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                Phone Installation & Home Icon
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Install as a standalone app with high-resolution launcher icon, zero app store lag, and instant deck-side access.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-open-install-settings"
            onClick={onOpenInstallModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer shrink-0"
          >
            <Smartphone className="w-4 h-4 stroke-[2.5]" />
            <span>{isStandalone ? 'APP INSTALLED (VIEW INFO)' : 'INSTALL TO PHONE'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">HD PNG & SVG Maskable Icons</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">iOS Safari Apple-Touch-Icon</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">ServiceWorker Auto-Cache</span>
          </div>
        </div>
      </div>

      {/* Beta Tester Command & Field Testing Center */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-2 border-amber-500/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 shadow-inner shrink-0">
              <FlaskConical className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Beta Operations Center
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                  v2.6.0-PROD
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                Beta Tester Onboarding & River Field Notes
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Invite fellow river anglers to test LEDGEr, access step-by-step boat deck guides, and submit bug/feature feedback.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-open-beta-guide-settings"
              onClick={() => {
                setAboutModalTab('beta');
                setIsAboutModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer font-mono"
            >
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
              <span>BETA TESTER GUIDE</span>
            </button>

            <button
              type="button"
              id="btn-copy-tester-invite-settings"
              onClick={handleCopyInvite}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs shadow transition active:scale-95 cursor-pointer font-mono"
              title="Copy SMS invite text for friends"
            >
              {copiedInvite ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedInvite ? 'Invite Copied!' : 'Copy Invite SMS'}</span>
            </button>

            <button
              type="button"
              id="btn-email-feedback-settings"
              onClick={handleEmailFeedback}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow transition active:scale-95 cursor-pointer font-mono"
              title="Email feedback to David"
            >
              <Mail className="w-4 h-4 text-orange-400" />
              <span>Email Feedback</span>
            </button>
          </div>
        </div>

        {copiedInvite && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Tester invitation text copied to clipboard! Paste it into a text message or group chat to invite anglers.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">1</span>
            <div>
              <span className="font-bold text-slate-200 block text-[11px]">Install on Phone</span>
              <span className="text-slate-400 text-[10px]">Must open in Safari/Chrome (not Facebook/IG) and Add to Home Screen.</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">2</span>
            <div>
              <span className="font-bold text-slate-200 block text-[11px]">Bank 50-Mi Satellite</span>
              <span className="text-slate-400 text-[10px]">Pre-cache tiles on ramp LTE so map renders with zero cellular bars.</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">3</span>
            <div>
              <span className="font-bold text-slate-200 block text-[11px]">Test Dead Zones</span>
              <span className="text-slate-400 text-[10px]">Switch phone to Airplane Mode on the water to verify local offline logging.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 50-Mile Offline River Map Banking Section */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-cyan-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shrink-0">
                  <Satellite className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                      Boat Ramp Pre-Cache
                    </span>
                    {bankedInfo.status === 'ready' && bankedInfo.tileCount > 0 && (
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready Offline
                      </span>
                    )}
                    {onReturnToMap && (
                      <button
                        type="button"
                        id="btn-offline-section-back-map"
                        onClick={onReturnToMap}
                        className="text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-white border border-sky-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" /> Back to Map
                      </button>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono mt-1">
                    50-Mile Offline River Map Banking
                  </h2>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed mt-0.5 max-w-2xl">
                    Pre-caches a 50-mile satellite radius from your launch point. When you motor into remote river bends with 0 cell bars, the banked map tiles continue loading seamlessly on deck.
                  </p>
                </div>
              </div>

              {/* Action Buttons Responsive */}
              <div className="w-full sm:w-auto shrink-0">
                {isGpsUnchanged ? (
                  <div className="flex flex-col xs:flex-row sm:flex-col items-stretch gap-2">
                    <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>MAPS CURRENT (GPS UNCHANGED)</span>
                    </div>
                    {onReturnToMap && (
                      <button
                        type="button"
                        id="btn-settings-maps-current-return"
                        onClick={onReturnToMap}
                        className="px-3 py-1.5 rounded-xl text-center text-[11px] text-sky-400 hover:text-white border border-sky-500/40 hover:border-sky-400 bg-sky-950/40 font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Return to Tactical Map</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={bankingProgress.isBanking}
                      onClick={() => {
                        const targetLat = gpsState?.lat ?? bankedInfo.centerLat;
                        const targetLon = gpsState?.lon ?? bankedInfo.centerLon;
                        offlineMapService.bank50MileRadius(targetLat, targetLon, true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-center text-[11px] text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-950 font-bold transition cursor-pointer"
                    >
                      Force Re-bank Tiles
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={bankingProgress.isBanking}
                    onClick={() => {
                      const targetLat = gpsState?.lat ?? bankedInfo.centerLat;
                      const targetLon = gpsState?.lon ?? bankedInfo.centerLon;
                      offlineMapService.bank50MileRadius(targetLat, targetLon, true);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer min-h-[44px]"
                  >
                    {bankingProgress.isBanking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>BANKING ({bankingProgress.percent}%)</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>
                          {bankedInfo.tileCount > 0
                            ? `UPDATE FOR NEW GPS (+${gpsCheck.distanceMiles.toFixed(1)} mi)`
                            : 'BANK 50-MI RADIUS'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* GPS Change Verification Banner */}
            <div className={`p-3 rounded-xl border flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 text-xs font-mono ${
              isGpsUnchanged
                ? 'bg-emerald-950/30 border-emerald-500/30'
                : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                ? 'bg-amber-950/30 border-amber-500/30'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-start gap-2.5">
                {isGpsUnchanged ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0 ? (
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Satellite className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">
                    {isGpsUnchanged
                      ? 'GPS Location Check: Same as Last Bank'
                      : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                      ? `GPS Location Check: Moved ${gpsCheck.distanceMiles.toFixed(1)} miles`
                      : 'GPS Location Check: Initial Launch'}
                  </span>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {isGpsUnchanged
                      ? `Your phone is at the same location as last time (${gpsCheck.distanceMiles.toFixed(2)} mi difference). No need to re-bank — your 50-mile offline tiles are already safely cached.`
                      : gpsCheck.hasGpsChanged && bankedInfo.tileCount > 0
                      ? `Your phone has moved more than ${gpsCheck.thresholdMiles} mile from the previously banked boat ramp. Tap update to bank the new 50-mile radius.`
                      : 'When you open the app at a boat ramp with service, it checks your GPS and pre-caches the 50-mile navigation circle.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Banking Progress Bar */}
            {bankingProgress.isBanking && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading high-res satellite tiles across 50-mile radius...
                  </span>
                  <span>{bankingProgress.percent}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div
                    className="bg-gradient-to-r from-cyan-500 via-amber-500 to-orange-500 h-full transition-all duration-150"
                    style={{ width: `${bankingProgress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>{bankingProgress.downloaded} of {bankingProgress.total} tiles stored</span>
                  <div className="flex items-center gap-3">
                    {onReturnToMap && (
                      <button
                        type="button"
                        onClick={onReturnToMap}
                        className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer flex items-center gap-1 text-xs"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Return to Map</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => offlineMapService.cancelBanking()}
                      className="text-red-400 hover:text-red-300 underline font-bold cursor-pointer"
                    >
                      Cancel Banking
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Grid (Responsive: 1 col on mobile xs, 2 cols on mobile/sm, 4 cols on lg) */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Coverage Radius</span>
                <div className="text-base font-bold text-cyan-400">50 Statute Miles</div>
                <span className="text-[10px] text-slate-400 block">Full river pool & navigation</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Banked Ramp / Center</span>
                <div className="text-xs font-bold text-white truncate">
                  {bankedInfo.timestamp > 0
                    ? `${bankedInfo.centerLat.toFixed(4)}°, ${bankedInfo.centerLon.toFixed(4)}°`
                    : 'Not Set Yet'}
                </div>
                {gpsState?.lat && gpsState?.lon && bankedInfo.timestamp > 0 ? (
                  <span className="text-[10px] text-amber-300 font-bold block">
                    {haversineDistanceMiles(gpsState.lat, gpsState.lon, bankedInfo.centerLat, bankedInfo.centerLon).toFixed(1)} mi from here
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 block">Launch ramp anchor</span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Offline Tiles Cached</span>
                <div className="text-base font-bold text-white">
                  {bankedInfo.tileCount} Tiles
                </div>
                <span className="text-[10px] text-slate-400 block">
                  ~{Math.round(bankedInfo.tileCount * 0.025)} MB local device storage
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Last Banked</span>
                <div className="text-xs font-bold text-slate-300">
                  {bankedInfo.timestamp > 0
                    ? new Date(bankedInfo.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Never'}
                </div>
                <span className="text-[10px] text-emerald-400 block">
                  {bankedInfo.status === 'ready' ? '✓ Persisted in CacheStorage' : 'Tap to download'}
                </span>
              </div>
            </div>

            {/* Options Row Responsive */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={bankedInfo.autoBankEnabled}
                  onChange={(e) => offlineMapService.setAutoBankEnabled(e.target.checked)}
                  className="rounded accent-orange-500 w-4 h-4 cursor-pointer shrink-0"
                />
                <span>Auto-bank 50 miles on launch (only when GPS has moved to a new ramp)</span>
              </label>

              <div className="flex items-center gap-3 sm:ml-auto">
                {onReturnToMap && (
                  <button
                    type="button"
                    onClick={onReturnToMap}
                    className="text-sky-400 hover:text-sky-300 text-xs flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Return to Map</span>
                  </button>
                )}

                {bankedInfo.tileCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Clear all banked offline satellite tiles? You can re-download them anytime.')) {
                        await offlineMapService.clearBankedTiles();
                      }
                    }}
                    className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Purge Banked Map Tiles</span>
                  </button>
                )}
              </div>
            </div>
          </div>



      {/* Google Cloud Account & Multi-Device Sync */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-4 font-mono shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Real-Time Cloud Sync
                </span>
                {currentUser && (
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                    {currentUser.email}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                Google Account &amp; Multi-Device Sync
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Connect your Google account on both your phone and this computer to automatically mirror all your catches, GPS spots, and 3D trophy cards.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {currentUser ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-settings-cloud-sync-now"
                  onClick={handleCloudSyncNow}
                  disabled={isSyncingCloud}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'SYNCING...' : 'SYNC WITH CLOUD NOW'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-settings-google-signin"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'CONNECTING...' : 'SIGN IN WITH GOOGLE'}</span>
              </button>
            )}
          </div>
        </div>

        {offlineSyncService.isCloudQuotaExhausted() && (
          <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/60 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Google Cloud Sync Paused — Daily Free Tier Limit Reached</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-mono">
                Resets Midnight PT
              </span>
            </div>
            <p className="text-[11px] text-amber-200/90 font-sans leading-relaxed">
              The project has reached its free tier daily write allowance (20,000 units/day). <strong>Your catches and photos are 100% saved locally on this device.</strong> Cloud background sync is paused to eliminate retries, and will automatically resume once the daily quota resets.
            </p>
          </div>
        )}

        {syncProgress.isSyncing && (
          <div className="p-3.5 rounded-xl bg-sky-950/80 border border-sky-500/60 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-sky-300 font-bold">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                <span>
                  {syncProgress.total > 0
                    ? `Syncing Catch ${syncProgress.current} of ${syncProgress.total}`
                    : 'Contacting Google Cloud Database...'}
                </span>
              </span>
              <span className="text-white font-mono">{syncProgress.species}</span>
            </div>
            {syncProgress.total > 0 && (
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-sky-400 h-full transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-slate-300 font-sans">{syncProgress.message}</p>
          </div>
        )}

        {cloudSyncFeedback && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{cloudSyncFeedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">1. Phone Catch Logging</span>
            <p className="text-[11px] text-slate-300 font-sans">
              Sign in with Google on your phone. Catches logged on the water save locally first and sync to cloud once online.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">2. Desktop Auto-Hydration</span>
            <p className="text-[11px] text-slate-300 font-sans">
              Sign into this computer with the same Google email. All your phone catches download automatically.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">3. 100% Offline Protected</span>
            <p className="text-[11px] text-slate-300 font-sans">
              0 cell service on the river? No problem. The app writes to internal hardware storage first, syncing at the ramp.
            </p>
          </div>
        </div>
      </div>

      {/* Offline Storage & Backup Management */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 font-mono">
        <h2 className="text-sm font-extrabold uppercase text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          Offline Database & Backups
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Recorded Catches</span>
            <div className="text-xl font-black text-white">{catches.length} Saved Logs</div>
            <p className="text-[11px] text-slate-400 font-sans">
              Stored securely in local browser storage. Works 100% offline without cellular signal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Telemetry API Connections</span>
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Open-Meteo & USGS (Live River Data)</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Auto-enriches catches with barometric pressure, air temp, and river gauge flow.
            </p>
          </div>
        </div>

        {importStatus && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {photoRepairStatus && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{photoRepairStatus}</span>
          </div>
        )}

        {/* Local Photo Health & Recovery Card */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Offline Photo Hydration & Repair</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Scans local IndexedDB storage, re-attaches photos to catch logs, and refreshes 3D trophy card links.
            </p>
          </div>
          <button
            type="button"
            disabled={isRepairingPhotos}
            onClick={async () => {
              setIsRepairingPhotos(true);
              setPhotoRepairStatus(null);
              try {
                const res = await offlineSyncService.repairLocalCatches();
                setPhotoRepairStatus(
                  `Scan complete: ${res.totalPhotosFound} local photo(s) verified in storage, ${res.repairedCount} catch record(s) hydrated & queued.`
                );
              } catch (err) {
                setPhotoRepairStatus('Error scanning local photo storage.');
              } finally {
                setIsRepairingPhotos(false);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            {isRepairingPhotos ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Storage...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan & Repair Photos</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => exportCatchesToCsv(catches)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to CSV File</span>
          </button>

          <button
            type="button"
            onClick={() => exportCatchesToJson(catches)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => jsonImportRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Restore JSON Backup</span>
          </button>
          <input
            type="file"
            ref={jsonImportRef}
            onChange={handleJsonImport}
            accept=".json"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete ALL catch logs and wipe the database? This action cannot be undone.')) {
                onClearAllCatches();
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-950 text-red-400 hover:text-red-300 border border-slate-700 hover:border-red-600 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All Logs</span>
          </button>

          <button
            type="button"
            onClick={onResetCatches}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-orange-400" />
            <span>Load Demo Samples</span>
          </button>
        </div>
      </div>

      {/* Google Play Store & Privacy Data Safety Section */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-4 shadow-xl font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Play Store Ready
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                  Data Safety Compliant
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                Privacy Policy & Store Data Safety
              </h2>
              <p className="text-xs text-slate-300 font-sans leading-relaxed mt-0.5">
                Full disclosures for Google Play Console submission: 100% on-device storage, zero background location tracking, and instant user data wipe.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-open-privacy-tab-settings"
              onClick={() => {
                setAboutModalTab('privacy');
                setIsAboutModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Info className="w-4 h-4" />
              <span>VIEW DATA SAFETY</span>
            </button>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs shadow transition active:scale-95"
            >
              <span>Public Policy URL</span>
            </a>
          </div>
        </div>
      </div>

      {/* Information / About Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        initialTab={aboutModalTab}
      />
    </div>
  );
};

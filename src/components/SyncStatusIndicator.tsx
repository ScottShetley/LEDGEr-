import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  HardDrive,
  Database,
  Satellite,
  Wifi,
  WifiOff,
  AlertCircle,
  ChevronDown,
  X,
  LogIn,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { SyncStatusInfo } from '../types';
import { offlineSyncService, SyncDetailedProgress } from '../services/offlineSyncService';
import { signInWithGoogle, logOutUser } from '../services/firebase';
import { User } from 'firebase/auth';

interface SyncStatusIndicatorProps {
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ compact = false }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>({
    state: 'synced',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    unsyncedCount: 0,
    totalCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);
  const [detailedProgress, setDetailedProgress] = useState<SyncDetailedProgress>({
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
    const unsubSync = offlineSyncService.subscribe((status) => {
      setSyncStatus(status);
    });
    const unsubAuth = offlineSyncService.subscribeAuthUser((user) => {
      setCurrentUser(user);
    });
    const unsubProg = offlineSyncService.subscribeDetailedProgress((prog) => {
      setDetailedProgress(prog);
    });
    return () => {
      unsubSync();
      unsubAuth();
      unsubProg();
    };
  }, []);

  const handleSignIn = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAuthLoading(true);
    setSyncMessage(null);
    try {
      const user = await signInWithGoogle();
      setSyncMessage(`Signed in as ${user.displayName || user.email}! Synchronizing catches...`);
      const syncRes = await offlineSyncService.syncWithCloudNow();
      if (syncRes.success) {
        setSyncMessage(`Synced! Pushed ${syncRes.pushedCount} local catches, downloaded ${syncRes.pulledCount} cloud records.`);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setSyncMessage(err?.message || 'Sign in was cancelled or failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAuthLoading(true);
    setSyncMessage(null);
    try {
      await logOutUser();
      setSyncMessage('Signed out. Local offline catches are preserved.');
    } catch (err: any) {
      setSyncMessage('Sign out failed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManualSyncing(true);
    setSyncMessage(null);
    try {
      const res = await offlineSyncService.syncWithCloudNow();
      if (res.success) {
        setSyncMessage(`Sync complete! Pushed ${res.pushedCount} to cloud, loaded ${res.pulledCount} records.`);
      } else {
        setSyncMessage(res.error || 'Sync encountered an issue.');
      }
    } catch (err) {
      setSyncMessage('Sync failed. Please check connection.');
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleRepairLocalCatches = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRepairing(true);
    setRepairMessage(null);
    try {
      const res = await offlineSyncService.repairLocalCatches();
      if (res.success) {
        setRepairMessage(
          `Repaired & hydrated ${res.repairedCount} catch records from IndexedDB storage!`
        );
      } else {
        setRepairMessage('Repair check finished. All local photos are linked.');
      }
    } catch {
      setRepairMessage('Could not complete local repair.');
    } finally {
      setIsRepairing(false);
    }
  };

  const isSyncing = syncStatus.isSyncing || isManualSyncing;
  const isQuotaExhausted = offlineSyncService.isCloudQuotaExhausted();

  return (
    <div className="relative inline-block">
      {/* Compact Badge Button in Header */}
      <button
        type="button"
        id="btn-sync-status-indicator"
        onClick={() => setIsOpen(!isOpen)}
        title="Offline Storage & Cloud Sync Status"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer active:scale-95 select-none ${
          isSyncing
            ? 'bg-sky-950/80 border-sky-500 text-sky-300 animate-pulse'
            : !syncStatus.isOnline
            ? 'bg-amber-950/80 border-amber-500/80 text-amber-300'
            : isQuotaExhausted
            ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 hover:bg-amber-900/60'
            : currentUser
            ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/60'
            : 'bg-slate-800 border-orange-500/50 text-orange-300 hover:bg-slate-700'
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span className="hidden sm:inline">Syncing...</span>
            <span className="sm:hidden text-[10px]">Syncing</span>
          </>
        ) : !syncStatus.isOnline ? (
          <>
            <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Offline</span>
            <span className="sm:hidden whitespace-nowrap text-[11px]">Offline</span>
            {syncStatus.unsyncedCount > 0 && (
              <span className="px-1 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black shrink-0">
                {syncStatus.unsyncedCount}
              </span>
            )}
          </>
        ) : isQuotaExhausted ? (
          <>
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Local (Cloud Quota)</span>
            <span className="sm:hidden whitespace-nowrap text-[11px]">Local</span>
            {syncStatus.unsyncedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black shrink-0">
                {syncStatus.unsyncedCount}
              </span>
            )}
          </>
        ) : currentUser ? (
          <>
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt=""
                className="w-4 h-4 rounded-full border border-emerald-400 object-cover"
              />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="hidden sm:inline whitespace-nowrap">Cloud Synced</span>
            <span className="sm:hidden whitespace-nowrap text-[11px]">Cloud</span>
            {syncStatus.unsyncedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black shrink-0">
                {syncStatus.unsyncedCount}
              </span>
            )}
          </>
        ) : (
          <>
            <LogIn className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Sign In / Sync</span>
            <span className="sm:hidden whitespace-nowrap text-[11px]">Sync</span>
          </>
        )}
      </button>

      {/* Interactive Sync, Auth, & Storage Diagnostics Popover */}
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:p-0 sm:bg-transparent sm:backdrop-blur-none">
          <div
            className="w-full max-w-sm sm:w-96 bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl p-4 text-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                <span className="font-mono text-xs font-black tracking-wider uppercase text-white">
                  Cloud Account &amp; Sync Hub
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Google Account Section */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Google Cloud Account
                  </span>
                  {currentUser ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-700">
                      Not Signed In
                    </span>
                  )}
                </div>

                {currentUser ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt=""
                          className="w-8 h-8 rounded-full border border-emerald-400 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">
                          {currentUser.displayName || 'Angler'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={isAuthLoading}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 cursor-pointer shrink-0"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                      Sign in with Google on both your phone and this computer to automatically mirror all your catches, GPS marks, and trophy cards!
                    </p>
                    <button
                      type="button"
                      id="btn-google-sign-in-popover"
                      onClick={handleSignIn}
                      disabled={isAuthLoading}
                      className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98"
                    >
                      {/* Google G icon SVG */}
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
                      <span>{isAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quota Exhaustion Notice */}
              {isQuotaExhausted && (
                <div className="p-2.5 rounded-lg bg-amber-950/90 border border-amber-500/70 text-amber-200 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cloud Sync Paused (Daily Free Limit)</span>
                  </div>
                  <p className="text-[10px] text-amber-200/90 font-sans leading-tight">
                    Firebase daily free write quota reached (resets daily at midnight PT). Your catches are safely saved offline in IndexedDB on this device.
                  </p>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsManualSyncing(true);
                      await offlineSyncService.retryCloudConnection();
                      setIsManualSyncing(false);
                    }}
                    className="mt-1 px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer active:scale-95"
                  >
                    Test Cloud Reconnect
                  </button>
                </div>
              )}

              {/* Detailed Live Progress */}
              {detailedProgress.isSyncing && (
                <div className="p-2.5 rounded-lg bg-sky-950/90 border border-sky-500 text-sky-200 text-xs space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between font-bold text-sky-300 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                      <span>{detailedProgress.total > 0 ? `Catch ${detailedProgress.current} of ${detailedProgress.total}` : 'Connecting...'}</span>
                    </span>
                    <span className="text-white truncate max-w-[120px]">{detailedProgress.species}</span>
                  </div>
                  {detailedProgress.total > 0 && (
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-700">
                      <div
                        className="bg-sky-400 h-full transition-all duration-150"
                        style={{ width: `${Math.min(100, Math.round((detailedProgress.current / detailedProgress.total) * 100))}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-300 truncate">{detailedProgress.message}</p>
                </div>
              )}

              {/* Status Banner */}
              {syncMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-[11px] flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{syncMessage}</span>
                </div>
              )}

              {/* Local Storage & Cloud Diagnostics */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>Catches on this Device:</span>
                  </span>
                  <span className="font-bold text-white">{syncStatus.totalCount} Logs</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pending Cloud Sync:</span>
                  </span>
                  <span
                    className={`font-bold ${
                      syncStatus.unsyncedCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {syncStatus.unsyncedCount} {syncStatus.unsyncedCount === 1 ? 'record' : 'records'}
                  </span>
                </div>

                {syncStatus.lastSyncedAt && (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                    <span>Last Cloud Sync:</span>
                    <span>{new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  id="btn-sync-with-cloud-now"
                  onClick={handleManualSync}
                  disabled={isSyncing || !syncStatus.isOnline}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    isSyncing
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : !syncStatus.isOnline
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 active:scale-98'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncing
                      ? 'Syncing with Google Cloud...'
                      : !syncStatus.isOnline
                      ? 'Offline (Queued for Reconnect)'
                      : currentUser
                      ? 'Sync with Google Cloud Now'
                      : 'Force Local Sync Now'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRepairLocalCatches}
                  disabled={isRepairing || isSyncing}
                  className="w-full py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 active:scale-98"
                  title="Scan local IndexedDB, re-link orphaned photos, and repair queue"
                >
                  <HardDrive className={`w-3.5 h-3.5 ${isRepairing ? 'animate-pulse' : ''}`} />
                  <span>{isRepairing ? 'Scanning Local Photos...' : 'Scan & Repair Local Photos'}</span>
                </button>
              </div>

              {repairMessage && (
                <div className="p-2.5 rounded-lg bg-cyan-950/80 border border-cyan-500/60 text-cyan-200 text-[11px] flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{repairMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

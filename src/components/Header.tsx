import React, { useRef, useEffect } from 'react';
import {
  Map as MapIcon,
  Crosshair,
  Fish,
  BookOpen,
  LineChart,
  Settings,
  Plus,
  Smartphone,
} from 'lucide-react';
import { FishingMode, LiveGpsState } from '../types';
import { LogoGraphic } from './LogoGraphic';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface HeaderProps {
  activeView: 'map' | 'bait' | 'logs' | 'insights' | 'settings';
  onViewChange: (view: 'map' | 'bait' | 'logs' | 'insights' | 'settings') => void;
  mode: FishingMode;
  onModeChange: (mode: FishingMode) => void;
  gpsState: LiveGpsState;
  onRefreshGps: () => void;
  onLogCatchClick: () => void;
  onDropPinClick?: () => void;
  onOpenInstallModal?: () => void;
  isStandalone?: boolean;
  isAnyModalOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  mode,
  onModeChange,
  gpsState,
  onRefreshGps,
  onLogCatchClick,
  onDropPinClick,
  onOpenInstallModal,
  isStandalone,
  isAnyModalOpen = false,
}) => {
  const navRef = useRef<HTMLElement>(null);
  const isDraggingNavRef = useRef(false);
  const startXNavRef = useRef(0);
  const scrollLeftNavRef = useRef(0);
  const hasMovedNavRef = useRef(false);

  // Auto-scroll active view tab into view on mobile
  useEffect(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector(`#nav-${activeView}-btn`) as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeView]);

  const handleNavMouseDown = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    isDraggingNavRef.current = true;
    startXNavRef.current = e.pageX - navRef.current.offsetLeft;
    scrollLeftNavRef.current = navRef.current.scrollLeft;
    hasMovedNavRef.current = false;
  };

  const handleNavMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingNavRef.current || !navRef.current) return;
    const x = e.pageX - navRef.current.offsetLeft;
    const walk = x - startXNavRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedNavRef.current = true;
      navRef.current.scrollLeft = scrollLeftNavRef.current - walk;
    }
  };

  const handleNavMouseUp = () => {
    isDraggingNavRef.current = false;
  };

  const formatGpsCoords = () => {
    if (!gpsState.lat || !gpsState.lon) return 'STANDBY';
    const latDir = gpsState.lat >= 0 ? 'N' : 'S';
    const lonDir = gpsState.lon >= 0 ? 'E' : 'W';
    return `${Math.abs(gpsState.lat).toFixed(4)}° ${latDir}, ${Math.abs(gpsState.lon).toFixed(4)}° ${lonDir}`;
  };

  return (
    <header
      id="app-tactical-header"
      className="w-full max-w-full min-w-0 flex-shrink-0 flex flex-col bg-[#1E293B] border-b border-slate-700 text-[#F8FAFC] shadow-lg sticky top-0 z-30 select-none"
    >
      {/* Primary Tactical Top Header */}
      <div className="w-full max-w-full min-w-0 flex items-center justify-between px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 gap-1.5 sm:gap-3 flex-wrap sm:flex-nowrap">
        
        {/* Brand & Official Emblem */}
        <div
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0"
          onClick={() => onViewChange('map')}
          title="LEDGEr — by BIGGUY_littleboat"
        >
          <div className="flex items-center bg-[#F97316] p-1 rounded-full shadow-md group-hover:bg-orange-500 transition-colors">
            <LogoGraphic size="sm" />
          </div>

          <div className="flex flex-col">
            <h1 className="text-base sm:text-xl font-black tracking-tight leading-none text-white flex items-baseline">
              <span>LEDGE</span>
              <span className="text-[#F97316] font-black">r</span>
            </h1>
            <div className="flex items-center space-x-1 mt-0.5">
              <span className="font-mono text-[9px] sm:text-[10px] text-slate-300 font-semibold tracking-wide">
                by <span className="text-[#F97316] font-bold">BIGGUY_littleboat</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Mode Toggle + GPS Status + Log Catch + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          
          {/* Global Platform Mode Pill Switch */}
          <div className="flex bg-slate-800/90 rounded-full p-0.5 sm:p-1 border border-slate-700 shadow-inner">
            <button
              type="button"
              id="mode-boat-btn"
              onClick={() => onModeChange('boat')}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                mode === 'boat'
                  ? 'bg-[#F97316] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="sm:hidden">🛥️</span>
              <span className="hidden sm:inline">🛥️ BOAT</span>
            </button>
            <button
              type="button"
              id="mode-bank-btn"
              onClick={() => onModeChange('bank')}
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all ${
                mode === 'bank'
                  ? 'bg-[#84CC16] text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="sm:hidden">🎣</span>
              <span className="hidden sm:inline">🎣 BANK</span>
            </button>
          </div>

          {/* GPS Telemetry Pill */}
          <div
            onClick={onRefreshGps}
            title="Click to refresh GPS fix"
            className="hidden xs:flex flex-col items-end cursor-pointer group px-1"
          >
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  gpsState.status === 'locked'
                    ? 'bg-[#84CC16] animate-pulse'
                    : gpsState.status === 'searching'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-red-500'
                }`}
              />
              <span className="text-slate-400 group-hover:text-slate-200">
                {gpsState.status.toUpperCase()}
              </span>
            </div>
            <span className="font-mono text-[9px] text-slate-400 group-hover:text-white">
              {formatGpsCoords()}
            </span>
          </div>

          {/* Direct Drop Pin Button (Quick Tactical - Map Screen Only & Hidden During Modals) */}
          {onDropPinClick && activeView === 'map' && !isAnyModalOpen && (
            <button
              type="button"
              id="header-drop-pin-btn"
              onClick={onDropPinClick}
              title="Drop tactical strike pin at current vessel location"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 text-xs font-bold transition shadow-sm"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">DROP PIN</span>
            </button>
          )}

          {/* PWA Phone Install Button */}
          {onOpenInstallModal && !isStandalone && (
            <button
              type="button"
              id="header-pwa-install-btn"
              onClick={onOpenInstallModal}
              title="Install LEDGEr to Phone Home Screen"
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600/90 to-amber-600/90 hover:from-orange-500 hover:to-amber-500 border border-orange-400/50 text-white text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">INSTALL</span>
            </button>
          )}

          {/* Offline / Cloud Sync Status Badge */}
          <SyncStatusIndicator compact={true} />

          {/* Primary LOG CATCH Action Button (Wet-Finger High Visibility - Map Screen Only & Hidden During Modals) */}
          {activeView === 'map' && !isAnyModalOpen && (
            <button
              type="button"
              id="log-catch-header-btn"
              onClick={onLogCatchClick}
              className="flex items-center gap-1 sm:gap-1.5 bg-[#F97316] hover:bg-orange-500 active:scale-95 text-white font-black text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-md border border-orange-400/40 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="tracking-wide whitespace-nowrap">LOG CATCH</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation: View Tabs */}
      <div className="relative w-full max-w-full min-w-0 flex-shrink-0 bg-[#0F172A]/90 border-t border-slate-800">
        <nav
          ref={navRef}
          aria-label="Main Navigation Views"
          onMouseDown={handleNavMouseDown}
          onMouseMove={handleNavMouseMove}
          onMouseUp={handleNavMouseUp}
          onMouseLeave={handleNavMouseUp}
          className="w-full max-w-full min-w-0 flex items-center justify-between px-2 sm:px-4 md:px-6 text-xs font-mono overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain select-none cursor-grab active:cursor-grabbing scroll-smooth"
        >
          <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 py-1 min-w-max pr-6 lg:pr-0">
            <button
              type="button"
              id="nav-map-btn"
              onClick={() => {
                if (hasMovedNavRef.current) return;
                onViewChange('map');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap text-[11px] sm:text-xs cursor-pointer active:scale-95 ${
                activeView === 'map'
                  ? 'bg-slate-800 text-sky-400 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 shrink-0" />
              <span>TACTICAL MAP</span>
            </button>

            <button
              type="button"
              id="nav-logs-btn"
              onClick={() => {
                if (hasMovedNavRef.current) return;
                onViewChange('logs');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap text-[11px] sm:text-xs cursor-pointer active:scale-95 ${
                activeView === 'logs'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>MASTER LOGBOOK</span>
            </button>

            <button
              type="button"
              id="nav-insights-btn"
              onClick={() => {
                if (hasMovedNavRef.current) return;
                onViewChange('insights');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap text-[11px] sm:text-xs cursor-pointer active:scale-95 ${
                activeView === 'insights'
                  ? 'bg-slate-800 text-purple-400 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LineChart className="w-3.5 h-3.5 shrink-0" />
              <span>PATTERN ENGINE</span>
            </button>

            <button
              type="button"
              id="nav-settings-btn"
              onClick={() => {
                if (hasMovedNavRef.current) return;
                onViewChange('settings');
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md font-bold transition whitespace-nowrap text-[11px] sm:text-xs cursor-pointer active:scale-95 ${
                activeView === 'settings'
                  ? 'bg-[#F97316] text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>SETTINGS</span>
            </button>
          </div>

          {/* Status indicator on nav bar */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 font-mono pl-4 shrink-0">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase tracking-widest text-[9px]">RECON RADAR ACTIVE</span>
          </div>
        </nav>

        {/* Right scroll fade hint for mobile screens */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0F172A] to-transparent lg:hidden" />
      </div>
    </header>
  );
};

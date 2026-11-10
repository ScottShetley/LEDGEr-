import React, { useRef, useState, useEffect } from 'react';
import {
  Gauge,
  Wind,
  Thermometer,
  Waves,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { EnvironmentalSnapshot, SolunarData } from '../types';

interface LiveTickerProps {
  weather: EnvironmentalSnapshot | null;
  solunar: SolunarData;
  isLoading?: boolean;
  onOpenMoonGuide?: () => void;
  onOpenPressureGuide?: () => void;
}

/**
 * Plain-English moon phase helper with percentage and phase icon.
 */
function getSimplifiedMoonInfo(phaseName: string, pct: number): {
  icon: string;
  label: string;
  shortLabel: string;
} {
  const p = (phaseName || '').toLowerCase();

  if (p.includes('new')) {
    return { icon: '🌑', label: `New Moon (${pct}% full)`, shortLabel: `New (${pct}%)` };
  }
  if (p.includes('waxing crescent')) {
    return { icon: '🌒', label: `Crescent Moon (${pct}% full)`, shortLabel: `Crescent (${pct}%)` };
  }
  if (p.includes('first quarter')) {
    return { icon: '🌓', label: `Half Moon (${pct}% full)`, shortLabel: `Half (${pct}%)` };
  }
  if (p.includes('waxing gibbous')) {
    return { icon: '🌔', label: `Nearly Full (${pct}% full)`, shortLabel: `Gibbous (${pct}%)` };
  }
  if (p.includes('full')) {
    return { icon: '🌕', label: `Full Moon (${pct}% full)`, shortLabel: `Full (${pct}%)` };
  }
  if (p.includes('waning gibbous')) {
    return { icon: '🌖', label: `Nearly Full (${pct}% full)`, shortLabel: `Gibbous (${pct}%)` };
  }
  if (p.includes('last quarter') || p.includes('third quarter')) {
    return { icon: '🌗', label: `Half Moon (${pct}% full)`, shortLabel: `Half (${pct}%)` };
  }
  if (p.includes('waning crescent')) {
    return { icon: '🌘', label: `Crescent Moon (${pct}% full)`, shortLabel: `Crescent (${pct}%)` };
  }

  // Fallback heuristic based on percentage
  if (pct >= 95) return { icon: '🌕', label: `Full Moon (${pct}%)`, shortLabel: `Full (${pct}%)` };
  if (pct >= 60) return { icon: '🌔', label: `Nearly Full (${pct}%)`, shortLabel: `Gibbous (${pct}%)` };
  if (pct >= 40) return { icon: '🌓', label: `Half Moon (${pct}%)`, shortLabel: `Half (${pct}%)` };
  if (pct >= 10) return { icon: '🌒', label: `Crescent Moon (${pct}%)`, shortLabel: `Crescent (${pct}%)` };
  return { icon: '🌑', label: `New Moon (${pct}%)`, shortLabel: `New (${pct}%)` };
}

export const LiveTicker: React.FC<LiveTickerProps> = ({
  weather,
  solunar,
  onOpenMoonGuide,
  onOpenPressureGuide,
}) => {
  const tickerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  const checkScroll = () => {
    const el = tickerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const el = tickerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = tickerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tickerRef.current) return;
    const x = e.pageX - tickerRef.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      tickerRef.current.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const scrollByAmount = (offset: number) => {
    if (tickerRef.current) {
      tickerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const pressure = weather?.pressureInHg ?? 29.92;
  const trend = weather?.pressureTrend ?? 'steady';
  const airTemp = weather?.airTempF ?? 79;
  const windSpeed = weather?.windSpeedMph ?? 6;
  const windDir = weather?.windDirectionCompass ?? 'SSW';
  const flowCfs = weather?.usgsFlowCfs ?? 41300;
  const stageFt = weather?.usgsStageFt ?? 15.72;

  const isMajorFeed = solunar.currentRating === 'Major';
  const isMinorFeed = solunar.currentRating === 'Minor';

  const moonInfo = getSimplifiedMoonInfo(
    solunar.moonPhaseName,
    solunar.moonIlluminationPercent
  );

  return (
    <div className="relative w-full max-w-full min-w-0 flex-shrink-0 bg-slate-900/98 border-b border-slate-800">
      {/* Scroll Left Quick Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          aria-label="Scroll environmental ticker left"
          className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center px-1 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Scroll Right Quick Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(220)}
          aria-label="Scroll environmental ticker right"
          className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center px-1 bg-gradient-to-l from-slate-950 via-slate-950/90 to-transparent text-cyan-400 hover:text-white transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </button>
      )}

      <div
        id="live-environmental-ticker"
        ref={tickerRef}
        aria-label="Live River & Weather Conditions"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full max-w-full min-w-0 flex-shrink-0 select-none overflow-x-auto no-scrollbar shadow-inner touch-pan-x overscroll-x-contain cursor-grab active:cursor-grabbing scroll-smooth"
      >
        <div className="flex items-center min-w-full w-max xl:w-full xl:grid xl:grid-cols-5 text-xs font-mono divide-x divide-slate-800/80 h-9 sm:h-9.5 whitespace-nowrap">
          
          {/* 1. Barometric Pressure -> PRESSURE (Clickable for Barometer Guide) */}
          <button
            type="button"
            onClick={() => {
              if (hasMovedRef.current) return;
              onOpenPressureGuide?.();
            }}
            className="flex items-center px-3 sm:px-3.5 h-full shrink-0 space-x-1.5 bg-slate-950/30 xl:justify-center cursor-pointer hover:bg-cyan-950/40 hover:border-cyan-500/30 transition text-left group"
            title="Click to open Barometric Pressure Guide & Bite Timing Graphic"
          >
            <Gauge className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" />
            <span className="text-[10px] text-slate-400 group-hover:text-cyan-300 uppercase font-bold tracking-wider shrink-0 transition">
              <span className="hidden sm:inline">PRESSURE:</span>
              <span className="sm:hidden">PRES:</span>
            </span>
          <span className="font-bold text-white whitespace-nowrap group-hover:underline decoration-cyan-400/50 underline-offset-2">
            {pressure.toFixed(2)}
          </span>
          {trend === 'rising' && (
            <span className="inline-flex items-center text-emerald-400 font-semibold ml-0.5 text-[11px] whitespace-nowrap" title="Rising ↗">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              <span>Rising ↗</span>
            </span>
          )}
          {trend === 'falling' && (
            <span className="inline-flex items-center text-rose-400 font-semibold ml-0.5 text-[11px] whitespace-nowrap" title="Dropping ↘">
              <TrendingDown className="w-3 h-3 mr-0.5" />
              <span>Dropping ↘</span>
            </span>
          )}
          {trend === 'steady' && (
            <span className="inline-flex items-center text-slate-300 font-semibold ml-0.5 text-[11px] whitespace-nowrap" title="Steady →">
              <Minus className="w-3 h-3 mr-0.5" />
              <span>Steady →</span>
            </span>
          )}
          <span className="ml-1 text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition hidden lg:inline">
            GUIDE
          </span>
        </button>

        {/* 2. Wind Speed & Direction -> WIND */}
        <div
          className="flex items-center px-3 sm:px-3.5 h-full shrink-0 space-x-1.5 bg-slate-950/30 xl:justify-center"
          title="Wind Speed and Direction"
        >
          <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider shrink-0">WIND:</span>
          <span className="font-bold text-white whitespace-nowrap">
            {Math.round(windSpeed)} mph {windDir}
          </span>
        </div>

        {/* 3. Surface Air Temp -> AIR TEMP */}
        <div
          className="flex items-center px-3 sm:px-3.5 h-full shrink-0 space-x-1.5 bg-slate-950/30 xl:justify-center"
          title="Air Temperature"
        >
          <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider shrink-0">
            <span className="hidden sm:inline">AIR </span>TEMP:
          </span>
          <span className="font-bold text-amber-300 whitespace-nowrap">
            {Math.round(airTemp)}°F
          </span>
        </div>

        {/* 4. USGS River Flow -> RIVER FLOW */}
        <div
          className="flex items-center px-3 sm:px-3.5 h-full shrink-0 space-x-1.5 bg-slate-950/30 xl:justify-center"
          title={weather?.usgsSiteName ?? 'River Current Flow & Water Level'}
        >
          <Waves className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider shrink-0">
            <span className="hidden sm:inline">RIVER </span>FLOW:
          </span>
          <span className="font-bold text-emerald-300 whitespace-nowrap">
            {flowCfs ? `${flowCfs.toLocaleString()} CFS` : '41,300 CFS'}
          </span>
          {stageFt && (
            <span className="text-[11px] text-cyan-300 font-semibold whitespace-nowrap ml-0.5">
              • {stageFt.toFixed(1)} ft
            </span>
          )}
        </div>

        {/* 5. Moon & Bite Status -> MOON & BITE (Clickable for Lunar Guide) */}
        <button
          type="button"
          onClick={() => {
            if (hasMovedRef.current) return;
            onOpenMoonGuide?.();
          }}
          className={`flex items-center px-3 sm:px-3.5 h-full shrink-0 space-x-1.5 xl:justify-center cursor-pointer transition text-left group ${
            isMajorFeed
              ? 'bg-emerald-950/40 border-l border-emerald-500/40 hover:bg-emerald-900/60'
              : isMinorFeed
              ? 'bg-amber-950/40 border-l border-amber-500/40 hover:bg-amber-900/60'
              : 'bg-slate-950/30 hover:bg-indigo-950/50 hover:border-indigo-500/30'
          }`}
          title="Click to open Lunar Fishing Master Guide (auto-focused on current phase)"
        >
          <span className="text-sm shrink-0 leading-none group-hover:scale-110 transition">{moonInfo.icon}</span>
          <span className="font-bold text-white whitespace-nowrap group-hover:underline decoration-indigo-400/50 underline-offset-2">
            <span className="hidden md:inline">{moonInfo.label}</span>
            <span className="md:hidden">{moonInfo.shortLabel}</span>
          </span>
          <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap shrink-0 ${
            isMajorFeed 
              ? 'bg-emerald-400 text-slate-950 animate-pulse' 
              : isMinorFeed 
              ? 'bg-amber-400 text-slate-950' 
              : 'bg-slate-800 text-slate-400'
          }`}>
            {isMajorFeed ? '🔥 PEAK' : isMinorFeed ? '⚡ ACTIVE' : 'NORMAL'}
          </span>
          <span className="ml-1 text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition hidden lg:inline">
            GUIDE
          </span>
        </button>

        </div>
      </div>
    </div>
  );
};

export default LiveTicker;

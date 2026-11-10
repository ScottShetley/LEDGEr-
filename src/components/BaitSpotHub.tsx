import React, { useState } from 'react';
import {
  Fish,
  MapPin,
  Anchor,
  Compass,
  Waves,
  Plus,
  Navigation,
  Calendar,
  Sparkles,
  Zap,
  Info,
  ChevronRight,
} from 'lucide-react';
import { CatchLog } from '../types';

interface BaitSpotHubProps {
  catches: CatchLog[];
  onSelectCatch: (log: CatchLog) => void;
  onCenterOnMap: (lat: number, lon: number) => void;
  onOpenNewCatchModal: () => void;
}

export const BaitSpotHub: React.FC<BaitSpotHubProps> = ({
  catches,
  onSelectCatch,
  onCenterOnMap,
  onOpenNewCatchModal,
}) => {
  const [selectedBaitCategory, setSelectedBaitCategory] = useState<'all' | 'skipjack' | 'shad' | 'bluegill' | 'carp' | 'bass_crappie'>('all');

  const baitLogs = catches.filter(c => {
    if (!c.isBait) return false;
    if (selectedBaitCategory === 'skipjack') return c.species.toLowerCase().includes('skipjack');
    if (selectedBaitCategory === 'shad') return c.species.toLowerCase().includes('shad');
    if (selectedBaitCategory === 'bluegill') return c.species.toLowerCase().includes('bluegill') || c.species.toLowerCase().includes('sunfish');
    if (selectedBaitCategory === 'carp') return c.species.toLowerCase().includes('carp');
    if (selectedBaitCategory === 'bass_crappie') return c.species.toLowerCase().includes('crappie') || c.species.toLowerCase().includes('bass');
    return true;
  });

  return (
    <div id="bait-spot-hub" className="max-w-5xl mx-auto p-3 sm:p-6 space-y-5 text-slate-100 font-sans">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-lime-950/40 border border-lime-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-lime-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
            <Fish className="w-4 h-4" />
            <span>Tactical Bait Gathering Command</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight font-mono">
            Bait Spot Hub & Recon
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Locate, log, and navigate to high-yield Skipjack, Shad, and Bluegill hotspots.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewCatchModal}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 font-black font-mono text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-lime-950/50 transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Log Bait Catch / Spot</span>
        </button>
      </div>

      {/* Bait Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar font-mono text-xs">
        <button
          type="button"
          onClick={() => setSelectedBaitCategory('all')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border ${
            selectedBaitCategory === 'all'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>All Bait Spots</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedBaitCategory('skipjack')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border ${
            selectedBaitCategory === 'skipjack'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>⚡ Skipjack Herring</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait && c.species.toLowerCase().includes('skipjack')).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedBaitCategory('shad')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border ${
            selectedBaitCategory === 'shad'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>🌊 Gizzard & Threadfin Shad</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait && c.species.toLowerCase().includes('shad')).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedBaitCategory('bluegill')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border shrink-0 ${
            selectedBaitCategory === 'bluegill'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>☀️ Bluegill / Sunfish</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait && (c.species.toLowerCase().includes('bluegill') || c.species.toLowerCase().includes('sunfish'))).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedBaitCategory('carp')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border shrink-0 ${
            selectedBaitCategory === 'carp'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>🌾 Carp (Common/Grass/Asian)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait && c.species.toLowerCase().includes('carp')).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedBaitCategory('bass_crappie')}
          className={`px-3 py-2 rounded-xl font-bold transition flex items-center gap-1.5 border shrink-0 ${
            selectedBaitCategory === 'bass_crappie'
              ? 'bg-lime-500 text-slate-950 border-lime-300 font-black'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <span>🎯 Crappie &amp; Bass</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-950/40 text-[10px]">
            {catches.filter(c => c.isBait && (c.species.toLowerCase().includes('crappie') || c.species.toLowerCase().includes('bass'))).length}
          </span>
        </button>
      </div>

      {/* Bait Hotspots Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-lime-400" />
          <span>Recorded Bait Locations ({baitLogs.length})</span>
        </h2>

        {baitLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl font-mono text-slate-400 text-xs">
            <Fish className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-bold text-slate-300">No bait spots recorded in this category yet.</p>
            <p className="text-slate-500 mt-1">Tap "DROP PIN & LOG CATCH" on the map whenever you catch fresh bait!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {baitLogs.map(log => (
              <div
                key={log.id}
                onClick={() => onSelectCatch(log)}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-lime-500/50 hover:bg-slate-850 transition cursor-pointer shadow-lg group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-white font-mono">
                          {log.species}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30">
                          {log.waterDepthFeet} ft
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString()} • {log.mode.toUpperCase()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCenterOnMap(log.lat, log.lon);
                      }}
                      title="Fly to spot on map"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-lime-500 hover:text-slate-950 text-lime-400 border border-slate-700 transition"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>

                  {log.notes && (
                    <p className="text-xs text-slate-300 font-sans line-clamp-2 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      "{log.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 font-semibold">{log.current} current</span>
                    <span>•</span>
                    <span className="text-amber-400">{log.bottomStructure}</span>
                  </div>
                  <span className="text-slate-500 group-hover:text-lime-400 transition flex items-center gap-0.5 font-bold">
                    Details <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tactical Bait Strategy Quick Guide */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
        <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2 text-lime-400">
          <Zap className="w-4 h-4" />
          Field Recon: Catfish Bait Tactical Tips
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-white block mb-1">⚡ Skipjack Herring</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Focus on heavy river boils, dam discharge races, and wing dike tips. Use tandem Sabiki rigs or small white 1/8oz jigs worked erratically near surface.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-white block mb-1">🌊 Gizzard Shad</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Search shallow mud flats and tributary creek mouths on high rising water. Throw 8–10ft heavy mesh nets in 6–12ft depths. Keep aerated with salt additive.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-bold text-white block mb-1">☀️ Live Bluegill (Flathead)</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Fish rip-rap rocky banks and boat docks with light tackle and redworms. Prime bait for big Flatheads when pinned near logjams at dusk.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

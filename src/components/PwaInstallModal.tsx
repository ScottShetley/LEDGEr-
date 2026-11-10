import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Zap,
  ShieldCheck,
  Compass,
  HardDrive,
  Info,
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        if (onInstallSuccess) onInstallSuccess();
        onClose();
      }
    } catch (err) {
      console.warn('Installation prompt error:', err);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      id="pwa-install-modal"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top App Identity & Phone Icon */}
        <div className="flex items-center gap-4 pt-1">
          <div className="relative shrink-0">
            <img
              src="/icon-192.png"
              alt="BIGGUY_littleboat App Icon"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-xl border-2 border-orange-500/50 bg-white object-contain p-1"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-1 rounded-full shadow">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
                Progressive Web App (PWA)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Install LEDGEr App
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              by <span className="text-orange-400 font-bold">BIGGUY_littleboat</span>
            </p>
          </div>
        </div>

        {/* Already Installed State */}
        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>App Already Installed & Running Standalone</span>
            </div>
            <p className="text-xs text-emerald-300/90 leading-relaxed font-sans">
              LEDGEr is operating in dedicated full-screen mode on your device with full offline storage and satellite GPS telemetry enabled.
            </p>
          </div>
        ) : (
          <>
            {/* Direct Native Install Button (Chrome / Android / Edge) */}
            {deferredPrompt ? (
              <div className="space-y-3">
                <button
                  type="button"
                  id="btn-confirm-pwa-install"
                  disabled={installing}
                  onClick={handleNativeInstall}
                  className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm sm:text-base shadow-xl border border-orange-300/40 transition active:scale-[0.98] cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>{installing ? 'INSTALLING...' : 'ADD TO PHONE HOME SCREEN'}</span>
                </button>
                <p className="text-[11px] text-center text-slate-400 font-mono">
                  No app store download required • Zero storage bloat • Instant launch
                </p>
              </div>
            ) : isIOS ? (
              /* iOS Safari Step-by-Step Instructions */
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  <span>How to Install on iPhone / iPad (Safari)</span>
                </div>

                <ol className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-orange-400 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      Tap the <strong className="text-white">Share</strong> icon{' '}
                      <Share className="inline w-3.5 h-3.5 text-sky-400 align-baseline" /> at the bottom toolbar in Safari.
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-orange-400 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      Scroll down and select{' '}
                      <strong className="text-white">"Add to Home Screen"</strong>{' '}
                      <PlusSquare className="inline w-3.5 h-3.5 text-emerald-400 align-baseline" />.
                    </div>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-orange-400 font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      Tap <strong className="text-white">"Add"</strong> in the top right corner. The custom <strong>LEDGEr</strong> badge icon will appear right on your phone home screen!
                    </div>
                  </li>
                </ol>
              </div>
            ) : (
              /* General Desktop / Android Browser Guide */
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>Browser Installation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Click the <strong>Install</strong> icon in your browser address bar (top right on Chrome/Edge), or tap your browser menu <strong className="text-white">⋮</strong> and select <strong className="text-white">"Install App"</strong> / <strong className="text-white">"Add to phone"</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {/* Highlights Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>100% Offline Ready</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Runs in deep river valleys without cellular signal.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <Compass className="w-3.5 h-3.5" />
              <span>Full Screen & GPS</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Native standalone app feel with hardware GPS lock.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Secure Local Vault</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Logs & photos stored permanently on your hardware.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Private & Fast</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              No tracking, no ads, instant deck-side launch.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default PwaInstallModal;

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  Download,
  Share2,
  Copy,
  Check,
  Camera,
  Upload,
  Eye,
  EyeOff,
  MapPin,
  Shield,
  Layers,
  Sparkle,
  Image as ImageIcon,
  Award,
  Compass,
  Anchor,
  Fish,
  Calendar,
  Gauge,
  Waves,
  Moon,
  Thermometer,
  Move,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CatchLog } from '../types';
import { compressImageUnder500KB } from '../utils/imageCompressor';

interface TrophyCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  catchLog: CatchLog | null;
  allCatches?: CatchLog[];
  onUpdatePhoto?: (
    catchId: string,
    photoUrl: string,
    photoBlob?: Blob,
    framing?: {
      photoFit?: 'cover' | 'contain';
      photoPosition?: 'top' | 'center' | 'bottom';
      photoRotation?: number;
      isSynced?: boolean;
      syncedAt?: number;
    }
  ) => void;
}

export const TrophyCardModal: React.FC<TrophyCardModalProps> = ({
  isOpen,
  onClose,
  catchLog,
  allCatches,
  onUpdatePhoto,
}) => {
  // Build deck from all catches or fallback to single catch
  const deck = useMemo(() => {
    if (allCatches && allCatches.length > 0) return allCatches;
    return catchLog ? [catchLog] : [];
  }, [allCatches, catchLog]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Sync initial catch position when opened or catchLog changes
  useEffect(() => {
    if (catchLog && deck.length > 0) {
      const idx = deck.findIndex((c) => c.id === catchLog.id);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
  }, [catchLog?.id, deck]);

  const currentCatch = deck[currentIndex] || catchLog;

  // 3D Card flip state
  const [isFlipped, setIsFlipped] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>(currentCatch?.photoUrl || '');
  const [photoFit, setPhotoFit] = useState<'cover' | 'contain'>('contain');
  const [photoPosition, setPhotoPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [photoRotation, setPhotoRotation] = useState<number>(currentCatch?.photoRotation || 0);
  const [quote, setQuote] = useState<string>(
    currentCatch?.notes ||
      (currentCatch ? `Hooked on fresh ${currentCatch.baitRig} right along the river ledge during active flow.` : '')
  );
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [quoteGenerated, setQuoteGenerated] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cardTheme, setCardTheme] = useState<'vintage-gold' | 'tactical-stealth' | 'river-blue'>('vintage-gold');
  const [hideHoneyHole, setHideHoneyHole] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const isUserPhotoUploadRef = useRef<boolean>(false);

  // Sync state if currentCatch changes (switching cards in carousel)
  const [imageLoadError, setImageLoadError] = useState(false);

  const handleImageLoadError = async () => {
    if (isUserPhotoUploadRef.current) return;
    const hasPhoto = Boolean(currentCatch?.photoUrl || currentCatch?.photoBlobId);
    if (currentCatch?.id && hasPhoto) {
      try {
        const { resolvePhotoBlobUrl } = await import('../utils/indexedDb');
        const freshUrl = await resolvePhotoBlobUrl(currentCatch.id);
        if (freshUrl && freshUrl !== photoUrl) {
          setPhotoUrl(freshUrl);
          setImageLoadError(false);
          return;
        }
      } catch {
        // fallback
      }
    }
    setImageLoadError(true);
  };

  useEffect(() => {
    setImageLoadError(false);
    if (!currentCatch) return;

    // Do not clobber photo if the user is in the middle of uploading/replacing it
    if (isUserPhotoUploadRef.current) return;

    setPhotoFit('contain');
    setPhotoPosition('center');
    setPhotoRotation(currentCatch.photoRotation || 0);
    setQuote(
      currentCatch.notes ||
        `Hooked on fresh ${currentCatch.baitRig} right along the river ledge during active flow.`
    );

    const initialUrl = currentCatch.photoUrl || '';
    setPhotoUrl(initialUrl);

    // Only query IndexedDB if this catch has a stored photo and is NOT an active inline dataUrl
    const hasPhoto = Boolean(currentCatch.photoUrl || currentCatch.photoBlobId);
    const isInlineDataUrl = initialUrl.startsWith('data:');
    if (hasPhoto && currentCatch.id && !isInlineDataUrl) {
      import('../utils/indexedDb').then(({ resolvePhotoBlobUrl }) => {
        if (isUserPhotoUploadRef.current) return;
        resolvePhotoBlobUrl(currentCatch.id).then((freshUrl) => {
          if (freshUrl && !isUserPhotoUploadRef.current) {
            setPhotoUrl(freshUrl);
          }
        });
      });
    }
  }, [currentCatch?.id]);

  // Carousel navigation handlers with haptic feedback
  const goToNext = useCallback(() => {
    if (deck.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % deck.length);
    try {
      if ('vibrate' in navigator) navigator.vibrate(12);
    } catch {
      // ignore
    }
  }, [deck.length]);

  const goToPrev = useCallback(() => {
    if (deck.length <= 1) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length);
    try {
      if ('vibrate' in navigator) navigator.vibrate(12);
    } catch {
      // ignore
    }
  }, [deck.length]);

  // Touch swipe support on phone
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
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Keyboard navigation (Arrow keys + Space to flip)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === ' ' || e.key === 'f') {
        setIsFlipped((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToNext, goToPrev]);

  // Helper to persist current photo and rotation settings
  const persistFraming = (updates: {
    photoRotation?: number;
    photoUrl?: string;
    photoBlob?: Blob;
  }) => {
    if (!currentCatch) return;
    const nextPhotoUrl = updates.photoUrl !== undefined ? updates.photoUrl : photoUrl;
    const nextRot = updates.photoRotation !== undefined ? updates.photoRotation : photoRotation;

    currentCatch.photoUrl = nextPhotoUrl;
    currentCatch.photoFit = 'contain';
    currentCatch.photoPosition = 'center';
    currentCatch.photoRotation = nextRot;
    currentCatch.isSynced = false;
    currentCatch.syncedAt = undefined;

    if (onUpdatePhoto) {
      onUpdatePhoto(currentCatch.id, nextPhotoUrl, updates.photoBlob, {
        photoFit: 'contain',
        photoPosition: 'center',
        photoRotation: nextRot,
        isSynced: false,
        syncedAt: undefined,
      });
    }
  };

  if (!isOpen || !currentCatch) return null;

  const env = currentCatch.environmentalSnapshot || {};
  const isBait = currentCatch.isBait;
  const formattedDate = new Date(currentCatch.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = new Date(currentCatch.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate high-resolution species silhouette or placeholder
  const getCardNumber = () => {
    const hash = currentCatch.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `#${(hash % 900 + 100)}`;
  };

  // Handle Photo Upload / Camera selection with offline client-side compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    isUserPhotoUploadRef.current = true;
    try {
      const compressed = await compressImageUnder500KB(file);
      setPhotoUrl(compressed.dataUrl);
      setPhotoRotation(0);
      persistFraming({
        photoUrl: compressed.dataUrl,
        photoBlob: compressed.blob,
        photoRotation: 0,
      });
      setExportNotice('Photo updated & fitted to card! ✓');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.warn('Compression error in TrophyCard, falling back to direct reader:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhotoUrl(result);
          setPhotoRotation(0);
          persistFraming({
            photoUrl: result,
            photoBlob: file,
            photoRotation: 0,
          });
          setExportNotice('Photo updated & fitted to card! ✓');
          setTimeout(() => setExportNotice(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setTimeout(() => {
        isUserPhotoUploadRef.current = false;
      }, 1500);
    }
  };

  // Request AI Quote generation from backend
  const handleGenerateAiQuote = async () => {
    setIsGeneratingQuote(true);
    try {
      const res = await fetch('/api/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentCatch),
      });
      const data = await res.json();
      if (data.quote) {
        setQuote(data.quote);
        setQuoteGenerated(true);
      }
    } catch (err) {
      console.error('Failed to generate AI quote, using fallback:', err);
      setQuote(
        `Hammered fresh cut bait right along the drop-off ledge during ${env.solunarRating || 'major'} feed with flow holding steady at ${env.usgsFlowCfs ? env.usgsFlowCfs.toLocaleString() + ' CFS' : 'peak river velocity'}.`
      );
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  // Auto-generate caption for Instagram / Facebook
  const handleCopyCaption = () => {
    const caption = `🎣 2026 CHATTAHOOCHEE RIVER TROPHY CARD ${getCardNumber()}
─────────────────────────────
🏆 SPECIES: ${currentCatch.species.toUpperCase()}
⚖️ WEIGHT: ${currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : 'Unweighed'} ${currentCatch.lengthInches ? `• ${currentCatch.lengthInches} INCHES` : ''}
🪱 BAIT & RIG: ${currentCatch.baitRig} (${currentCatch.presentation})
🌊 RIVER TELEMETRY: ${env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady Flow'} | ${env.airTempF ? `${env.airTempF}°F` : '75°F'} | Baro: ${env.pressureInHg ? env.pressureInHg.toFixed(2) : '29.98'} inHg
🌕 SOLUNAR: ${env.moonPhaseName || 'Gibbous'} (${env.solunarRating || 'Major Feed'})
💬 ANGLER QUOTE: "${quote}"
─────────────────────────────
🚤 Logged with LEDGEr
#LEDGEr #ChattahoocheeRiver #Catfishing #${currentCatch.species.replace(/\s+/g, '')} #TrophyFish #RiverFishing`;

    navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  // Helper to draw a card onto a canvas with strict aspect ratio preservation (no warping)
  const drawCardCanvas = async (isFront: boolean): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    const width = 1080;
    const height = 1500;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Color Palettes
    const isGold = cardTheme === 'vintage-gold';
    const isBlue = cardTheme === 'river-blue';

    const borderPrimary = isGold ? '#D97706' : isBlue ? '#0284C7' : '#E2E8F0';
    const borderAccent = isGold ? '#FDE68A' : isBlue ? '#7DD3FC' : '#94A3B8';
    const bgCard = isGold ? '#0F172A' : isBlue ? '#082F49' : '#020617';
    const bannerBg = isGold ? '#B45309' : isBlue ? '#0369A1' : '#334155';
    const textGold = isGold ? '#FBBF24' : isBlue ? '#38BDF8' : '#F8FAFC';

    // 1. Card Outer Margin & Drop Shadow
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // 2. Main Cardstock Container (Thick Vintage Border)
    const pad = 36;
    ctx.fillStyle = bgCard;
    ctx.strokeStyle = borderPrimary;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 32);
    ctx.fill();
    ctx.stroke();

    // Inner Decorative Pinstripe
    ctx.strokeStyle = borderAccent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(pad + 12, pad + 12, width - (pad + 12) * 2, height - (pad + 12) * 2, 22);
    ctx.stroke();

    if (isFront) {
      // ================= FRONT OF CARD =================
      // Top Header Banner
      ctx.fillStyle = bannerBg;
      ctx.beginPath();
      ctx.roundRect(pad + 24, pad + 24, width - (pad + 24) * 2, 90, 16);
      ctx.fill();
      ctx.strokeStyle = borderAccent;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 34px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LEDGEr • CHATTAHOOCHEE', width / 2, pad + 80);

      // Photo Frame Container Dimensions
      const photoY = pad + 134;
      const photoH = 880;
      const photoX = pad + 24;
      const photoW = width - (pad + 24) * 2;

      ctx.fillStyle = '#020617';
      ctx.fillRect(photoX, photoY, photoW, photoH);

      // Preload image asynchronously if photo exists
      let loadedImg: HTMLImageElement | null = null;
      if (photoUrl) {
        try {
          loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = photoUrl;
          });
        } catch (e) {
          console.warn('Could not preload catch photo for canvas export:', e);
        }
      }

      if (loadedImg && loadedImg.naturalWidth > 0 && loadedImg.naturalHeight > 0) {
        // Handle optional user rotation
        let source: CanvasImageSource = loadedImg;
        let srcW = loadedImg.naturalWidth;
        let srcH = loadedImg.naturalHeight;

        if (photoRotation % 360 !== 0) {
          const rotCanvas = document.createElement('canvas');
          const isSwap = photoRotation === 90 || photoRotation === 270;
          rotCanvas.width = isSwap ? srcH : srcW;
          rotCanvas.height = isSwap ? srcW : srcH;
          const rotCtx = rotCanvas.getContext('2d');
          if (rotCtx) {
            rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            rotCtx.rotate((photoRotation * Math.PI) / 180);
            rotCtx.drawImage(loadedImg, -srcW / 2, -srcH / 2);
            source = rotCanvas;
            srcW = rotCanvas.width;
            srcH = rotCanvas.height;
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(photoX, photoY, photoW, photoH);
        ctx.clip();

        const targetRatio = photoW / photoH;
        const imgRatio = srcW / srcH;

        // FULL PHOTO FIT: Entire photo shown with zero cropping and zero distortion
        ctx.fillStyle = '#050B14';
        ctx.fillRect(photoX, photoY, photoW, photoH);

        // Subtle ambient blurred backdrop
        try {
          ctx.save();
          ctx.filter = 'blur(22px) brightness(0.35) saturate(1.2)';
          ctx.drawImage(source, photoX - 25, photoY - 25, photoW + 50, photoH + 50);
          ctx.restore();
        } catch {
          // fallback
        }

        let dw = photoW;
        let dh = photoH;
        if (imgRatio > targetRatio) {
          dw = photoW;
          dh = photoW / imgRatio;
        } else {
          dh = photoH;
          dw = photoH * imgRatio;
        }

        const dx = photoX + (photoW - dw) / 2;
        const dy = photoY + (photoH - dh) / 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 20;
        ctx.drawImage(source, 0, 0, srcW, srcH, dx, dy, dw, dh);

        ctx.restore();
      } else {
        // Silhouette placeholder
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = textGold;
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TACTICAL CATCH RECORD', width / 2, photoY + photoH / 2 - 30);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '24px sans-serif';
        ctx.fillText(`(Attach a photo in the app to stamp here)`, width / 2, photoY + photoH / 2 + 20);
      }

      // Outer Photo Border drawn cleanly on top of image
      ctx.strokeStyle = borderPrimary;
      ctx.lineWidth = 6;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Bottom Nameplate Banner
      const nameplateY = photoY + photoH + 24;
      ctx.fillStyle = bannerBg;
      ctx.beginPath();
      ctx.roundRect(photoX, nameplateY, photoW, 280, 20);
      ctx.fill();
      ctx.strokeStyle = borderAccent;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Species Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentCatch.species.toUpperCase(), width / 2, nameplateY + 70);

      // Big Stats Bar
      ctx.fillStyle = textGold;
      ctx.font = '900 42px monospace';
      const weightText = currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : 'TROPHY RECORD';
      const lengthText = currentCatch.lengthInches ? ` • ${currentCatch.lengthInches}" LENGTH` : '';
      ctx.fillText(`${weightText}${lengthText}`, width / 2, nameplateY + 140);

      // Secondary Telemetry line on front
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`BAIT: ${currentCatch.baitRig} • ${formattedDate}`, width / 2, nameplateY + 210);

    } else {
      // ================= BACK OF CARD =================
      // Header
      ctx.fillStyle = bannerBg;
      ctx.beginPath();
      ctx.roundRect(pad + 24, pad + 24, width - (pad + 24) * 2, 80, 16);
      ctx.fill();
      ctx.strokeStyle = borderAccent;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`OFFICIAL LOG #${getCardNumber().replace('#', '')}`, pad + 50, pad + 75);
      ctx.textAlign = 'right';
      ctx.fillStyle = textGold;
      ctx.fillText('2026 COLLECTION', width - pad - 50, pad + 75);

      // Big Hero Bar
      const heroY = pad + 120;
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(pad + 24, heroY, width - (pad + 24) * 2, 130, 16);
      ctx.fill();
      ctx.strokeStyle = borderPrimary;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(currentCatch.species.toUpperCase(), pad + 50, heroY + 55);

      ctx.fillStyle = textGold;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`CAUGHT: ${formattedDate} @ ${formattedTime} (${currentCatch.mode.toUpperCase()} MODE)`, pad + 50, heroY + 98);

      // Official Batting Average / Telemetry Box
      const gridY = heroY + 150;
      const gridW = width - (pad + 24) * 2;
      const gridH = 460;
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(pad + 24, gridY, gridW, gridH, 16);
      ctx.fill();
      ctx.strokeStyle = borderAccent;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Telemetry Grid Rows
      const stats = [
        { label: 'WEIGHT / LENGTH', val: `${currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : 'N/A'} • ${currentCatch.lengthInches ? `${currentCatch.lengthInches} IN` : 'N/A'}` },
        { label: 'BAIT RIG', val: `${currentCatch.baitRig}` },
        { label: 'PRESENTATION', val: `${currentCatch.presentation}` },
        { label: 'WATER DEPTH', val: `${currentCatch.waterDepthFeet} FT (${currentCatch.bottomStructure})` },
        { label: 'RIVER CURRENT', val: `${currentCatch.current} (${currentCatch.waterClarity})` },
        { label: 'USGS STREAMFLOW', val: `${env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady flow'} (${env.usgsStageFt ? `+${env.usgsStageFt} FT` : 'Normal'})` },
        { label: 'SOLUNAR FEED', val: `${env.moonPhaseName || 'Gibbous'} • ${env.solunarRating || 'Major'} Feed Window` },
        { label: 'BAROMETER / TEMP', val: `${env.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.98 inHg'} (${env.pressureTrend || 'steady'}) • ${env.airTempF ?? 75}°F` },
      ];

      ctx.font = 'bold 22px monospace';
      stats.forEach((st, idx) => {
        const rowY = gridY + 50 + idx * 52;
        ctx.fillStyle = textGold;
        ctx.textAlign = 'left';
        ctx.fillText(st.label, pad + 50, rowY);

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.fillText(st.val, width - pad - 50, rowY);

        // Divider
        if (idx < stats.length - 1) {
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pad + 40, rowY + 16);
          ctx.lineTo(width - pad - 40, rowY + 16);
          ctx.stroke();
        }
      });

      // Scouting Quote Box
      const quoteY = gridY + gridH + 20;
      const quoteH = 430;
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(pad + 24, quoteY, gridW, quoteH, 16);
      ctx.fill();
      ctx.strokeStyle = borderPrimary;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = textGold;
      ctx.font = '900 24px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ANGLER SCOUTING REPORT & QUOTE:', pad + 50, quoteY + 46);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'italic 28px sans-serif';
      
      // Wrap quote text nicely
      const words = `"${quote}"`.split(' ');
      let line = '';
      let lineY = quoteY + 105;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > gridW - 60 && n > 0) {
          ctx.fillText(line, pad + 50, lineY);
          line = words[n] + ' ';
          lineY += 42;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, pad + 50, lineY);

      // River Honey-Hole Privacy Badge at bottom
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(pad + 50, quoteY + quoteH - 95, gridW - 52, 60, 10);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      const locationString = hideHoneyHole
        ? '📍 CHATTAHOOCHEE RIVER BASIN (HONEY-HOLE HIDDEN 🔒)'
        : `📍 HONEY-HOLE GPS: ${currentCatch.lat.toFixed(5)}°, ${currentCatch.lon.toFixed(5)}°`;
      ctx.fillText(locationString, width / 2, quoteY + quoteH - 58);
    }

    return canvas;
  };

  // Direct Native Mobile Share (Web Share API) or in-app Social Share Carousel Preview
  const handleNativeShare = async () => {
    setIsExporting(true);
    setExportNotice('Preparing card images for social share...');
    try {
      const frontCanvas = await drawCardCanvas(true);
      const backCanvas = await drawCardCanvas(false);

      const frontBlobPromise = new Promise<Blob | null>((res) => frontCanvas.toBlob(res, 'image/png'));
      const backBlobPromise = new Promise<Blob | null>((res) => backCanvas.toBlob(res, 'image/png'));
      const [frontBlob, backBlob] = await Promise.all([frontBlobPromise, backBlobPromise]);

      const filesToShare: File[] = [];
      if (frontBlob) filesToShare.push(new File([frontBlob], `TrophyCard-${currentCatch.species.replace(/\s+/g, '')}-Front.png`, { type: 'image/png' }));
      if (backBlob) filesToShare.push(new File([backBlob], `TrophyCard-${currentCatch.species.replace(/\s+/g, '')}-Back.png`, { type: 'image/png' }));

      const shareData = {
        title: `${currentCatch.species} 2026 Trophy Card`,
        text: `🎣 ${currentCatch.species} (${currentCatch.weightLbs ? `${currentCatch.weightLbs} lbs` : 'Trophy Catch'}) - "${quote}"\n\nLogged with LEDGEr`,
        files: filesToShare,
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        setExportNotice('✓ Shared successfully to your social app!');
        setTimeout(() => setExportNotice(null), 3000);
      } else {
        // Open the in-app Social Share & Preview Dialog
        setShowSharePreview(true);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setShowSharePreview(true);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Render Front Card to an HTML5 Canvas and download PNG
  const exportCardAsPng = async (side: 'front' | 'back' | 'both') => {
    setIsExporting(true);
    setExportNotice(`Preparing ${side === 'both' ? '2-Image Carousel Pack' : `${side} card`}...`);

    try {
      if (side === 'front' || side === 'both') {
        const frontCanvas = await drawCardCanvas(true);
        const link = document.createElement('a');
        link.download = `TrophyCard-${currentCatch.species.replace(/\s+/g, '')}-Front-${getCardNumber().replace('#', '')}.png`;
        link.href = frontCanvas.toDataURL('image/png');
        link.click();
      }

      if (side === 'back' || side === 'both') {
        if (side === 'both') {
          await new Promise((res) => setTimeout(res, 350));
        }
        const backCanvas = await drawCardCanvas(false);
        const link = document.createElement('a');
        link.download = `TrophyCard-${currentCatch.species.replace(/\s+/g, '')}-Back-${getCardNumber().replace('#', '')}.png`;
        link.href = backCanvas.toDataURL('image/png');
        link.click();
      }

      setExportNotice('✓ Card exported in 1080×1500 high-res format (distortion-free)!');
      setTimeout(() => setExportNotice(null), 3000);
    } catch (e) {
      console.error('Export error:', e);
      setExportNotice('Failed to export image.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="trophy-card-studio-modal"
      className={`fixed inset-0 z-[2500] flex items-center justify-center ${
        isTheaterMode ? 'bg-slate-950/98 backdrop-blur-2xl p-0 sm:p-2' : 'bg-black/95 backdrop-blur-lg p-2 sm:p-4'
      } overflow-y-auto`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${
          isTheaterMode
            ? 'max-w-4xl h-full flex flex-col justify-between rounded-none sm:rounded-2xl border-0 sm:border border-slate-800'
            : 'max-w-4xl max-h-[96vh] flex flex-col rounded-2xl border border-amber-500/40'
        } bg-slate-900 shadow-2xl overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200`}
      >
        {/* Modal Top Bar */}
        <div className="p-2.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-xs sm:text-lg text-white font-mono uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <span>{isTheaterMode ? 'SHOWCASE THEATER' : 'TACTICAL BASEBALL CARD STUDIO'}</span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {getCardNumber()}
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 hidden xs:block">
                {isTheaterMode
                  ? 'Edge-to-edge phone showcase • Zero vertical scrolling • 3D flip card'
                  : 'Interactive 3D Flippable Catch Card • 2-Image Carousel Pack for Instagram & Facebook'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              id="trophy-theater-toggle-btn"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white transition cursor-pointer border border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95"
              title={isTheaterMode ? 'Return to Studio Editor' : 'Full Screen Phone Theater'}
            >
              {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isTheaterMode ? 'Exit Theater' : 'Theater Mode'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body: Interactive 3D Card Stage + Customization Controls */}
        <div className={`flex-1 min-h-0 ${isTheaterMode ? 'overflow-y-auto sm:overflow-hidden flex flex-col justify-between p-2 sm:p-3' : 'overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5'}`}>
          
          {/* LEFT: 3D Flippable Card Carousel Stage */}
          <div className={`${isTheaterMode ? 'w-full flex-1 flex flex-col items-center justify-between min-h-0' : 'lg:col-span-7 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80'}`}>
            
            {/* Carousel Deck Navigation Top Bar */}
            <div className="w-full flex items-center justify-between mb-1.5 px-1 sm:px-2 gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="trophy-carousel-prev-btn"
                  onClick={goToPrev}
                  disabled={deck.length <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-amber-400 font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700 shadow-sm"
                  title="Previous card (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">PREV</span>
                </button>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px]">
                  <span className="text-slate-400">CARD</span>
                  <span className="text-amber-400 font-black">{currentIndex + 1}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-slate-300 font-bold">{deck.length}</span>
                </div>

                <button
                  type="button"
                  id="trophy-carousel-next-btn"
                  onClick={goToNext}
                  disabled={deck.length <= 1}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-amber-400 font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700 shadow-sm"
                  title="Next card (Right Arrow)"
                >
                  <span className="hidden sm:inline">NEXT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Flip Action Button */}
              <button
                type="button"
                id="flip-3d-card-btn"
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Flip to {isFlipped ? 'Front' : 'Back (Stats)'}</span>
              </button>
            </div>

            {/* 3D Card Carousel Stage with Floating Nav Chevrons and Touch Swipe */}
            <div
              className="relative w-full flex-1 flex items-center justify-center my-1 min-h-0 select-none overflow-visible"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Floating Left Advance Arrow */}
              {deck.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  aria-label="Previous card"
                  className="absolute left-1 sm:left-4 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 shadow-xl transition cursor-pointer backdrop-blur-sm -translate-y-1/2 top-1/2 active:scale-90"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}

              {/* 3D Card Container with Perspective: proportional viewport-relative height so it never eclipses dock controls */}
              <div
                className={`relative w-auto ${
                  isTheaterMode
                    ? 'h-[44dvh] sm:h-[54dvh] max-h-[460px]'
                    : 'h-[44dvh] sm:h-[52dvh] max-h-[460px]'
                } aspect-[2.5/3.5] max-w-[85vw] sm:max-w-[420px] cursor-pointer select-none group shrink-0`}
                style={{ perspective: '1200px' }}
                onClick={() => setIsFlipped(!isFlipped)}
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
                    ref={cardFrontRef}
                    className={`absolute inset-0 w-full h-full rounded-2xl p-3 border-4 shadow-2xl flex flex-col justify-between overflow-hidden bg-slate-950 ${
                      cardTheme === 'vintage-gold'
                        ? 'border-amber-500 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 text-amber-400'
                        : cardTheme === 'river-blue'
                        ? 'border-sky-500 bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950/40 text-sky-400'
                        : 'border-slate-400 bg-slate-950 text-slate-200'
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Top Team Banner */}
                    <div className="bg-amber-600 text-white py-1 px-3 rounded-lg border border-amber-300 shadow flex items-center justify-center">
                      <span className="font-black text-[11px] font-mono tracking-wider">LEDGEr</span>
                    </div>

                    {/* Center Action Shot */}
                    <div className="relative flex-1 my-2 rounded-xl overflow-hidden border-2 border-amber-500/80 bg-slate-900 flex items-center justify-center group/photo">
                      {photoUrl && !imageLoadError ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
                          {/* Ambient blurred backdrop for letterbox framing */}
                          <img
                            src={photoUrl}
                            alt=""
                            aria-hidden="true"
                            onError={handleImageLoadError}
                            className="absolute inset-0 w-full h-full object-cover blur-md brightness-35 scale-125 pointer-events-none"
                            style={{ transform: `rotate(${photoRotation}deg)` }}
                          />
                          {/* Sharp distortion-free uncropped photo */}
                          <img
                            src={photoUrl}
                            alt="Catch Trophy"
                            onError={handleImageLoadError}
                            className="relative z-10 max-w-full max-h-full object-contain shadow-2xl transition-all duration-200"
                            style={{ transform: `rotate(${photoRotation}deg)` }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <Fish className="w-16 h-16 text-amber-500/40 mb-2 animate-pulse" />
                          <span className="font-mono text-xs font-bold text-amber-300">TACTICAL TROPHY PHOTO</span>
                          <span className="text-[10px] text-slate-400 mt-1">Tap 'Add Photo' to upload a catch picture</span>
                        </div>
                      )}

                      {/* Tap overlay */}
                      <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition flex items-center justify-center text-white text-xs font-mono font-bold">
                        Click to flip card ↷
                      </div>
                    </div>

                    {/* Bottom Nameplate */}
                    <div className="bg-slate-900/95 border-2 border-amber-500/80 rounded-xl p-2.5 shadow-lg text-center font-mono">
                      <div className="font-black text-sm sm:text-base text-white tracking-wide uppercase font-sans">
                        {currentCatch.species}
                      </div>
                      <div className="text-amber-400 font-black text-xs sm:text-sm tracking-wider my-0.5">
                        {currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : 'TROPHY RECORD'}
                        {currentCatch.lengthInches ? ` • ${currentCatch.lengthInches}"` : ''}
                      </div>
                      <div className="text-[10px] text-slate-300 truncate">
                        {currentCatch.baitRig} • {formattedDate}
                      </div>
                    </div>
                  </div>

                  {/* ================= CARD BACK ================= */}
                  <div
                    ref={cardBackRef}
                    className={`absolute inset-0 w-full h-full rounded-2xl p-3 border-4 shadow-2xl flex flex-col justify-between overflow-hidden bg-slate-950 ${
                      cardTheme === 'vintage-gold'
                        ? 'border-amber-500 bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950/40 text-amber-400'
                        : cardTheme === 'river-blue'
                        ? 'border-sky-500 bg-gradient-to-b from-slate-950 via-slate-900 to-sky-950/40 text-sky-400'
                        : 'border-slate-400 bg-slate-950 text-slate-200'
                    }`}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 0 2px rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {/* Header */}
                    <div className="bg-amber-600 text-white py-1 px-2.5 rounded-lg border border-amber-300 shadow flex items-center justify-between font-mono text-[10px]">
                      <span className="font-black">LOG {getCardNumber()}</span>
                      <span className="font-bold">2026 COLLECTION</span>
                    </div>

                    {/* Hero Specs Bar */}
                    <div className="my-1.5 p-2 rounded-lg bg-slate-900 border border-amber-500/50 flex items-center justify-between">
                      <div>
                        <span className="text-white font-extrabold text-xs block uppercase font-sans">
                          {currentCatch.species}
                        </span>
                        <span className="text-[9px] text-amber-400 font-mono">
                          {formattedDate} • {formattedTime} ({currentCatch.mode.toUpperCase()})
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs font-black text-amber-300 block">
                          {currentCatch.weightLbs ? `${currentCatch.weightLbs} LBS` : 'RECORD'}
                        </span>
                        <span className="text-[9px] text-slate-300">
                          {currentCatch.lengthInches ? `${currentCatch.lengthInches} IN` : 'LENGTH N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Official Batting Average Stats Grid */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-[10px] font-mono space-y-1">
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">BAIT / RIG</span>
                        <span className="text-white font-medium truncate max-w-[170px]">{currentCatch.baitRig}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">PRESENTATION</span>
                        <span className="text-white font-medium truncate max-w-[170px]">{currentCatch.presentation}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">WATER DEPTH</span>
                        <span className="text-white font-medium">{currentCatch.waterDepthFeet} FT ({currentCatch.bottomStructure})</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">CURRENT / CLARITY</span>
                        <span className="text-white font-medium">{currentCatch.current} • {currentCatch.waterClarity}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">STREAMFLOW</span>
                        <span className="text-sky-400 font-medium">
                          {env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady flow'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800 pb-0.5">
                        <span className="text-amber-400 font-bold">SOLUNAR FEED</span>
                        <span className="text-amber-300 font-medium">{env.moonPhaseName || 'Gibbous'} ({env.solunarRating || 'Major'})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-400 font-bold">BARO / TEMP</span>
                        <span className="text-white font-medium">{env.pressureInHg ? `${env.pressureInHg.toFixed(2)} inHg` : '29.98 inHg'} • {env.airTempF ?? 75}°F</span>
                      </div>
                    </div>

                    {/* Scouting Quote Section */}
                    <div className="my-1.5 p-2 rounded-lg bg-slate-900 border border-amber-500/50 flex-1 flex flex-col justify-center">
                      <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider block mb-1">
                        ANGLER SCOUTING REPORT:
                      </span>
                      <p className="text-[11px] font-serif italic text-slate-100 leading-tight">
                        "{quote}"
                      </p>
                    </div>

                    {/* River Honey-Hole Privacy Badge */}
                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-center font-mono text-[9px] text-slate-400">
                      {hideHoneyHole ? (
                        <span className="flex items-center justify-center gap-1 text-slate-400">
                          <span className="text-amber-400">🔒</span>
                          <span>CHATTAHOOCHEE RIVER BASIN (HONEY-HOLE HIDDEN)</span>
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-slate-300">
                          <span className="text-emerald-400">📍</span>
                          <span className="font-bold text-amber-300">HONEY-HOLE GPS:</span>
                          <span>{currentCatch.lat.toFixed(5)}°, {currentCatch.lon.toFixed(5)}°</span>
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Floating Right Advance Arrow */}
              {deck.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  aria-label="Next card"
                  className="absolute right-1 sm:right-4 z-30 p-2 sm:p-2.5 rounded-full bg-slate-900/90 hover:bg-amber-500 hover:text-slate-950 text-amber-400 border border-amber-500/40 shadow-xl transition cursor-pointer backdrop-blur-sm -translate-y-1/2 top-1/2 active:scale-90"
                >
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Quick Touch / Keyboard Navigation Helper */}
            <p className="text-[10px] text-slate-400 mt-1 sm:mt-2 font-mono text-center shrink-0">
              💡 Tap card to flip • Swipe left/right or use ← / → arrows to browse deck
            </p>

            {/* Quick Jump Thumbnail Filmstrip */}
            {deck.length > 1 && (
              <div className="w-full mt-2 pt-2 border-t border-slate-800/80 shrink-0">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1 flex items-center justify-between px-1">
                  <span>DECK FILMSTRIP ({deck.length} CATCHES):</span>
                  <span className="text-amber-400 font-bold">TAP TO JUMP</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 touch-pan-x">
                  {deck.map((item, idx) => {
                    const isSelected = idx === currentIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setIsFlipped(false);
                          setCurrentIndex(idx);
                          try {
                            if ('vibrate' in navigator) navigator.vibrate(10);
                          } catch {}
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs transition-all shrink-0 cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-300 shadow-md scale-105'
                            : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                        }`}
                      >
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-slate-950' : 'text-amber-400'}`}>
                          #{idx + 1}
                        </span>
                        <span className="truncate max-w-[80px] sm:max-w-[100px] font-sans font-semibold">
                          {item.species.replace(' Catfish', '')}
                        </span>
                        {item.weightLbs && (
                          <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-200'}`}>
                            {item.weightLbs}#
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Action Dock when in Fullscreen Theater Mode */}
            {isTheaterMode && (
              <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-800/80 flex-wrap shrink-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Flip to {isFlipped ? 'Front' : 'Stats'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isExporting}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportCardAsPng('both')}
                  disabled={isExporting}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>2-Card Pack PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTheaterMode(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-mono text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Card Studio</span>
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Customization Studio Controls (Col 5) */}
          {!isTheaterMode && (
            <div className="lg:col-span-5 flex flex-col space-y-3.5">
            
            {/* 1. Photo Attachment Controls */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>1. Catch Photo</span>
                </span>
                {photoUrl && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Aspect Ratio Locked</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{photoUrl ? 'Change Photo' : 'Upload Fish Photo'}</span>
                </button>

                {photoUrl && (
                  <>
                    <button
                      type="button"
                      title="Rotate photo 90 degrees clockwise"
                      onClick={() => {
                        const nextRot = (photoRotation + 90) % 360;
                        setPhotoRotation(nextRot);
                        persistFraming({ photoRotation: nextRot });
                      }}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono text-xs font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoUrl('');
                        setPhotoRotation(0);
                        persistFraming({ photoUrl: '', photoRotation: 0 });
                      }}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-bold border border-slate-700 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>

              {photoUrl && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Full Photo Fit (100% Uncropped)</span>
                  </span>
                  <span>Use 90° to fix orientation</span>
                </div>
              )}
            </div>

            {/* 2. AI Angler Scouting Quote Generator */}
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>2. Back Card Scouting Quote</span>
                </span>
                <button
                  type="button"
                  onClick={handleGenerateAiQuote}
                  disabled={isGeneratingQuote}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-[10px] uppercase transition flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isGeneratingQuote ? 'Synthesizing...' : 'AI Generate Quote'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Type or edit the scouting quote for the back of your baseball card..."
                className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-serif text-slate-100 focus:border-amber-500 outline-none resize-none leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 italic">
                {quoteGenerated
                  ? '✨ Generated by Gemini AI based on your real moon phase, streamflow, depth, and bait telemetry.'
                  : '💡 You can freely edit this quote anytime.'}
              </p>
            </div>

            {/* 3. Style & Privacy Toggles */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                3. Card Theme & Honey-Hole Privacy
              </span>

              {/* Theme Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'vintage-gold', label: 'Vintage Gold', color: 'border-amber-500 text-amber-400' },
                  { id: 'river-blue', label: 'River Blue', color: 'border-sky-500 text-sky-400' },
                  { id: 'tactical-stealth', label: 'Stealth Ops', color: 'border-slate-500 text-slate-200' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCardTheme(t.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-center font-mono text-xs font-bold border transition cursor-pointer ${
                      cardTheme === t.id
                        ? 'bg-slate-800 border-amber-400 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Honey-Hole Privacy Toggle */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Honey-Hole Location</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      id="honey-hole-visible-btn"
                      onClick={() => setHideHoneyHole(false)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                        !hideHoneyHole
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Show Honey-Hole GPS on card"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Visible</span>
                    </button>
                    <button
                      type="button"
                      id="honey-hole-hide-btn"
                      onClick={() => setHideHoneyHole(true)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 ${
                        hideHoneyHole
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Hide Honey-Hole GPS on card"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Hide</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {!hideHoneyHole
                    ? '✓ Honey-hole GPS is visible on card. Tap "Hide" to mask coordinates before sharing.'
                    : '🔒 Honey-hole GPS is hidden & masked with river basin region.'}
                </p>
              </div>
            </div>

            {/* 4. Export & Carousel Pack Actions */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider block">
                4. Social Media Sharing & Carousel Export
              </span>

              {/* Primary Dedicated Share Button */}
              <button
                type="button"
                id="native-share-social-btn"
                onClick={handleNativeShare}
                disabled={isExporting}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>📲 Share Card to Social Apps (Instagram / FB)</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  id="export-front-card-btn"
                  onClick={() => exportCardAsPng('front')}
                  disabled={isExporting}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Front PNG</span>
                </button>

                <button
                  type="button"
                  id="export-back-card-btn"
                  onClick={() => exportCardAsPng('back')}
                  disabled={isExporting}
                  className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Back PNG</span>
                </button>

                <button
                  type="button"
                  id="export-both-carousel-btn"
                  onClick={() => exportCardAsPng('both')}
                  disabled={isExporting}
                  className="py-2 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-black transition flex items-center justify-center gap-1 shadow cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>2-Card Pack</span>
                </button>
              </div>

              {exportNotice && (
                <div className="p-2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs text-center animate-in fade-in">
                  {exportNotice}
                </div>
              )}

              {/* Copy Auto Caption */}
              <button
                type="button"
                id="copy-card-caption-btn"
                onClick={handleCopyCaption}
                className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedCaption ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4 text-sky-400" />}
                <span>{copiedCaption ? '✓ Social Caption Copied to Clipboard!' : 'Copy Instagram / Facebook Caption'}</span>
              </button>
            </div>

          </div>
        )}

        </div>

      </div>

      {/* 2-Slide Shared Carousel Visual Preview Dialog */}
      {showSharePreview && (
        <div
          className="fixed inset-0 z-[2600] flex items-center justify-center bg-black/90 p-4 animate-in fade-in"
          onClick={() => setShowSharePreview(false)}
        >
          <div
            className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl text-slate-100 font-mono space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white uppercase">
                  Social Carousel Shared Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSharePreview(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Card Shared Carousel Visual Preview */}
            <div>
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-2">
                2-Slide Carousel Preview (Swipe on Instagram / Facebook):
              </span>
              <div className="grid grid-cols-2 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {/* Slide 1: Front */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-amber-400 mb-1">SLIDE 1: FRONT PHOTO</span>
                  <div className="w-full aspect-[2.5/3.5] rounded-lg bg-slate-900 border border-amber-500/60 flex flex-col p-1.5 justify-between text-center overflow-hidden shadow">
                    <div className="bg-amber-600 text-[8px] text-white font-bold rounded py-0.5">LEDGEr</div>
                    <div className="flex-1 my-1 rounded bg-slate-950 flex items-center justify-center overflow-hidden relative">
                      {photoUrl ? (
                        photoFit === 'contain' ? (
                          <img
                            src={photoUrl}
                            alt="Front Preview"
                            className="max-w-full max-h-full object-contain"
                            style={{ transform: `rotate(${photoRotation}deg)` }}
                          />
                        ) : (
                          <img
                            src={photoUrl}
                            alt="Front Preview"
                            className={`w-full h-full object-cover ${
                              photoPosition === 'top'
                                ? 'object-top'
                                : photoPosition === 'bottom'
                                ? 'object-bottom'
                                : 'object-[center_25%]'
                            }`}
                            style={{ transform: `rotate(${photoRotation}deg)` }}
                          />
                        )
                      ) : (
                        <Fish className="w-8 h-8 text-amber-500/50" />
                      )}
                    </div>
                    <div className="bg-slate-950 text-[9px] font-black text-amber-400 rounded py-0.5">
                      {currentCatch.species.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Slide 2: Back */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-amber-400 mb-1">SLIDE 2: STATS & QUOTE</span>
                  <div className="w-full aspect-[2.5/3.5] rounded-lg bg-slate-900 border border-amber-500/60 flex flex-col p-2 justify-between text-[8px] overflow-hidden shadow">
                    <div className="bg-amber-600 text-white font-bold rounded py-0.5 text-center text-[7px]">OFFICIAL LOG {getCardNumber()}</div>
                    <div className="my-1 bg-slate-950 p-1.5 rounded space-y-1 text-[7px]">
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>FLOW:</span>
                        <span className="text-white">{env.usgsFlowCfs ? `${env.usgsFlowCfs.toLocaleString()} CFS` : 'Steady'}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>MOON:</span>
                        <span className="text-white">{env.moonPhaseName || 'Gibbous'}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>DEPTH:</span>
                        <span className="text-white">{currentCatch.waterDepthFeet} FT</span>
                      </div>
                    </div>
                    <div className="bg-slate-950 text-[8px] italic text-slate-200 rounded p-1 line-clamp-3 leading-snug">
                      "{quote}"
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Share Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  exportCardAsPng('both');
                  handleCopyCaption();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                <Download className="w-4 h-4" />
                <span>Download 2-Slide Pack & Copy Caption</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
                    window.open(url, '_blank');
                  }}
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Facebook Web</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>{copiedCaption ? '✓ Copied' : 'Copy Caption'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useMemo } from 'react';

export type DialConditionRating = 'GREAT' | 'GOOD' | 'POOR';

export interface FishingBarometerDialProps {
  /** Current (or simulated) barometric pressure in inHg */
  pressureInHg: number;
  /** Current barometric pressure in millibars / hPa */
  pressureHpa: number;
  /** Reference pressure for the brass/gold set-hand needle (3h ago or pinned launch pressure) */
  referencePressureInHg: number;
  /** Label describing what the gold reference needle represents */
  referenceLabel: string;
  /** Active trend direction */
  trend: 'rising' | 'falling' | 'steady';
  /** Optional click handler on the center brass knob (e.g., to pin current pressure) */
  onCenterKnobClick?: () => void;
  /** Optional className for sizing */
  className?: string;
}

const CX = 250;
const CY = 250;

/**
 * Maps inHg to dial degrees where 30.00 inHg = 0° (12 o'clock),
 * 29.00 inHg = -95°, and 31.00 inHg = +95°.
 */
export function pressureToAngleDeg(inHg: number): number {
  const clamped = Math.min(Math.max(inHg, 28.92), 31.08);
  return (clamped - 30.0) * 95;
}

/**
 * Evaluates the TRAC-style general fishing condition zone from barometric pressure.
 */
export function getDialConditionRating(inHg: number): DialConditionRating {
  if (inHg >= 29.78 && inHg <= 30.42) return 'GREAT';
  if ((inHg >= 29.67 && inHg < 29.78) || (inHg > 30.42 && inHg <= 30.92)) return 'GOOD';
  return 'POOR';
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createAnnularSectorPath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number
): string {
  const outerStart = polarToCartesian(cx, cy, rOuter, startDeg);
  const outerEnd = polarToCartesian(cx, cy, rOuter, endDeg);
  const innerEnd = polarToCartesian(cx, cy, rInner, endDeg);
  const innerStart = polarToCartesian(cx, cy, rInner, startDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;

  return [
    `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)}`,
    `L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function createBezelLugsPath(cx: number, cy: number): string {
  // 12 chunky grip lugs spaced every 30 degrees, offset by 15 degrees so two frame the top cleanly
  const lugs = 12;
  const rValley = 221;
  const rPeak = 242;
  const points: string[] = [];

  for (let i = 0; i < lugs; i++) {
    const center = i * 30 + 15;
    const vStart = center - 15;
    const pStart = center - 8.5;
    const pEnd = center + 8.5;
    const vEnd = center + 15;

    const ptV1 = polarToCartesian(cx, cy, rValley, vStart);
    const ptP1 = polarToCartesian(cx, cy, rPeak, pStart);
    const ptP2 = polarToCartesian(cx, cy, rPeak, pEnd);
    const ptV2 = polarToCartesian(cx, cy, rValley, vEnd);

    const c1 = polarToCartesian(cx, cy, rPeak + 2, pStart - 2);
    const c2 = polarToCartesian(cx, cy, rPeak + 2, pEnd + 2);

    if (i === 0) {
      points.push(`M ${ptV1.x.toFixed(2)} ${ptV1.y.toFixed(2)}`);
    }
    points.push(`Q ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${ptP1.x.toFixed(2)} ${ptP1.y.toFixed(2)}`);
    points.push(`A ${rPeak} ${rPeak} 0 0 1 ${ptP2.x.toFixed(2)} ${ptP2.y.toFixed(2)}`);
    points.push(`Q ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${ptV2.x.toFixed(2)} ${ptV2.y.toFixed(2)}`);
  }

  points.push('Z');
  return points.join(' ');
}

function createKnurledCapPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number): string {
  const parts: string[] = [];
  const step = 360 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a1 = i * step;
    const a2 = a1 + step * 0.5;
    const p1 = polarToCartesian(cx, cy, rOuter, a1);
    const p2 = polarToCartesian(cx, cy, rInner, a2);
    parts.push(`${i === 0 ? 'M' : 'L'} ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
    parts.push(`L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

export const FishingBarometerDial: React.FC<FishingBarometerDialProps> = ({
  pressureInHg,
  pressureHpa,
  referencePressureInHg,
  referenceLabel,
  trend,
  onCenterKnobClick,
  className = '',
}) => {
  const redAngle = pressureToAngleDeg(pressureInHg);
  const goldAngle = pressureToAngleDeg(referencePressureInHg);
  const dialCondition = getDialConditionRating(pressureInHg);
  const deltaInHg = pressureInHg - referencePressureInHg;
  const absDelta = Math.abs(deltaInHg);

  // Determine which TRAC trend row is currently highlighted
  const activeTrendRow = useMemo(() => {
    if (pressureInHg < 29.55) return 'very_low';
    if (absDelta >= 0.08) return 'rapid';
    if (trend === 'rising') return 'rising';
    if (trend === 'falling') return 'falling';
    return 'unchanging';
  }, [pressureInHg, absDelta, trend]);

  // Precompute static dial geometry once
  const dialGeometry = useMemo(() => {
    const bezelPath = createBezelLugsPath(CX, CY);
    const knurledPath = createKnurledCapPath(CX, CY, 22, 20.3, 40);

    // 5 contiguous color-coded fishing zones matching the TRAC dial silhouette
    const leftPoorPath = createAnnularSectorPath(CX, CY, 113, 178, -104, -31.35);
    const leftGoodPath = createAnnularSectorPath(CX, CY, 96, 178, -31.35, -20.9);
    const centerGreatPath = createAnnularSectorPath(CX, CY, 44, 178, -20.9, 39.9);
    const rightGoodPath = createAnnularSectorPath(CX, CY, 96, 178, 39.9, 87.4);
    const rightPoorPath = createAnnularSectorPath(CX, CY, 113, 178, 87.4, 104);

    // Outer inHg ticks (29.00 to 31.00 in 0.01 steps = 201 ticks)
    const inHgTicks: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      key: number;
    }> = [];

    for (let i = 0; i <= 200; i++) {
      const val = 29 + i * 0.01;
      const deg = pressureToAngleDeg(val);
      const isMajor = i % 10 === 0;
      const isMedium = !isMajor && i % 5 === 0;

      const rStart = 143.5;
      const rEnd = isMajor ? 154.5 : isMedium ? 151.5 : 148.5;
      const p1 = polarToCartesian(CX, CY, rStart, deg);
      const p2 = polarToCartesian(CX, CY, rEnd, deg);

      inHgTicks.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        width: isMajor ? 1.75 : isMedium ? 1.15 : 0.7,
        key: i,
      });
    }

    // Outer inHg labels (29, 1..9, 30, 1..9, 31)
    const inHgLabels: Array<{
      x: number;
      y: number;
      deg: number;
      text: string;
      isWhole: boolean;
      key: number;
    }> = [];

    for (let i = 0; i <= 20; i++) {
      const val = 29 + i * 0.1;
      const deg = pressureToAngleDeg(val);
      const isWhole = i === 0 || i === 10 || i === 20;
      const text = i === 0 ? '29' : i === 10 ? '30' : i === 20 ? '31' : String(i % 10);
      const pos = polarToCartesian(CX, CY, isWhole ? 165 : 164.5, deg);
      inHgLabels.push({
        x: pos.x,
        y: pos.y,
        deg,
        text,
        isWhole,
        key: i,
      });
    }

    // Inner Millibar ticks (980 to 1050 in 2 mb steps)
    const mbTicks: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      width: number;
      key: number;
    }> = [];

    for (let mb = 980; mb <= 1050; mb += 2) {
      const inHg = mb / 33.86389;
      const deg = (inHg - 30.0) * 95;
      const isMajor = mb % 10 === 0;
      const rStart = 141.5;
      const rEnd = isMajor ? 133.5 : 137.5;
      const p1 = polarToCartesian(CX, CY, rStart, deg);
      const p2 = polarToCartesian(CX, CY, rEnd, deg);
      mbTicks.push({
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        width: isMajor ? 1.5 : 0.8,
        key: mb,
      });
    }

    // Inner Millibar labels (980..1050 every 10 mb)
    const mbLabels: Array<{
      x: number;
      y: number;
      deg: number;
      text: string;
      key: number;
    }> = [];

    for (let mb = 980; mb <= 1050; mb += 10) {
      const inHg = mb / 33.86389;
      const deg = (inHg - 30.0) * 95;
      const pos = polarToCartesian(CX, CY, 123, deg);
      mbLabels.push({
        x: pos.x,
        y: pos.y,
        deg,
        text: String(mb),
        key: mb,
      });
    }

    const inHgUnitPos = polarToCartesian(CX, CY, 165, -102);
    const mbUnitPos = polarToCartesian(CX, CY, 124, -85);

    return {
      bezelPath,
      knurledPath,
      leftPoorPath,
      leftGoodPath,
      centerGreatPath,
      rightGoodPath,
      rightPoorPath,
      inHgTicks,
      inHgLabels,
      mbTicks,
      mbLabels,
      inHgUnitPos,
      mbUnitPos,
    };
  }, []);

  const signedDeltaText =
    Math.abs(deltaInHg) < 0.005
      ? '0.00'
      : `${deltaInHg > 0 ? '+' : ''}${deltaInHg.toFixed(2)}`;

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 500 500"
        className="w-full h-auto drop-shadow-[0_18px_36px_rgba(0,0,0,0.65)]"
        role="img"
        aria-label={`Fishing barometer reading ${pressureInHg.toFixed(2)} inches of mercury (${Math.round(pressureHpa)} millibars), condition ${dialCondition}, trend ${trend}`}
      >
        <defs>
          {/* Matte rugged rubber bezel gradient */}
          <radialGradient id="baro-rubber-outer" cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#3c4047" />
            <stop offset="45%" stopColor="#23262b" />
            <stop offset="85%" stopColor="#14161a" />
            <stop offset="100%" stopColor="#0a0b0d" />
          </radialGradient>

          {/* Inner chamfered bezel ring */}
          <linearGradient id="baro-bezel-lip" x1="20%" y1="10%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#464b54" />
            <stop offset="35%" stopColor="#1e2126" />
            <stop offset="70%" stopColor="#0c0e11" />
            <stop offset="100%" stopColor="#2c3037" />
          </linearGradient>

          {/* Deep matte black dial face */}
          <radialGradient id="baro-dial-bg" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#14181f" />
            <stop offset="65%" stopColor="#090b0f" />
            <stop offset="100%" stopColor="#040507" />
          </radialGradient>

          {/* Zone gradients for subtle printed-plate depth */}
          <radialGradient id="baro-zone-great" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#65c4f4" />
            <stop offset="100%" stopColor="#4bb0e5" />
          </radialGradient>
          <radialGradient id="baro-zone-good" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#478fdd" />
            <stop offset="100%" stopColor="#3576c4" />
          </radialGradient>
          <radialGradient id="baro-zone-poor" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#9aa1a8" />
            <stop offset="100%" stopColor="#7f868d" />
          </radialGradient>

          {/* Metallic gold reference needle */}
          <linearGradient id="baro-gold-needle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9d7723" />
            <stop offset="45%" stopColor="#f3da88" />
            <stop offset="100%" stopColor="#b0872c" />
          </linearGradient>

          {/* Red primary pressure needle */}
          <linearGradient id="baro-red-needle" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c52216" />
            <stop offset="45%" stopColor="#ff533d" />
            <stop offset="100%" stopColor="#d42719" />
          </linearGradient>

          {/* Machined brass center hub */}
          <radialGradient id="baro-brass-hub" cx="38%" cy="34%" r="65%">
            <stop offset="0%" stopColor="#fff4c4" />
            <stop offset="32%" stopColor="#e8c76b" />
            <stop offset="72%" stopColor="#b48a30" />
            <stop offset="100%" stopColor="#6d5015" />
          </radialGradient>

          {/* Subtle glass dome highlight */}
          <linearGradient id="baro-glass-sheen" x1="15%" y1="5%" x2="70%" y2="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.11" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Soft shadow under needles */}
          <filter id="baro-needle-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="1.5" dy="3" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.6" />
          </filter>

          {/* Subtle rubber bevel shadow */}
          <filter id="baro-inset-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* 1. Rugged Notched Rubber Housing */}
        <path
          d={dialGeometry.bezelPath}
          fill="url(#baro-rubber-outer)"
          stroke="#111317"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Outer rubber molding highlight ring */}
        <circle
          cx={CX}
          cy={CY}
          r={215}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.06"
          strokeWidth="1.5"
        />
        {/* Recessed chamfered bezel */}
        <circle
          cx={CX}
          cy={CY}
          r={205}
          fill="url(#baro-bezel-lip)"
          stroke="#08090c"
          strokeWidth="2"
        />
        <circle
          cx={CX}
          cy={CY}
          r={194}
          fill="#0a0c10"
          stroke="#2c313a"
          strokeWidth="1.5"
        />

        {/* 2. Deep Black Dial Faceplate */}
        <circle cx={CX} cy={CY} r={189} fill="url(#baro-dial-bg)" />

        {/* 3. Color-Coded Fishing Condition Wedges */}
        <g stroke="#0c0f14" strokeWidth="1.35" strokeLinejoin="round">
          <path d={dialGeometry.leftPoorPath} fill="url(#baro-zone-poor)" />
          <path d={dialGeometry.leftGoodPath} fill="url(#baro-zone-good)" />
          <path d={dialGeometry.centerGreatPath} fill="url(#baro-zone-great)" />
          <path d={dialGeometry.rightGoodPath} fill="url(#baro-zone-good)" />
          <path d={dialGeometry.rightPoorPath} fill="url(#baro-zone-poor)" />
        </g>

        {/* Crisp outer rim contour around the colored arc */}
        <path
          d={createAnnularSectorPath(CX, CY, 177.2, 178.4, -104, 104)}
          fill="#090b0f"
          opacity="0.45"
        />

        {/* 4. Precision Dual-Unit Scale Ticks */}
        <g stroke="#080a0d" strokeLinecap="round">
          {dialGeometry.inHgTicks.map((t) => (
            <line
              key={`inhg-${t.key}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={t.width}
            />
          ))}
          {dialGeometry.mbTicks.map((t) => (
            <line
              key={`mb-${t.key}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={t.width}
              strokeOpacity="0.9"
            />
          ))}
        </g>

        {/* 5. Outer inHg Numerals (29 .. 30 .. 31) */}
        <g fill="#080a0d" textAnchor="middle" dominantBaseline="central">
          {dialGeometry.inHgLabels.map((lbl) => (
            <text
              key={`lbl-${lbl.key}`}
              x={lbl.x}
              y={lbl.y}
              transform={`rotate(${lbl.deg} ${lbl.x} ${lbl.y})`}
              fontSize={lbl.isWhole ? 20 : 12.5}
              fontWeight={lbl.isWhole ? 900 : 700}
              fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
              letterSpacing={lbl.isWhole ? '-0.5' : '0'}
            >
              {lbl.text}
            </text>
          ))}

          {/* inHg unit label beneath 29 */}
          <text
            x={dialGeometry.inHgUnitPos.x}
            y={dialGeometry.inHgUnitPos.y}
            fontSize="8.5"
            fontWeight="800"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            inHg
          </text>

          {/* Inner Millibar Numerals (980 .. 1050) */}
          {dialGeometry.mbLabels.map((lbl) => (
            <text
              key={`mblbl-${lbl.key}`}
              x={lbl.x}
              y={lbl.y}
              transform={`rotate(${lbl.deg} ${lbl.x} ${lbl.y})`}
              fontSize="9.2"
              fontWeight="800"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {lbl.text}
            </text>
          ))}

          {/* Millibars label */}
          <text
            x={dialGeometry.mbUnitPos.x}
            y={dialGeometry.mbUnitPos.y}
            transform={`rotate(${-85} ${dialGeometry.mbUnitPos.x} ${dialGeometry.mbUnitPos.y})`}
            fontSize="6.8"
            fontWeight="700"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            Millibars
          </text>
        </g>

        {/* 6. Lower Dial Title: Fishing Barometer */}
        <text
          x={CX}
          y={308}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="26.5"
          fontWeight="900"
          fontStyle="italic"
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
          letterSpacing="-0.4"
        >
          Fishing Barometer
        </text>

        {/* 7. Lower-Left TRAC Trend Legend (Active row subtly illuminated) */}
        <g fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="10.2">
          {/* Rising */}
          <g fill={activeTrendRow === 'rising' ? '#7dd3fc' : '#d5dde6'} fontWeight={activeTrendRow === 'rising' ? 800 : 600}>
            <text x="184" y="327" textAnchor="end">Rising</text>
            <text x="190" y="327" textAnchor="middle" fontSize="8.5">►</text>
            <text x="197" y="327" textAnchor="start">Best</text>
          </g>

          {/* Rapid Rise/Fall */}
          <g fill={activeTrendRow === 'rapid' ? '#7dd3fc' : '#d5dde6'} fontWeight={activeTrendRow === 'rapid' ? 800 : 600}>
            <text x="184" y="341" textAnchor="end">Rapid Rise/Fall</text>
            <text x="190" y="341" textAnchor="middle" fontSize="8.5">►</text>
            <text x="197" y="341" textAnchor="start">Good</text>
          </g>

          {/* Unchanging */}
          <g fill={activeTrendRow === 'unchanging' ? '#7dd3fc' : '#d5dde6'} fontWeight={activeTrendRow === 'unchanging' ? 800 : 600}>
            <text x="184" y="355" textAnchor="end">Unchanging</text>
            <text x="190" y="355" textAnchor="middle" fontSize="8.5">►</text>
            <text x="197" y="355" textAnchor="start">Poor</text>
          </g>

          {/* Very Low */}
          <g fill={activeTrendRow === 'very_low' ? '#7dd3fc' : '#d5dde6'} fontWeight={activeTrendRow === 'very_low' ? 800 : 600}>
            <text x="184" y="369" textAnchor="end">Very Low</text>
            <text x="190" y="369" textAnchor="middle" fontSize="8.5">►</text>
            <text x="197" y="369" textAnchor="start">Poor</text>
          </g>

          {/* Falling */}
          <g fill={activeTrendRow === 'falling' ? '#7dd3fc' : '#d5dde6'} fontWeight={activeTrendRow === 'falling' ? 800 : 600}>
            <text x="184" y="383" textAnchor="end">Falling</text>
            <text x="190" y="383" textAnchor="middle" fontSize="8.5">►</text>
            <text x="197" y="383" textAnchor="start">Good</text>
            <text x="225" y="383" textAnchor="start" fontSize="8.2" fontWeight={activeTrendRow === 'falling' ? 700 : 500}>
              at first
            </text>
            <text x="197" y="393.5" textAnchor="start" fontSize="8.2" fontWeight={activeTrendRow === 'falling' ? 700 : 500}>
              Changing to Poor
            </text>
          </g>
        </g>

        {/* 8. Lower-Right Condition Key (GREAT / GOOD / POOR + GENERAL FISHING CONDITIONS) */}
        <g fontFamily="ui-sans-serif, system-ui, sans-serif">
          {/* GREAT bar */}
          <rect
            x="257"
            y="317"
            width="62"
            height="18.5"
            rx="9.25"
            fill="#56b8eb"
            stroke={dialCondition === 'GREAT' ? '#ffffff' : 'none'}
            strokeWidth={dialCondition === 'GREAT' ? 1.8 : 0}
          />
          <text
            x="288"
            y="326.5"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#090c10"
            fontSize="11"
            fontWeight="900"
            letterSpacing="0.4"
          >
            GREAT
          </text>

          {/* GOOD bar */}
          <rect
            x="257"
            y="339.5"
            width="62"
            height="18.5"
            rx="9.25"
            fill="#3d84d1"
            stroke={dialCondition === 'GOOD' ? '#ffffff' : 'none'}
            strokeWidth={dialCondition === 'GOOD' ? 1.8 : 0}
          />
          <text
            x="288"
            y="349"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#090c10"
            fontSize="11"
            fontWeight="900"
            letterSpacing="0.4"
          >
            GOOD
          </text>

          {/* POOR bar */}
          <rect
            x="257"
            y="362"
            width="62"
            height="18.5"
            rx="9.25"
            fill="#8d949b"
            stroke={dialCondition === 'POOR' ? '#ffffff' : 'none'}
            strokeWidth={dialCondition === 'POOR' ? 1.8 : 0}
          />
          <text
            x="288"
            y="371.5"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#090c10"
            fontSize="11"
            fontWeight="900"
            letterSpacing="0.4"
          >
            POOR
          </text>

          {/* Right stacked caption */}
          <g fill="#e6edf5" fontSize="9.8" fontWeight="700" letterSpacing="0.2">
            <text x="325" y="339">GENERAL</text>
            <text x="325" y="352">FISHING</text>
            <text x="325" y="365">CONDITIONS</text>
          </g>
        </g>

        {/* 9. Bottom Live Digital Readout (replaces TRAC brand mark) */}
        <g textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <text
            x={CX}
            y={413}
            fill="#56b8eb"
            fontSize="13.5"
            fontWeight="800"
            letterSpacing="0.3"
          >
            {pressureInHg.toFixed(2)} inHg · {Math.round(pressureHpa)} mb
          </text>
          <text
            x={CX}
            y={427.5}
            fill="#94a3b8"
            fontSize="8.2"
            fontWeight="700"
            letterSpacing="0.6"
          >
            {referenceLabel.toUpperCase()}: {referencePressureInHg.toFixed(2)} ({signedDeltaText})
          </text>
        </g>

        {/* 10. Gold Reference Needle (3h Ago or Trip Launch Pin) */}
        <g
          filter="url(#baro-needle-shadow)"
          style={{
            transform: `rotate(${goldAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="motion-reduce:transition-none"
        >
          {/* Tapered brass reference hand */}
          <polygon
            points="248.4,250 251.6,250 250.6,105 249.4,105"
            fill="url(#baro-gold-needle)"
          />
          <circle cx={CX} cy={105} r={1.2} fill="#f5de96" />
        </g>

        {/* 11. Red Primary Live Pressure Needle (with counterweight tail) */}
        <g
          filter="url(#baro-needle-shadow)"
          style={{
            transform: `rotate(${redAngle}deg)`,
            transformOrigin: `${CX}px ${CY}px`,
            transition: 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="motion-reduce:transition-none"
        >
          {/* Main forward pointer reaching into tick band */}
          <polygon
            points="247.4,250 252.6,250 250.9,89 249.1,89"
            fill="url(#baro-red-needle)"
          />
          {/* Iconic wide counterweight tail past center hub */}
          <polygon
            points="246.8,250 253.2,250 255.2,326 244.8,326"
            fill="url(#baro-red-needle)"
          />
          <line
            x1={CX}
            y1={92}
            x2={CX}
            y2={323}
            stroke="#ff8a78"
            strokeOpacity="0.45"
            strokeWidth="0.9"
          />
        </g>

        {/* 12. Machined Knurled Brass Center Knob */}
        <g
          onClick={onCenterKnobClick}
          className={onCenterKnobClick ? 'cursor-pointer group' : ''}
          role={onCenterKnobClick ? 'button' : undefined}
          tabIndex={onCenterKnobClick ? 0 : undefined}
          aria-label={onCenterKnobClick ? 'Pin gold reference needle to current pressure' : undefined}
          onKeyDown={
            onCenterKnobClick
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCenterKnobClick();
                  }
                }
              : undefined
          }
        >
          <title>
            {onCenterKnobClick
              ? 'Click brass knob to pin gold reference needle to current reading'
              : 'Barometer set-hand hub'}
          </title>
          <circle cx={CX} cy={CY} r={24.5} fill="#000000" fillOpacity="0.45" />
          <path
            d={dialGeometry.knurledPath}
            fill="url(#baro-brass-hub)"
            stroke="#5e4312"
            strokeWidth="0.9"
          />
          <circle
            cx={CX}
            cy={CY}
            r={18.5}
            fill="url(#baro-brass-hub)"
            stroke="#fce7a2"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
          <circle
            cx={CX}
            cy={CY}
            r={13}
            fill="none"
            stroke="#8a651c"
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />
          <circle cx={CX - 4} cy={CY - 4} r={3.5} fill="#ffffff" fillOpacity="0.28" />
        </g>

        {/* 13. Subtle Curved Glass Lens Highlight */}
        <path
          d="M 88 180 A 184 184 0 0 1 395 135 A 210 150 0 0 0 88 180 Z"
          fill="url(#baro-glass-sheen)"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
};

export default FishingBarometerDial;

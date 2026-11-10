import { SolunarData, SolunarPeriod, SolunarPeriodType } from '../types';

/**
 * Astronomical and Solunar calculation engine running 100% locally in the browser.
 * Uses high-precision celestial ephemeris approximations (Meeus Astronomical Algorithms).
 */

// Converts a JavaScript Date to Julian Day Number (UT)
function toJulianDay(date: Date): number {
  const time = date.getTime();
  return (time / 86400000) + 2440587.5;
}

// Normalizes an angle in degrees to [0, 360)
function normalizeDeg(deg: number): number {
  let angle = deg % 360;
  if (angle < 0) angle += 360;
  return angle;
}

// Converts degrees to radians
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate accurate moon position, age, illumination, and phase name
 * using standard astronomical ephemeris formulas.
 */
export function getMoonPhase(date: Date = new Date()): {
  phaseName: string;
  illumination: number; // 0 to 100
  moonAgeDays: number;
  phaseEmoji: string;
  phaseAngleDeg: number;
} {
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525; // Julian centuries since J2000.0

  // Sun mean anomaly (deg)
  const M_sun = normalizeDeg(357.5291092 + 35999.0502909 * T);
  // Sun mean longitude (deg)
  const L_sun = normalizeDeg(280.46646 + 36000.76983 * T);
  // Sun true longitude (deg)
  const C_sun = (1.914602 - 0.004817 * T) * Math.sin(toRad(M_sun)) + (0.019993 - 0.000101 * T) * Math.sin(toRad(2 * M_sun));
  const sunEclipticLong = normalizeDeg(L_sun + C_sun);

  // Moon mean longitude (deg)
  const L_moon = normalizeDeg(218.3164477 + 481267.88123421 * T);
  // Moon mean elongation (deg)
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T);
  // Moon mean anomaly (deg)
  const M_moon = normalizeDeg(134.9633964 + 477198.8675055 * T);
  // Moon argument of latitude (deg)
  const F = normalizeDeg(93.272095 + 483202.0175233 * T);

  // Moon longitude periodic perturbations (deg)
  const moonPerturbations = 
    6.288774 * Math.sin(toRad(M_moon)) +
    1.274027 * Math.sin(toRad(2 * D - M_moon)) +
    0.658314 * Math.sin(toRad(2 * D)) +
    0.213618 * Math.sin(toRad(2 * M_moon)) -
    0.185116 * Math.sin(toRad(M_sun)) -
    0.114332 * Math.sin(toRad(2 * F));

  const moonEclipticLong = normalizeDeg(L_moon + moonPerturbations);

  // Phase angle: difference in ecliptic longitude between Moon and Sun (0 = New, 90 = First Qtr, 180 = Full, 270 = Last Qtr)
  const phaseAngleDeg = normalizeDeg(moonEclipticLong - sunEclipticLong);

  // Illumination percentage k = (1 - cos(phaseAngle)) / 2 * 100
  const illumination = Math.round((1 - Math.cos(toRad(phaseAngleDeg))) / 2 * 100);

  // Lunar age in days (synodic cycle ~29.530588 days)
  const synodicMonth = 29.53058867;
  const moonAgeDays = (phaseAngleDeg / 360) * synodicMonth;

  let phaseName = 'New Moon';
  let phaseEmoji = '🌑';

  // Specific astronomical angular bins for phase naming:
  // New Moon: within +/- 7 deg of 0
  // First Quarter: within +/- 7 deg of 90
  // Full Moon: within +/- 7 deg of 180
  // Last Quarter: within +/- 7 deg of 270
  if (phaseAngleDeg < 7 || phaseAngleDeg >= 353) {
    phaseName = 'New Moon';
    phaseEmoji = '🌑';
  } else if (phaseAngleDeg < 83) {
    phaseName = 'Waxing Crescent';
    phaseEmoji = '🌒';
  } else if (phaseAngleDeg < 97) {
    phaseName = 'First Quarter';
    phaseEmoji = '🌓';
  } else if (phaseAngleDeg < 173) {
    phaseName = 'Waxing Gibbous';
    phaseEmoji = '🌔';
  } else if (phaseAngleDeg <= 187) {
    phaseName = 'Full Moon';
    phaseEmoji = '🌕';
  } else if (phaseAngleDeg < 263) {
    phaseName = 'Waning Gibbous';
    phaseEmoji = '🌖';
  } else if (phaseAngleDeg <= 277) {
    phaseName = 'Last Quarter';
    phaseEmoji = '🌗';
  } else {
    phaseName = 'Waning Crescent';
    phaseEmoji = '🌘';
  }

  return {
    phaseName,
    illumination,
    moonAgeDays,
    phaseEmoji,
    phaseAngleDeg,
  };
}

function formatTimeHHMM(hours: number, minutes: number): string {
  const h = (Math.floor(hours) % 24 + 24) % 24;
  const m = (Math.floor(minutes) % 60 + 60) % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  const displayMinutes = m < 10 ? `0${m}` : `${m}`;
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function calculateSolunar(date: Date = new Date(), lat: number = 33.749, lon: number = -84.388): SolunarData {
  const moonInfo = getMoonPhase(date);
  
  // Calculate local solar time vs UTC offset for location
  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
  const localSolarMidnightOffsetMin = ((lon / 15) - timezoneOffsetHours) * 60;

  // Approximate lunar transit calculation:
  // At phaseAngle 0 (New Moon), transit is near local solar noon (12:00)
  // At phaseAngle 180 (Full Moon), transit is near local solar midnight (00:00)
  // Moon shifts ~50.29 minutes later each solar day
  const transitSolarMinutes = normalizeDeg(180 - moonInfo.phaseAngleDeg) * 4; // 360 deg = 1440 min => 4 min/deg
  const transitMinutes = (transitSolarMinutes - localSolarMidnightOffsetMin + 1440 * 2) % 1440;
  
  // Underfoot transit time (Major 2) - 12 hours offset (720 min)
  const underfootMinutes = (transitMinutes + 720) % 1440;
  
  // Moonrise & Moonset (Minor 1 & Minor 2) - approx 6 hours (360 min) before/after transit
  const moonriseMinutes = (transitMinutes + 1440 - 360) % 1440;
  const moonsetMinutes = (transitMinutes + 360) % 1440;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  // Helper to create period and check active status
  const createPeriod = (centerMinutes: number, durationMinutes: number, type: 'Major' | 'Minor', name: string): SolunarPeriod => {
    const half = durationMinutes / 2;
    const startM = (centerMinutes - half + 1440) % 1440;
    const endM = (centerMinutes + half) % 1440;

    let isActive = false;
    if (startM < endM) {
      isActive = currentMinutes >= startM && currentMinutes <= endM;
    } else {
      // Wraps around midnight
      isActive = currentMinutes >= startM || currentMinutes <= endM;
    }

    const startStr = formatTimeHHMM(Math.floor(startM / 60), startM % 60);
    const endStr = formatTimeHHMM(Math.floor(endM / 60), endM % 60);

    return {
      type,
      start: startStr,
      end: endStr,
      description: `${name} (${startStr} - ${endStr})`,
      isActiveNow: isActive,
    };
  };

  const major1 = createPeriod(transitMinutes, 120, 'Major', 'Major Peak (Overhead Transit)');
  const major2 = createPeriod(underfootMinutes, 120, 'Major', 'Major Peak (Underfoot Transit)');
  const minor1 = createPeriod(moonriseMinutes, 60, 'Minor', 'Minor Feed (Moonrise)');
  const minor2 = createPeriod(moonsetMinutes, 60, 'Minor', 'Minor Feed (Moonset)');

  const majorPeriods = [major1, major2].sort((a, b) => a.start.localeCompare(b.start));
  const minorPeriods = [minor1, minor2].sort((a, b) => a.start.localeCompare(b.start));

  let currentRating: SolunarPeriodType = 'Inactive';
  let currentWindowDesc = 'Normal Feeding Activity';

  if (major1.isActiveNow || major2.isActiveNow) {
    currentRating = 'Major';
    currentWindowDesc = '🔥 MAJOR FEEDING WINDOW ACTIVE (Peak Catfish Bite)';
  } else if (minor1.isActiveNow || minor2.isActiveNow) {
    currentRating = 'Minor';
    currentWindowDesc = '⚡ MINOR FEEDING WINDOW ACTIVE (Increased Activity)';
  }

  // Day rating based on proximity to Major Solunar events
  let dayRating: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Fair';
  if (moonInfo.phaseName === 'New Moon' || moonInfo.phaseName === 'Full Moon') {
    dayRating = 'Excellent';
  } else if (moonInfo.phaseName.includes('Gibbous') || moonInfo.phaseName.includes('Crescent')) {
    dayRating = 'Good';
  } else {
    dayRating = 'Fair';
  }

  return {
    moonPhaseName: moonInfo.phaseName,
    moonIlluminationPercent: moonInfo.illumination,
    moonAgeDays: Math.round(moonInfo.moonAgeDays * 10) / 10,
    majorPeriods,
    minorPeriods,
    currentRating,
    currentWindowDesc,
    dayRating,
  };
}

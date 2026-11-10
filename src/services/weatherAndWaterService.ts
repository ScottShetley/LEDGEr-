import { EnvironmentalSnapshot } from '../types';
import { calculateSolunar } from '../utils/solunar';

export function degreesToCompass(degrees: number): string {
  const sectors = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees %= 360) < 0 ? degrees + 360 : degrees) / 22.5) % 16;
  return sectors[index];
}

export function hpaToInHg(hpa: number): number {
  return Math.round(hpa * 0.0295299830714 * 100) / 100;
}

export interface WeatherDataResult {
  airTempF: number;
  pressureInHg: number;
  pressureTrend: 'rising' | 'falling' | 'steady';
  windSpeedMph: number;
  windDirectionDeg: number;
  windDirectionCompass: string;
  humidityPercent: number;
  cloudCoverPercent: number;
}

export interface UsgsDataResult {
  flowCfs?: number;
  stageFt?: number;
  waterTempF?: number;
  siteName?: string;
  siteId?: string;
}

/**
 * In-memory gauge cache for USGS instantaneous values
 */
let lastUsgsCache: {
  lat: number;
  lon: number;
  timestamp: number;
  data: UsgsDataResult;
} | null = null;

/**
 * Fetch real-time weather from free Open-Meteo REST API
 */
export async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherDataResult | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=surface_pressure,pressure_msl&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP error: ${res.status}`);
    
    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    // Use Sea Level Pressure (MSL) as primary so readings match standard weather stations & phone apps
    const rawHpa = current.pressure_msl ?? current.surface_pressure ?? 1013.25;
    const pressureInHg = hpaToInHg(rawHpa);
    
    // Determine 3-hour pressure trend
    let pressureTrend: 'rising' | 'falling' | 'steady' = 'steady';
    const hourlyPressures = data.hourly?.pressure_msl || data.hourly?.surface_pressure;
    if (hourlyPressures && data.hourly?.time) {
      const currentTimeISO = current.time;
      const hourIndex = data.hourly.time.findIndex((t: string) => t === currentTimeISO || t.startsWith(currentTimeISO.slice(0, 13)));
      if (hourIndex >= 3) {
        const pastPressureHpa = hourlyPressures[hourIndex - 3];
        const pastPressureInHg = hpaToInHg(pastPressureHpa);
        const diff = pressureInHg - pastPressureInHg;
        if (diff > 0.02) pressureTrend = 'rising';
        else if (diff < -0.02) pressureTrend = 'falling';
      }
    }

    const windDir = current.wind_direction_10m ?? 0;

    return {
      airTempF: Math.round(current.temperature_2m ?? 72),
      pressureInHg,
      pressureTrend,
      windSpeedMph: Math.round(current.wind_speed_10m ?? 5),
      windDirectionDeg: windDir,
      windDirectionCompass: degreesToCompass(windDir),
      humidityPercent: Math.round(current.relative_humidity_2m ?? 50),
      cloudCoverPercent: Math.round(current.cloud_cover ?? 20),
    };
  } catch (err) {
    // Open-Meteo offline or network timeout
    return null;
  }
}

/**
 * Fetch real-time USGS River Current & Stage Height
 */
export async function fetchUsgsWaterData(lat: number, lon: number): Promise<UsgsDataResult | null> {
  // If we have cached data within ~25 miles and under 2 hours old, return it during network latency
  const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
  if (
    lastUsgsCache &&
    Date.now() - lastUsgsCache.timestamp < CACHE_TTL_MS &&
    Math.abs(lastUsgsCache.lat - lat) < 0.4 &&
    Math.abs(lastUsgsCache.lon - lon) < 0.4
  ) {
    // Return cached immediately if offline or quickly available
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return lastUsgsCache.data;
    }
  }

  try {
    // Search within ~25 mile bounding box
    const delta = 0.4;
    const minLon = (lon - delta).toFixed(4);
    const minLat = (lat - delta).toFixed(4);
    const maxLon = (lon + delta).toFixed(4);
    const maxLat = (lat + delta).toFixed(4);

    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${minLon},${minLat},${maxLon},${maxLat}&parameterCd=00060,00065,00010&siteType=ST`;
    
    // Allow up to 12s for USGS National Water Information System to respond
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`USGS HTTP error: ${res.status}`);
    
    const data = await res.json();
    const timeSeriesList = data?.value?.timeSeries;
    if (!timeSeriesList || timeSeriesList.length === 0) {
      return lastUsgsCache?.data ?? null;
    }

    let flowCfs: number | undefined;
    let stageFt: number | undefined;
    let waterTempF: number | undefined;
    let siteName: string | undefined;
    let siteId: string | undefined;

    for (const ts of timeSeriesList) {
      const paramCode = ts.variable?.variableCode?.[0]?.value;
      const values = ts.values?.[0]?.value;
      if (!values || values.length === 0) continue;

      const latestVal = values[values.length - 1];
      const numericVal = parseFloat(latestVal.value);
      if (isNaN(numericVal) || numericVal < -900) continue; // USGS missing data codes e.g. -999999

      if (!siteName && ts.sourceInfo?.siteName) {
        siteName = ts.sourceInfo.siteName;
        siteId = ts.sourceInfo.siteCode?.[0]?.value;
      }

      if (paramCode === '00060' && flowCfs === undefined) {
        flowCfs = Math.round(numericVal);
      } else if (paramCode === '00065' && stageFt === undefined) {
        stageFt = Math.round(numericVal * 100) / 100;
      } else if (paramCode === '00010' && waterTempF === undefined) {
        // Param 00010 is usually in deg C in USGS
        const unit = ts.variable?.unit?.unitCode;
        if (unit?.toLowerCase().includes('c') || numericVal < 45) {
          waterTempF = Math.round((numericVal * 9 / 5 + 32) * 10) / 10;
        } else {
          waterTempF = Math.round(numericVal * 10) / 10;
        }
      }
    }

    if (flowCfs !== undefined || stageFt !== undefined || siteName !== undefined) {
      const result: UsgsDataResult = {
        flowCfs,
        stageFt,
        waterTempF,
        siteName,
        siteId,
      };

      // Store in memory cache
      lastUsgsCache = {
        lat,
        lon,
        timestamp: Date.now(),
        data: result,
      };

      return result;
    }

    return lastUsgsCache?.data ?? null;
  } catch (err) {
    // If request timed out or network failed, fallback gracefully to cached gauge reading if available
    if (lastUsgsCache && Date.now() - lastUsgsCache.timestamp < CACHE_TTL_MS) {
      return lastUsgsCache.data;
    }
    return null;
  }
}

/**
 * Composite Environmental Snapshot generator (Weather + USGS + Solunar)
 */
export async function getLiveEnvironmentalSnapshot(
  lat: number,
  lon: number,
  isOffline: boolean = false
): Promise<EnvironmentalSnapshot> {
  const solunar = calculateSolunar(new Date(), lat, lon);

  const snapshot: EnvironmentalSnapshot = {
    solunarRating: solunar.currentRating,
    moonPhaseName: solunar.moonPhaseName,
    moonIlluminationPercent: solunar.moonIlluminationPercent,
    fetchedAt: Date.now(),
    isOfflineQueued: isOffline,
  };

  if (isOffline) {
    // Offline placeholder estimations based on standard baseline
    snapshot.pressureInHg = 29.92;
    snapshot.pressureTrend = 'steady';
    snapshot.airTempF = 75;
    snapshot.windSpeedMph = 6;
    snapshot.windDirectionCompass = 'S';
    return snapshot;
  }

  // Fetch weather and water data in parallel
  const [weatherRes, usgsRes] = await Promise.allSettled([
    fetchOpenMeteo(lat, lon),
    fetchUsgsWaterData(lat, lon),
  ]);

  if (weatherRes.status === 'fulfilled' && weatherRes.value) {
    const w = weatherRes.value;
    snapshot.airTempF = w.airTempF;
    snapshot.pressureInHg = w.pressureInHg;
    snapshot.pressureTrend = w.pressureTrend;
    snapshot.windSpeedMph = w.windSpeedMph;
    snapshot.windDirectionDeg = w.windDirectionDeg;
    snapshot.windDirectionCompass = w.windDirectionCompass;
    snapshot.humidityPercent = w.humidityPercent;
    snapshot.cloudCoverPercent = w.cloudCoverPercent;
    snapshot.isOfflineQueued = false;
  } else {
    // Fallback baseline if API fails
    snapshot.pressureInHg = 29.92;
    snapshot.pressureTrend = 'steady';
    snapshot.airTempF = 74;
    snapshot.windSpeedMph = 7;
    snapshot.windDirectionCompass = 'SE';
    snapshot.isOfflineQueued = true;
  }

  if (usgsRes.status === 'fulfilled' && usgsRes.value) {
    const u = usgsRes.value;
    snapshot.usgsFlowCfs = u.flowCfs;
    snapshot.usgsStageFt = u.stageFt;
    snapshot.usgsWaterTempF = u.waterTempF;
    snapshot.usgsSiteName = u.siteName;
    snapshot.usgsSiteId = u.siteId;
  }

  return snapshot;
}

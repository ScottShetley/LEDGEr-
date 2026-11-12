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
  sunriseTime?: string;
  sunsetTime?: string;
}

function formatIsoTimeTo12h(isoStr?: string): string | undefined {
  if (!isoStr) return undefined;
  const timePart = isoStr.includes('T') ? isoStr.split('T')[1] : isoStr;
  const [hourStr, minStr] = timePart.split(':');
  const h = parseInt(hourStr, 10);
  const m = parseInt(minStr, 10);
  if (isNaN(h) || isNaN(m)) return undefined;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m < 10 ? `0${m}` : `${m}`;
  return `${displayH}:${displayM} ${period}`;
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
 * In-memory weather cache for Open-Meteo forecasts
 */
let lastWeatherCache: {
  lat: number;
  lon: number;
  timestamp: number;
  data: WeatherDataResult;
} | null = null;

/**
 * In-memory composite snapshot cache & in-flight promise deduplication
 */
let lastSnapshotCache: {
  lat: number;
  lon: number;
  timestamp: number;
  data: EnvironmentalSnapshot;
} | null = null;

let inFlightSnapshot: {
  lat: number;
  lon: number;
  promise: Promise<EnvironmentalSnapshot>;
} | null = null;

/**
 * Fetch real-time weather from free Open-Meteo REST API (cached for 15 minutes within ~12 miles)
 */
export async function fetchOpenMeteo(
  lat: number,
  lon: number,
  forceRefresh: boolean = false
): Promise<WeatherDataResult | null> {
  const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  if (
    !forceRefresh &&
    lastWeatherCache &&
    Date.now() - lastWeatherCache.timestamp < WEATHER_CACHE_TTL_MS &&
    Math.abs(lastWeatherCache.lat - lat) < 0.2 &&
    Math.abs(lastWeatherCache.lon - lon) < 0.2
  ) {
    return lastWeatherCache.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=surface_pressure,pressure_msl&daily=sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP error: ${res.status}`);
    
    const data = await res.json();
    const current = data.current;
    if (!current) return lastWeatherCache?.data ?? null;

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
    const sunriseTime = formatIsoTimeTo12h(data.daily?.sunrise?.[0]);
    const sunsetTime = formatIsoTimeTo12h(data.daily?.sunset?.[0]);

    const result: WeatherDataResult = {
      airTempF: Math.round(current.temperature_2m ?? 72),
      pressureInHg,
      pressureTrend,
      windSpeedMph: Math.round(current.wind_speed_10m ?? 5),
      windDirectionDeg: windDir,
      windDirectionCompass: degreesToCompass(windDir),
      humidityPercent: Math.round(current.relative_humidity_2m ?? 50),
      cloudCoverPercent: Math.round(current.cloud_cover ?? 20),
      sunriseTime,
      sunsetTime,
    };

    lastWeatherCache = {
      lat,
      lon,
      timestamp: Date.now(),
      data: result,
    };

    return result;
  } catch (err) {
    // Open-Meteo offline or network timeout - fallback to existing cache
    return lastWeatherCache?.data ?? null;
  }
}

/**
 * Fetch real-time USGS River Current & Stage Height (cached for 20 minutes within ~25 miles)
 */
export async function fetchUsgsWaterData(
  lat: number,
  lon: number,
  forceRefresh: boolean = false
): Promise<UsgsDataResult | null> {
  // USGS gauges update in 15-to-60 minute intervals. Reuse recent readings within ~25 miles.
  const CACHE_TTL_MS = 20 * 60 * 1000;
  if (
    !forceRefresh &&
    lastUsgsCache &&
    Date.now() - lastUsgsCache.timestamp < CACHE_TTL_MS &&
    Math.abs(lastUsgsCache.lat - lat) < 0.4 &&
    Math.abs(lastUsgsCache.lon - lon) < 0.4
  ) {
    return lastUsgsCache.data;
  }

  // If completely offline, return whatever cached data is available regardless of age
  if (typeof navigator !== 'undefined' && !navigator.onLine && lastUsgsCache) {
    return lastUsgsCache.data;
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
    if (lastUsgsCache) {
      return lastUsgsCache.data;
    }
    return null;
  }
}

/**
 * Composite Environmental Snapshot generator (Weather + USGS + Solunar)
 * Features a 15-minute TTL cache, 0.05° (~3.5 mile) geographic deadband,
 * and concurrent in-flight promise deduplication to prevent telemetry loops.
 */
export async function getLiveEnvironmentalSnapshot(
  lat: number,
  lon: number,
  isOffline: boolean = false,
  forceRefresh: boolean = false
): Promise<EnvironmentalSnapshot> {
  const SNAPSHOT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  const DEADBAND_DEG = 0.05; // ~3.5 miles

  // 1. Return cached snapshot immediately if recent and within geographic deadband
  if (
    !forceRefresh &&
    !isOffline &&
    lastSnapshotCache &&
    Date.now() - lastSnapshotCache.timestamp < SNAPSHOT_CACHE_TTL_MS &&
    Math.abs(lastSnapshotCache.lat - lat) < DEADBAND_DEG &&
    Math.abs(lastSnapshotCache.lon - lon) < DEADBAND_DEG
  ) {
    return lastSnapshotCache.data;
  }

  // 2. In-flight request deduplication: return the active Promise if one is already running close by
  if (
    !forceRefresh &&
    inFlightSnapshot &&
    Math.abs(inFlightSnapshot.lat - lat) < DEADBAND_DEG &&
    Math.abs(inFlightSnapshot.lon - lon) < DEADBAND_DEG
  ) {
    return inFlightSnapshot.promise;
  }

  const fetchPromise = (async () => {
    const solunar = calculateSolunar(new Date(), lat, lon);

    const snapshot: EnvironmentalSnapshot = {
      solunarRating: solunar.currentRating,
      moonPhaseName: solunar.moonPhaseName,
      moonIlluminationPercent: solunar.moonIlluminationPercent,
      sunriseTime: solunar.sunriseTime,
      sunsetTime: solunar.sunsetTime,
      solarNoonTime: solunar.solarNoonTime,
      fetchedAt: Date.now(),
      isOfflineQueued: isOffline,
    };

    if (isOffline) {
      // Offline placeholder estimations based on standard baseline or last cache
      if (lastSnapshotCache) {
        return {
          ...lastSnapshotCache.data,
          solunarRating: solunar.currentRating,
          moonPhaseName: solunar.moonPhaseName,
          moonIlluminationPercent: solunar.moonIlluminationPercent,
          sunriseTime: solunar.sunriseTime,
          sunsetTime: solunar.sunsetTime,
          solarNoonTime: solunar.solarNoonTime,
          isOfflineQueued: true,
        };
      }
      snapshot.pressureInHg = 29.92;
      snapshot.pressureTrend = 'steady';
      snapshot.airTempF = 75;
      snapshot.windSpeedMph = 6;
      snapshot.windDirectionCompass = 'S';
      return snapshot;
    }

    // Fetch weather and water data in parallel
    const [weatherRes, usgsRes] = await Promise.allSettled([
      fetchOpenMeteo(lat, lon, forceRefresh),
      fetchUsgsWaterData(lat, lon, forceRefresh),
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
      if (w.sunriseTime) snapshot.sunriseTime = w.sunriseTime;
      if (w.sunsetTime) snapshot.sunsetTime = w.sunsetTime;
      snapshot.isOfflineQueued = false;
    } else if (lastSnapshotCache?.data.pressureInHg) {
      // Retain last known weather if temporary network glitch
      snapshot.airTempF = lastSnapshotCache.data.airTempF;
      snapshot.pressureInHg = lastSnapshotCache.data.pressureInHg;
      snapshot.pressureTrend = lastSnapshotCache.data.pressureTrend;
      snapshot.windSpeedMph = lastSnapshotCache.data.windSpeedMph;
      snapshot.windDirectionDeg = lastSnapshotCache.data.windDirectionDeg;
      snapshot.windDirectionCompass = lastSnapshotCache.data.windDirectionCompass;
      snapshot.humidityPercent = lastSnapshotCache.data.humidityPercent;
      snapshot.cloudCoverPercent = lastSnapshotCache.data.cloudCoverPercent;
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
    } else if (lastSnapshotCache?.data.usgsFlowCfs) {
      snapshot.usgsFlowCfs = lastSnapshotCache.data.usgsFlowCfs;
      snapshot.usgsStageFt = lastSnapshotCache.data.usgsStageFt;
      snapshot.usgsWaterTempF = lastSnapshotCache.data.usgsWaterTempF;
      snapshot.usgsSiteName = lastSnapshotCache.data.usgsSiteName;
      snapshot.usgsSiteId = lastSnapshotCache.data.usgsSiteId;
    }

    lastSnapshotCache = {
      lat,
      lon,
      timestamp: Date.now(),
      data: snapshot,
    };

    return snapshot;
  })();

  inFlightSnapshot = {
    lat,
    lon,
    promise: fetchPromise,
  };

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    if (inFlightSnapshot?.promise === fetchPromise) {
      inFlightSnapshot = null;
    }
  }
}

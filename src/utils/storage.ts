import { CatchLog, FishingMode } from '../types';
import { normalizeBaitName } from './baitNormalizer';
import {
  saveCatchToIndexedDB,
  loadCatchesFromIndexedDB,
  saveAllCatchesToIndexedDB,
  updateCatchInIndexedDB,
  deleteCatchFromIndexedDB,
  clearAllIndexedDB,
} from './indexedDb';

const STORAGE_KEY = 'bigguy_littleboat_catches_v1';
const MODE_STORAGE_KEY = 'bigguy_littleboat_mode_v1';
const LOGO_STORAGE_KEY = 'bigguy_littleboat_logo_v1';
const LAST_LOCATION_STORAGE_KEY = 'bigguy_littleboat_last_location_v1';
const MAP_CAMERA_STORAGE_KEY = 'bigguy_littleboat_map_camera_v1';

export interface LastKnownLocation {
  lat: number;
  lon: number;
  zoom?: number;
  timestamp: number;
}

export function getLastMapCamera(): LastKnownLocation | null {
  try {
    const raw = localStorage.getItem(MAP_CAMERA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number' && !isNaN(parsed.lat) && !isNaN(parsed.lon)) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return null;
}

export function saveLastMapCamera(lat: number, lon: number, zoom?: number): void {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;
  try {
    const payload: LastKnownLocation = {
      lat,
      lon,
      zoom: typeof zoom === 'number' && !isNaN(zoom) ? zoom : undefined,
      timestamp: Date.now(),
    };
    localStorage.setItem(MAP_CAMERA_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not save map camera position:', err);
  }
}

export function getLastKnownLocation(): LastKnownLocation | null {
  try {
    const raw = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number' && !isNaN(parsed.lat) && !isNaN(parsed.lon)) {
      // If previous session stored the St. Louis demo bounding box, purge it so app defaults to Columbus, GA
      if (parsed.lat > 38.0 && parsed.lat < 39.0 && parsed.lon < -89.5 && parsed.lon > -91.0) {
        localStorage.removeItem(LAST_LOCATION_STORAGE_KEY);
        return null;
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Could not read last known location from localStorage:', err);
  }
  return null;
}

export function saveLastKnownLocation(lat: number, lon: number, zoom?: number): void {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;
  try {
    const payload: LastKnownLocation = {
      lat,
      lon,
      zoom: typeof zoom === 'number' && !isNaN(zoom) ? zoom : undefined,
      timestamp: Date.now(),
    };
    localStorage.setItem(LAST_LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not save last known location to localStorage:', err);
  }
}

export const SAMPLE_CATCHES: CatchLog[] = [];

export function isBaitSpecies(species: string): boolean {
  const s = species.toLowerCase();
  return (
    s.includes('skipjack') ||
    s.includes('shad') ||
    s.includes('bluegill') ||
    s.includes('sunfish') ||
    s.includes('mooneye') ||
    s.includes('goldeye') ||
    s.includes('carp') ||
    s.includes('crappie') ||
    s.includes('bass') ||
    s.includes('bait')
  );
}

export function purgeTestCatches(): CatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realCatches = parsed.filter((c: CatchLog) => !c.id.startsWith('sample-'));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(realCatches));
      return realCatches;
    }
  } catch (err) {
    console.error('Failed to purge test catches:', err);
  }
  return [];
}

export function loadCatches(): CatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      let migrated = false;
      const realCatches = parsed
        .filter((c: CatchLog) => !c.id.startsWith('sample-'))
        .map((c: CatchLog) => {
          if (!c.isBait && c.baitRig) {
            const normalized = normalizeBaitName(c.baitRig);
            if (normalized !== c.baitRig) {
              migrated = true;
              return { ...c, baitRig: normalized };
            }
          }
          return c;
        });

      if (migrated || realCatches.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(realCatches));
        saveAllCatchesToIndexedDB(realCatches).catch(() => {});
      }
      return realCatches;
    }
    return [];
  } catch (err) {
    console.error('Failed to parse stored catches from localStorage:', err);
    return [];
  }
}

export function saveCatches(catches: CatchLog[]): void {
  // 1. Always prioritize IndexedDB (unlimited storage, safe from localStorage 5MB quota)
  saveAllCatchesToIndexedDB(catches).catch((e) => {
    console.warn('Could not mirror to IndexedDB:', e);
  });

  // 2. Mirror to localStorage safely (strip large base64 data URLs to prevent QuotaExceededError)
  try {
    const lightweightCatches = catches.map((c) => {
      if (c.photoUrl && c.photoUrl.startsWith('data:image/') && c.photoUrl.length > 50000) {
        return {
          ...c,
          photoUrl: '', // IndexedDB retains the full photo blob and live object URL
        };
      }
      return c;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweightCatches));
  } catch (err) {
    console.warn('LocalStorage quota limit reached (harmless - IndexedDB maintains full photos):', err);
  }
}

export function addCatch(item: CatchLog, photoBlob?: Blob | null): CatchLog[] {
  const normalizedItem: CatchLog = {
    ...item,
    baitRig: !item.isBait && item.baitRig ? normalizeBaitName(item.baitRig) : item.baitRig,
  };
  const existing = loadCatches();
  const updated = [normalizedItem, ...existing];
  saveCatches(updated);
  saveCatchToIndexedDB(normalizedItem, photoBlob).catch((e) => {
    console.warn('Could not save single catch to IndexedDB:', e);
  });
  return updated;
}

export async function updateCatch(
  id: string,
  updates: Partial<CatchLog>,
  photoBlob?: Blob | null
): Promise<CatchLog[]> {
  const sanitizedUpdates = {
    ...updates,
    ...(updates.baitRig && !updates.isBait
      ? { baitRig: normalizeBaitName(updates.baitRig) }
      : {}),
  };
  // If photoBlob was not provided but updates.photoUrl is a data URL, convert it to a Blob
  if (!photoBlob && updates.photoUrl && updates.photoUrl.startsWith('data:image/')) {
    try {
      const res = await fetch(updates.photoUrl);
      photoBlob = await res.blob();
    } catch {
      // ignore
    }
  }

  let existing = loadCatches();
  let found = existing.some((item) => item.id === id);

  // If catch is not in localStorage, check IndexedDB
  if (!found) {
    try {
      const idbCatches = await loadCatchesFromIndexedDB();
      if (idbCatches && idbCatches.length > 0) {
        existing = idbCatches;
        found = existing.some((item) => item.id === id);
      }
    } catch {}
  }

  let updatedCatch: CatchLog | undefined;
  const updated = existing.map((item) => {
    if (item.id === id) {
      updatedCatch = {
        ...item,
        ...sanitizedUpdates,
        isSynced: false,
        syncedAt: undefined,
      };
      return updatedCatch;
    }
    return item;
  });

  saveCatches(updated);

  if (updatedCatch) {
    try {
      const res = await updateCatchInIndexedDB(
        id,
        { ...updates, isSynced: false, syncedAt: undefined },
        photoBlob
      );
      if (!res) {
        await saveCatchToIndexedDB(updatedCatch, photoBlob).catch(() => {});
      }
    } catch (e) {
      console.warn('Could not mirror updated catch to IndexedDB via updateCatchInIndexedDB, attempting full save:', e);
      await saveCatchToIndexedDB(updatedCatch, photoBlob).catch(() => {});
    }
  }

  return updated;
}

export function deleteCatch(id: string): CatchLog[] {
  const existing = loadCatches();
  const updated = existing.filter(item => item.id !== id);
  saveCatches(updated);
  deleteCatchFromIndexedDB(id).catch(() => {});
  return updated;
}

export function clearAllCatches(): CatchLog[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  clearAllIndexedDB().catch(() => {});
  return [];
}

export function getFishingMode(): FishingMode {
  try {
    const mode = localStorage.getItem(MODE_STORAGE_KEY) as FishingMode | null;
    return mode === 'bank' ? 'bank' : 'boat';
  } catch {
    return 'boat';
  }
}

export function saveFishingMode(mode: FishingMode): void {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch (err) {
    console.error('Failed to save fishing mode:', err);
  }
}

export function getCustomLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveCustomLogo(dataUrl: string | null): void {
  try {
    if (dataUrl) {
      localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    } else {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save custom logo:', err);
  }
}

/**
 * Export full logbook to CSV file
 */
export function exportCatchesToCsv(catches: CatchLog[]): void {
  const headers = [
    'ID',
    'Date_Time_ISO',
    'Date_Formatted',
    'Latitude',
    'Longitude',
    'GPS_Accuracy_Meters',
    'Mode',
    'Species',
    'Is_Bait',
    'Weight_Lbs',
    'Length_Inches',
    'Bait_Rig',
    'Presentation',
    'Water_Depth_Ft',
    'Current_Condition',
    'Bottom_Structure',
    'Water_Clarity',
    'Air_Temp_F',
    'Pressure_inHg',
    'Pressure_Trend',
    'Wind_Speed_Mph',
    'Wind_Direction',
    'USGS_Flow_CFS',
    'USGS_Stage_Ft',
    'USGS_Water_Temp_F',
    'USGS_Station_Name',
    'Solunar_Rating',
    'Moon_Phase',
    'Moon_Illumination_Pct',
    'Is_Synced_To_Cloud',
    'Photo_URL',
    'Notes',
  ];

  const escapeCsv = (str?: string | number | boolean | null) => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = catches.map(c => [
    escapeCsv(c.id),
    escapeCsv(new Date(c.timestamp).toISOString()),
    escapeCsv(new Date(c.timestamp).toLocaleString()),
    escapeCsv(c.lat),
    escapeCsv(c.lon),
    escapeCsv(c.accuracyMeters ?? ''),
    escapeCsv(c.mode),
    escapeCsv(c.species),
    escapeCsv(c.isBait ? 'YES' : 'NO'),
    escapeCsv(c.weightLbs ?? ''),
    escapeCsv(c.lengthInches ?? ''),
    escapeCsv(c.baitRig),
    escapeCsv(c.presentation),
    escapeCsv(c.waterDepthFeet),
    escapeCsv(c.current),
    escapeCsv(c.bottomStructure),
    escapeCsv(c.waterClarity),
    escapeCsv(c.environmentalSnapshot?.airTempF ?? ''),
    escapeCsv(c.environmentalSnapshot?.pressureInHg ?? ''),
    escapeCsv(c.environmentalSnapshot?.pressureTrend ?? ''),
    escapeCsv(c.environmentalSnapshot?.windSpeedMph ?? ''),
    escapeCsv(c.environmentalSnapshot?.windDirectionCompass ?? ''),
    escapeCsv(c.environmentalSnapshot?.usgsFlowCfs ?? ''),
    escapeCsv(c.environmentalSnapshot?.usgsStageFt ?? ''),
    escapeCsv(c.environmentalSnapshot?.usgsWaterTempF ?? ''),
    escapeCsv(c.environmentalSnapshot?.usgsSiteName ?? ''),
    escapeCsv(c.environmentalSnapshot?.solunarRating ?? ''),
    escapeCsv(c.environmentalSnapshot?.moonPhaseName ?? ''),
    escapeCsv(c.environmentalSnapshot?.moonIlluminationPercent ?? ''),
    escapeCsv(c.isSynced ? 'YES (Synced)' : 'NO (Local Only)'),
    escapeCsv(c.photoUrl ?? ''),
    escapeCsv(c.notes ?? ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LEDGEr_Catch_Log_by_BIGGUY_littleboat_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export JSON backup
 */
export function exportCatchesToJson(catches: CatchLog[]): void {
  const jsonString = JSON.stringify(catches, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `LEDGEr_Backup_by_BIGGUY_littleboat_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

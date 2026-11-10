import { BankedMapInfo, BankingProgress, GpsChangeStatus } from '../types';

const MAP_CACHE_NAME = 'bigguy-map-tiles-v1';
const METADATA_KEY = 'bigguy_banked_map_v1';
const AUTO_BANK_KEY = 'bigguy_auto_bank_enabled_v1';

// Earth radius in statute miles
const EARTH_RADIUS_MILES = 3958.8;

// Default threshold to consider GPS "the same" as the last time (1.0 statute mile)
// Accounts for normal mobile GPS jitter/drift at a boat ramp while detecting when moved to a new ramp
export const DEFAULT_GPS_CHANGE_THRESHOLD_MILES = 1.0;

export function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

export function tile2lon(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

export function tile2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

type ProgressCallback = (progress: BankingProgress) => void;
type InfoCallback = (info: BankedMapInfo) => void;

class OfflineMapService {
  private progressListeners: Set<ProgressCallback> = new Set();
  private infoListeners: Set<InfoCallback> = new Set();
  private isBanking: boolean = false;
  private cancelRequested: boolean = false;

  constructor() {
    // Initial verification of stored tile count if needed
    if (typeof window !== 'undefined') {
      this.refreshStoredTileCount().catch(() => {});
    }
  }

  public getBankedInfo(): BankedMapInfo {
    if (typeof window === 'undefined') {
      return {
        centerLat: 32.461,
        centerLon: -84.988,
        radiusMiles: 50,
        timestamp: 0,
        tileCount: 0,
        status: 'idle',
        autoBankEnabled: true,
      };
    }

    try {
      const raw = localStorage.getItem(METADATA_KEY);
      const autoBankRaw = localStorage.getItem(AUTO_BANK_KEY);
      const autoBankEnabled = autoBankRaw !== null ? autoBankRaw === 'true' : true;

      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          autoBankEnabled,
        };
      }

      return {
        centerLat: 32.461,
        centerLon: -84.988,
        radiusMiles: 50,
        timestamp: 0,
        tileCount: 0,
        status: 'idle',
        autoBankEnabled,
      };
    } catch {
      return {
        centerLat: 32.461,
        centerLon: -84.988,
        radiusMiles: 50,
        timestamp: 0,
        tileCount: 0,
        status: 'idle',
        autoBankEnabled: true,
      };
    }
  }

  public saveBankedInfo(info: Partial<BankedMapInfo>): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getBankedInfo();
      const updated: BankedMapInfo = { ...current, ...info };
      localStorage.setItem(METADATA_KEY, JSON.stringify(updated));
      if (info.autoBankEnabled !== undefined) {
        localStorage.setItem(AUTO_BANK_KEY, String(info.autoBankEnabled));
      }
      this.notifyInfoListeners(updated);
    } catch (err) {
      console.warn('Could not save banked map info:', err);
    }
  }

  public setAutoBankEnabled(enabled: boolean): void {
    this.saveBankedInfo({ autoBankEnabled: enabled });
  }

  public subscribeProgress(cb: ProgressCallback): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }

  public subscribeInfo(cb: InfoCallback): () => void {
    this.infoListeners.add(cb);
    cb(this.getBankedInfo());
    return () => this.infoListeners.delete(cb);
  }

  private notifyProgress(progress: BankingProgress): void {
    this.progressListeners.forEach((cb) => {
      try {
        cb(progress);
      } catch (err) {
        console.error('Error in banking progress listener:', err);
      }
    });
  }

  private notifyInfoListeners(info: BankedMapInfo): void {
    this.infoListeners.forEach((cb) => {
      try {
        cb(info);
      } catch (err) {
        console.error('Error in banking info listener:', err);
      }
    });
  }

  /**
   * Refresh actual tile count stored in CacheStorage
   */
  public async refreshStoredTileCount(): Promise<number> {
    if (typeof window === 'undefined' || !('caches' in window)) return 0;
    try {
      const cache = await caches.open(MAP_CACHE_NAME);
      const keys = await cache.keys();
      const count = keys.length;
      const current = this.getBankedInfo();
      if (current.tileCount !== count) {
        this.saveBankedInfo({ tileCount: count });
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Check if current phone GPS has changed compared to the last banked location.
   * If GPS is within the threshold (e.g. 1.0 mile), it is considered the same ramp/location
   * so no re-banking is needed.
   */
  public checkGpsChange(currentLat: number | null, currentLon: number | null): GpsChangeStatus {
    const info = this.getBankedInfo();
    const thresholdMiles = info.gpsChangeThresholdMiles ?? DEFAULT_GPS_CHANGE_THRESHOLD_MILES;
    const lastLat = info.lastBankedLat ?? (info.timestamp > 0 ? info.centerLat : null);
    const lastLon = info.lastBankedLon ?? (info.timestamp > 0 ? info.centerLon : null);

    if (currentLat === null || currentLon === null) {
      return {
        hasGpsChanged: false,
        distanceMiles: 0,
        thresholdMiles,
        lastBankedLat: lastLat,
        lastBankedLon: lastLon,
        currentLat,
        currentLon,
        statusText: 'GPS coordinate not available',
      };
    }

    if (lastLat === null || lastLon === null || info.timestamp === 0 || info.tileCount === 0) {
      return {
        hasGpsChanged: true,
        distanceMiles: 0,
        thresholdMiles,
        lastBankedLat: null,
        lastBankedLon: null,
        currentLat,
        currentLon,
        statusText: 'No previous map banked for this device',
      };
    }

    const distanceMiles = haversineDistanceMiles(currentLat, currentLon, lastLat, lastLon);
    const hasGpsChanged = distanceMiles > thresholdMiles;

    const statusText = hasGpsChanged
      ? `GPS moved ${distanceMiles.toFixed(1)} mi from last banked ramp (exceeds ${thresholdMiles} mi)`
      : `GPS is the same as last banked ramp (${distanceMiles.toFixed(2)} mi <= ${thresholdMiles} mi)`;

    return {
      hasGpsChanged,
      distanceMiles,
      thresholdMiles,
      lastBankedLat: lastLat,
      lastBankedLon: lastLon,
      currentLat,
      currentLon,
      statusText,
    };
  }

  /**
   * Check if current location should trigger auto-banking (e.g. opened at boat ramp).
   * Checks if GPS has changed since last time: if it's the same, it skips banking completely!
   */
  public async checkAndAutoBank(currentLat: number, currentLon: number): Promise<boolean> {
    if (!navigator.onLine || this.isBanking) return false;

    const info = this.getBankedInfo();
    if (!info.autoBankEnabled) return false;

    // Check if phone GPS has changed compared to last bank
    const gpsStatus = this.checkGpsChange(currentLat, currentLon);

    // If already banked and GPS is the same as last time, do not bank map tiles again!
    if (!gpsStatus.hasGpsChanged && info.tileCount > 0 && info.status === 'ready') {
      console.log(
        `[OfflineMap] GPS unchanged (${gpsStatus.distanceMiles.toFixed(2)} mi from last bank, threshold: ${gpsStatus.thresholdMiles} mi). Map tiles already cached (${info.tileCount} tiles). Skipping update.`
      );
      return false;
    }

    console.log(
      `[OfflineMap] GPS changed by ${gpsStatus.distanceMiles.toFixed(1)} miles. Auto-banking new 50-mile radius around (${currentLat.toFixed(4)}, ${currentLon.toFixed(4)}).`
    );
    return await this.bank50MileRadius(currentLat, currentLon, false);
  }

  /**
   * Bank a 50-mile radius around a given latitude and longitude.
   * If force is false and the GPS location is the same as last time with tiles already stored,
   * it skips re-downloading to save bandwidth and device storage.
   */
  public async bank50MileRadius(centerLat: number, centerLon: number, force: boolean = false): Promise<boolean> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      console.warn('CacheStorage is not supported in this browser.');
      return false;
    }

    const info = this.getBankedInfo();
    const gpsStatus = this.checkGpsChange(centerLat, centerLon);

    // If not forced and GPS is the same as last time with cached tiles, no need to re-download!
    if (!force && !gpsStatus.hasGpsChanged && info.tileCount > 0 && info.status === 'ready') {
      console.log(`[OfflineMap] GPS is the same as last time (${gpsStatus.distanceMiles.toFixed(2)} mi). Maps are already banked and up to date.`);
      this.notifyProgress({
        isBanking: false,
        downloaded: info.tileCount,
        total: info.tileCount,
        percent: 100,
      });
      return true;
    }

    if (this.isBanking) {
      console.warn('Map banking is already in progress.');
      return false;
    }

    this.isBanking = true;
    this.cancelRequested = false;

    this.saveBankedInfo({
      centerLat,
      centerLon,
      radiusMiles: 50,
      status: 'banking',
    });

    const notify = (downloaded: number, total: number, currentZoom?: number, error?: string) => {
      const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
      this.notifyProgress({
        isBanking: true,
        downloaded,
        total,
        percent,
        currentZoom,
        error,
      });
    };

    try {
      const cache = await caches.open(MAP_CACHE_NAME);

      // Collect all tile coordinates needed across zoom levels
      interface TileCoord {
        x: number;
        y: number;
        z: number;
        subdomain: number;
      }

      const tilesToDownload: TileCoord[] = [];
      const deltaLat50 = 50 / 69.0;
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const deltaLon50 = 50 / (69.0 * Math.max(0.1, cosLat));

      const deltaLat12 = 12 / 69.0;
      const deltaLon12 = 12 / (69.0 * Math.max(0.1, cosLat));

      const zoomConfigs = [
        { zoom: 9, dLat: deltaLat50, dLon: deltaLon50 },
        { zoom: 10, dLat: deltaLat50, dLon: deltaLon50 },
        { zoom: 11, dLat: deltaLat50, dLon: deltaLon50 },
        { zoom: 12, dLat: deltaLat50, dLon: deltaLon50 },
        { zoom: 13, dLat: deltaLat50, dLon: deltaLon50 },
        { zoom: 14, dLat: deltaLat12, dLon: deltaLon12 }, // High-res for ramp & 12mi stretch
        { zoom: 15, dLat: deltaLat12 * 0.5, dLon: deltaLon12 * 0.5 }, // Ultra high-res immediate 6mi area
      ];

      for (const config of zoomConfigs) {
        const { zoom, dLat, dLon } = config;
        const minLat = Math.max(-85, centerLat - dLat);
        const maxLat = Math.min(85, centerLat + dLat);
        const minLon = Math.max(-180, centerLon - dLon);
        const maxLon = Math.min(180, centerLon + dLon);

        const xMin = lon2tile(minLon, zoom);
        const xMax = lon2tile(maxLon, zoom);
        const yMin = lat2tile(maxLat, zoom); // Note: tile Y is inverted
        const yMax = lat2tile(minLat, zoom);

        const startX = Math.min(xMin, xMax);
        const endX = Math.max(xMin, xMax);
        const startY = Math.min(yMin, yMax);
        const endY = Math.max(yMin, yMax);

        for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
            // Check approximate radial distance of tile center
            const tileLon = tile2lon(x + 0.5, zoom);
            const tileLat = tile2lat(y + 0.5, zoom);
            const dist = haversineDistanceMiles(centerLat, centerLon, tileLat, tileLon);
            
            // Allow tiles within range with slight margin
            const maxAllowedDist = zoom <= 13 ? 53 : zoom === 14 ? 14 : 7;
            if (dist <= maxAllowedDist) {
              const subdomain = (x + y + zoom) % 4;
              tilesToDownload.push({ x, y, z: zoom, subdomain });
            }
          }
        }
      }

      const totalTiles = tilesToDownload.length;
      notify(0, totalTiles);

      // Download in parallel with a bounded concurrency pool (6 simultaneous workers)
      const CONCURRENCY = 6;
      let currentIndex = 0;
      let downloadedCount = 0;

      const worker = async () => {
        while (currentIndex < tilesToDownload.length && !this.cancelRequested) {
          const index = currentIndex++;
          const tile = tilesToDownload[index];
          const tileUrl = `https://mt${tile.subdomain}.google.com/vt/lyrs=y&x=${tile.x}&y=${tile.y}&z=${tile.z}`;

          try {
            // Check if already in cache
            const existing = await cache.match(tileUrl);
            if (!existing) {
              const res = await fetch(tileUrl, { mode: 'no-cors' });
              if (res && (res.status === 200 || res.type === 'opaque' || res.status === 0)) {
                await cache.put(tileUrl, res.clone());
              }
            }
          } catch (fetchErr) {
            // Skip failed tile and continue
          }

          downloadedCount++;
          if (downloadedCount % 10 === 0 || downloadedCount === totalTiles) {
            notify(downloadedCount, totalTiles, tile.z);
          }

          // Polite throttle
          await new Promise((r) => setTimeout(r, 12));
        }
      };

      const workers = Array.from({ length: CONCURRENCY }, () => worker());
      await Promise.all(workers);

      // Refresh final count
      const finalCount = await this.refreshStoredTileCount();

      this.isBanking = false;
      this.saveBankedInfo({
        centerLat,
        centerLon,
        lastBankedLat: centerLat,
        lastBankedLon: centerLon,
        radiusMiles: 50,
        timestamp: Date.now(),
        tileCount: finalCount,
        status: 'ready',
      });

      this.notifyProgress({
        isBanking: false,
        downloaded: totalTiles,
        total: totalTiles,
        percent: 100,
      });

      return true;
    } catch (err: any) {
      console.error('[OfflineMap] Banking failed:', err);
      this.isBanking = false;
      this.saveBankedInfo({ status: 'error' });
      this.notifyProgress({
        isBanking: false,
        downloaded: 0,
        total: 0,
        percent: 0,
        error: err?.message || 'Failed to bank offline map',
      });
      return false;
    }
  }

  public cancelBanking(): void {
    this.cancelRequested = true;
    this.isBanking = false;
    this.saveBankedInfo({ status: 'idle' });
    this.notifyProgress({
      isBanking: false,
      downloaded: 0,
      total: 0,
      percent: 0,
    });
  }

  public async clearBankedTiles(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    try {
      await caches.delete(MAP_CACHE_NAME);
      this.saveBankedInfo({
        timestamp: 0,
        tileCount: 0,
        status: 'idle',
      });
    } catch (err) {
      console.warn('Could not clear map tiles cache:', err);
    }
  }
}

export const offlineMapService = new OfflineMapService();

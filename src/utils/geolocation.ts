import { getLastKnownLocation, saveLastKnownLocation } from './storage';

let isGeolocationBlocked = false;

export function isGeolocationBlockedByPolicy(): boolean {
  return isGeolocationBlocked;
}

export function markGeolocationBlocked(): void {
  isGeolocationBlocked = true;
}

export function resetGeolocationBlocked(): void {
  isGeolocationBlocked = false;
}

/**
 * Check if geolocation is permitted by host frame permissions policy
 */
export async function canAccessGeolocation(): Promise<boolean> {
  if (isGeolocationBlocked) return false;
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return false;
  }

  if ('permissions' in navigator && navigator.permissions?.query) {
    try {
      const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (res.state === 'denied') {
        isGeolocationBlocked = true;
        return false;
      }
      if (res.state === 'granted') {
        isGeolocationBlocked = false;
        return true;
      }
    } catch {
      // In Safari/WebKit, iOS, or environments where permissions.query({ name: 'geolocation' })
      // throws a TypeError, do NOT block geolocation. Proceed to native navigator.geolocation.
    }
  }

  return true;
}

export interface SafeCoordinates {
  lat: number;
  lon: number;
  accuracy: number;
}

/**
 * Safely snap current position if permitted, or return last-known / default coordinate
 */
export async function getSafeCurrentPosition(): Promise<SafeCoordinates> {
  const last = getLastKnownLocation();
  const fallbackLat = last?.lat ?? 32.4610;
  const fallbackLon = last?.lon ?? -84.9877;
  const fallbackAccuracy = 5.0;

  const permitted = await canAccessGeolocation();
  if (!permitted) {
    return { lat: fallbackLat, lon: fallbackLon, accuracy: fallbackAccuracy };
  }

  return new Promise((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isGeolocationBlocked = false;
          saveLastKnownLocation(pos.coords.latitude, pos.coords.longitude);
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          if (err.code === 1) {
            // Only user PERMISSION_DENIED is permanently blocked
            isGeolocationBlocked = true;
          }
          // For timeouts (code 3) or position unavailable (code 2), return last known or fallback
          resolve({ lat: fallbackLat, lon: fallbackLon, accuracy: fallbackAccuracy });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
      );
    } catch {
      resolve({ lat: fallbackLat, lon: fallbackLon, accuracy: fallbackAccuracy });
    }
  });
}

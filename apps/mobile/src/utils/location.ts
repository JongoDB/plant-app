import * as Location from 'expo-location';

/**
 * Tiny location helper. Caches the last successful position in module
 * memory so repeat calls in a session don't all hit the OS provider —
 * good enough for weather lookups, no need for full subscription / geofencing.
 *
 * Permissions are requested lazily on the first call. If the user denies,
 * we cache `null` so we don't keep asking on every screen.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

interface Cache {
  position: LatLng | null;
  permissionDenied: boolean;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let cache: Cache | null = null;

export async function getLocation(opts?: { force?: boolean }): Promise<LatLng | null> {
  if (
    !opts?.force &&
    cache &&
    !cache.permissionDenied &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS &&
    cache.position
  ) {
    return cache.position;
  }
  if (cache?.permissionDenied && !opts?.force) return null;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    cache = { position: null, permissionDenied: true, fetchedAt: Date.now() };
    return null;
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const result: LatLng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    cache = { position: result, permissionDenied: false, fetchedAt: Date.now() };
    return result;
  } catch {
    return null;
  }
}

export function getCachedLocation(): LatLng | null {
  return cache?.position ?? null;
}

export function clearLocationCache(): void {
  cache = null;
}

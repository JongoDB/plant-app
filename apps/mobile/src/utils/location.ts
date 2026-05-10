import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Location helper.
 *
 * Native: expo-location's foreground permission flow + getCurrentPosition.
 * Web: navigator.geolocation directly — expo-location's web shim isn't
 * fully implemented for SDK 55 and throws in places, so we use the standard
 * browser API and ignore expo-location entirely on web.
 *
 * We cache the last successful position for 5 minutes so repeat calls in a
 * session (home weather card + Rooti chat both ask) don't bounce off the
 * OS provider every time. Denial is cached separately so we don't re-prompt
 * on every screen.
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

const CACHE_TTL_MS = 5 * 60 * 1000;
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

  if (Platform.OS === 'web') {
    return getWebLocation();
  }
  return getNativeLocation();
}

async function getNativeLocation(): Promise<LatLng | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    cache = { position: null, permissionDenied: true, fetchedAt: Date.now() };
    return null;
  }
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const result: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    cache = { position: result, permissionDenied: false, fetchedAt: Date.now() };
    return result;
  } catch {
    return null;
  }
}

async function getWebLocation(): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    cache = { position: null, permissionDenied: true, fetchedAt: Date.now() };
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const result: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        cache = { position: result, permissionDenied: false, fetchedAt: Date.now() };
        resolve(result);
      },
      (err) => {
        // PERMISSION_DENIED = 1; treat any failure as denied for our purposes.
        const denied = err.code === 1;
        cache = {
          position: null,
          permissionDenied: denied,
          fetchedAt: Date.now(),
        };
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

export function getCachedLocation(): LatLng | null {
  return cache?.position ?? null;
}

export function clearLocationCache(): void {
  cache = null;
}

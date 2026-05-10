import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter for Better Auth's expoClient.
 *
 * Native: real expo-secure-store (Keychain on iOS, EncryptedSharedPreferences
 * on Android). Web: localStorage shim, since SecureStore throws there.
 *
 * expoClient expects a synchronous { setItem, getItem } shape.
 * SecureStore exposes both sync and async; we just expose the sync pair.
 */

interface SyncStore {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
}

const webStorage: SyncStore = {
  setItem(key, value) {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  getItem(key) {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
};

const nativeStorage: SyncStore = {
  setItem(key, value) {
    SecureStore.setItem(key, value);
  },
  getItem(key) {
    return SecureStore.getItem(key);
  },
};

export const authStorage: SyncStore = Platform.OS === 'web' ? webStorage : nativeStorage;

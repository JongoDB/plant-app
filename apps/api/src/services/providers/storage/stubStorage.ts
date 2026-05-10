// Slice 4 replaces this with LocalFsStorageProvider (writes to STORAGE_DIR
// and serves objects via /storage/* on the API).
import type {
  StorageObjectRef,
  StoragePutRequest,
  StorageProvider,
} from '@plant-app/shared';

export class StubStorageProvider implements StorageProvider {
  async put(_req: StoragePutRequest): Promise<StorageObjectRef> {
    throw new Error('StorageProvider not wired yet — see Slice 4.');
  }
  async get(_key: string): Promise<Uint8Array> {
    throw new Error('StorageProvider not wired yet — see Slice 4.');
  }
  async getUrl(_key: string): Promise<string> {
    throw new Error('StorageProvider not wired yet — see Slice 4.');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('StorageProvider not wired yet — see Slice 4.');
  }
  async exists(_key: string): Promise<boolean> {
    return false;
  }
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  StorageObjectRef,
  StoragePutRequest,
  StorageProvider,
} from '@plant-app/shared';

/**
 * Local filesystem implementation of StorageProvider.
 *
 * Writes objects under `rootDir`. Keys are path-like ("photos/<id>.jpg").
 * Path traversal is guarded by resolving every key against the root and
 * rejecting anything that escapes — keys can come indirectly from user
 * input, so this matters even with our own UUID-based naming.
 *
 * `url` returned by put/getUrl is a relative path under `publicBase`. The
 * mobile client fetches via the cookie-authed /photos/:id endpoint, not
 * directly from this URL, so the URL is effectively for backend use.
 */
export class LocalFsStorageProvider implements StorageProvider {
  private readonly rootDir: string;
  private readonly publicBase: string;

  constructor(opts: { rootDir: string; publicBase: string }) {
    this.rootDir = path.resolve(opts.rootDir);
    this.publicBase = opts.publicBase.replace(/\/+$/, '');
  }

  private safePath(key: string): string {
    const cleaned = key.replace(/^\/+/, '');
    const full = path.resolve(this.rootDir, cleaned);
    const sep = path.sep;
    if (full !== this.rootDir && !full.startsWith(this.rootDir + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(req: StoragePutRequest): Promise<StorageObjectRef> {
    const full = this.safePath(req.key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, req.data);
    return {
      key: req.key,
      contentType: req.contentType,
      size: req.data.byteLength,
      url: `${this.publicBase}/${req.key.replace(/^\/+/, '')}`,
    };
  }

  async get(key: string): Promise<Uint8Array> {
    const full = this.safePath(key);
    return fs.readFile(full);
  }

  async getUrl(key: string): Promise<string> {
    return `${this.publicBase}/${key.replace(/^\/+/, '')}`;
  }

  async delete(key: string): Promise<void> {
    const full = this.safePath(key);
    try {
      await fs.unlink(full);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const full = this.safePath(key);
    try {
      await fs.access(full);
      return true;
    } catch {
      return false;
    }
  }
}

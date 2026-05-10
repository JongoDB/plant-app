/**
 * Object storage for photos and videos. MVP impl is the local filesystem on
 * the API host. Swap to MinIO or S3 with no API change when needed.
 */

export interface StoragePutRequest {
  /** Path-like key, e.g. "users/abc/plants/xyz/photos/123.jpg". */
  key: string;
  data: Uint8Array;
  contentType: string;
}

export interface StorageObjectRef {
  key: string;
  contentType: string;
  size: number;
  /** URL the mobile app can use to fetch the object. May be presigned or relative. */
  url: string;
}

export interface StorageProvider {
  put(req: StoragePutRequest): Promise<StorageObjectRef>;
  get(key: string): Promise<Uint8Array>;
  /**
   * Returns a URL the client can use to fetch this object. May be a presigned
   * URL with an expiry, or an absolute URL served by the API.
   */
  getUrl(key: string, opts?: { expiresInSeconds?: number }): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

import type { Id, IsoDateTime } from './common.js';

/**
 * App-domain user. Mirrors a subset of Better Auth's user record.
 * The auth tables are managed by Better Auth; this is what app code reads.
 */
export interface User {
  id: Id;
  email: string;
  name?: string;
  imageUrl?: string;
  createdAt: IsoDateTime;
}

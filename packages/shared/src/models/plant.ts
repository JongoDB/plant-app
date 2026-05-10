import type { Id, IsoDate, IsoDateTime } from './common.js';
import type { HomeLocation } from './location.js';

/**
 * A plant the user owns. The core entity of the app.
 */
export interface Plant {
  id: Id;
  userId: Id;
  /** User-given name, e.g. "Fernie". Required. */
  nickname: string;
  /** Latin name, populated by Plant ID or user input. */
  scientificName?: string;
  /** Display name, e.g. "Boston Fern". */
  commonName?: string;
  homeLocation?: HomeLocation;
  acquiredOn?: IsoDate;
  notes?: string;
  /** ID of the photo to use as the cover image in lists. */
  primaryPhotoId?: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

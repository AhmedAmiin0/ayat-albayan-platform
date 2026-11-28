import type { StaffPhotoCalls } from '@ab/client-core';
import type { QueryKey } from '@tanstack/react-query';

export interface StaffPhotoOptions {
  /** The person's id, which the writes name. */
  id: string;
  /** The teacher's photo routes or the staff login's. */
  calls: StaffPhotoCalls;
  /** The photo the page loaded (null = initials). */
  photo: string | null;
  /** Refetched after a change (the person's page and the lists that show the photo). */
  invalidate: readonly QueryKey[];
}

export type StaffPhotoTarget = Pick<StaffPhotoOptions, 'id' | 'calls'>;

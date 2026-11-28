import type { ShareRequests } from '@ab/web-kit/classroom/share/use-share-requests';

/** Nothing waits, is granted or is told: the panel takes no room. */
export const isQuiet = ({ pending, granted, drawers, notice }: ShareRequests): boolean =>
  pending.length === 0 && granted.length === 0 && drawers.length === 0 && notice === null;

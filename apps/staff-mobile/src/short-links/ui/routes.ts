import { backWithin } from '@/core/nav/back-within';

// The feature sits under each tree's more tab; screens get the tree's `base` from their route file.

export const moreOf = (base: string): string => base.slice(0, base.lastIndexOf('/'));

/** Back to the list, else the list replaces this screen (opened from a link). */
export const backToList = (base: string): void => backWithin(base);

/** A link's page in this tree. */
export const linkHref = (base: string, code: string): string =>
  `${base}/${encodeURIComponent(code)}`;

import type { SalesPackageCancelCheck } from '@ab/shared';

/** The check's query key, under ['sales']: what a sales write invalidates covers it. */
export const salesPackageCancelKey = (
  subscriptionId: string,
): readonly ['sales', 'package-cancel', string] => ['sales', 'package-cancel', subscriptionId];

/** Shown only when the server allows the cancel (same check as the POST); hidden while unknown. */
export const packageCancelOffered = (check: SalesPackageCancelCheck | undefined): boolean =>
  check?.block === null;

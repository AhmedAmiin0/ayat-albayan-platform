import {
  salesPackageCancelCheckSchema,
  salesPackageCancelledSchema,
  type SalesPackageCancelCheck,
  type SalesPackageCancelled,
} from '@ab/shared';
import type { SubscriptionCancel } from '@ab/money';

/** GET: why the cancel would be refused (null: it may); POST { reason? }: the cancel. */
export const salesPackageCancelPath = (subscriptionId: string): string =>
  `/sales/packages/${encodeURIComponent(subscriptionId)}/cancel`;

/** The check's query key, under ['sales']: what a sales write invalidates covers it. */
export const salesPackageCancelKey = (
  subscriptionId: string,
): readonly ['sales', 'package-cancel', string] => ['sales', 'package-cancel', subscriptionId];

/** The GET's body, parsed at the boundary. */
export const parsePackageCancelCheck = (body: unknown): SalesPackageCancelCheck =>
  salesPackageCancelCheckSchema.parse(body);

/** Shown only when the server allows the cancel (same check as the POST); hidden while unknown. */
export const packageCancelOffered = (check: SalesPackageCancelCheck | undefined): boolean =>
  check?.block === null;

/** An app's untyped apiFetch (web and mobile each inject theirs). */
type Fetch = (path: string, init?: RequestInit) => Promise<unknown>;

/** POST { reason? }: 409 already_cancelled, has_payments, has_lessons or has_commission. */
export async function postPackageCancel(
  fetch: Fetch,
  subscriptionId: string,
  body: SubscriptionCancel,
): Promise<SalesPackageCancelled> {
  const headers = { 'Content-Type': 'application/json' };
  const init = { method: 'POST', headers, body: JSON.stringify(body) };
  return salesPackageCancelledSchema.parse(
    await fetch(salesPackageCancelPath(subscriptionId), init),
  );
}

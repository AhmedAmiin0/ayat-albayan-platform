import {
  salesPackageCancelCheckSchema,
  salesPackageCancelledSchema,
  type SalesPackageCancelCheck,
  type SalesPackageCancelled,
  type SubscriptionCancel,
} from '@ab/shared';

// «إلغاء الباقة» in the assistant's «تفاصيل الطالب» (owner 2026-11-02), web and mobile: the
// route (GET the check, POST the cancel), the query key, and whether the button shows.

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

/**
 * «إلغاء الباقة» shows only when the server says the cancel may run: no lessons, no payments,
 * not cancelled, no later commission (the same check the POST runs). Unknown yet: hidden.
 */
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

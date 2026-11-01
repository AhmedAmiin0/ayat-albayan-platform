import type { Duration, PaymentLinkKind, PaymentLinkView, PublicPaymentLink } from '@ab/shared';
import { effectiveLinkStatus, firstName, paymentLinkUrl } from '@ab/shared';
import { loadEnv } from '@/config/env/env';
import { stripeKeyIsLive } from '@/config/env/env.stripe';
import type { LinkRow } from './payment-links.queries';

// Whitelists (docs/30): explicit keys, never a spread of the row (the token appears only inside the url,
// the Stripe ids and the client request id never).

export function toLinkView(row: LinkRow, ctx: { payOrigin: string; now: Date }): PaymentLinkView {
  return {
    id: row.id,
    url: paymentLinkUrl(ctx.payOrigin, row.token),
    kind: row.kind as PaymentLinkKind,
    status: effectiveLinkStatus({ status: statusOf(row), expires_at: row.expires_at }, ctx.now),
    amount: row.amount,
    currency: row.currency,
    reference_price: row.reference_price,
    student: { id: row.student_id, code: row.student?.code ?? '', name: row.student?.name ?? '' },
    subscription_id: row.subscription_id,
    package: row.package,
    lessons: row.lessons,
    duration: row.duration as Duration,
    expires_at: row.expires_at,
    paid_at: row.paid_at,
    created_at: row.created_at,
  };
}

/**
 * The public page: the first name, the amount and the package; nothing else about the family. `sandbox`:
 * the saved key is not a live one (the page says it is a test page).
 */
export function toPublicLink(row: LinkRow, now: Date): PublicPaymentLink {
  const status = effectiveLinkStatus({ status: statusOf(row), expires_at: row.expires_at }, now);
  return {
    status: status === 'open' && row.processing ? 'processing' : status,
    first_name: firstName(row.student?.name ?? ''),
    amount: row.amount,
    currency: row.currency,
    package: row.package,
    lessons: row.lessons,
    sandbox: !stripeKeyIsLive(loadEnv()),
  };
}

const STATUSES = ['open', 'paid', 'expired', 'cancelled'] as const;
export const statusOf = (row: Pick<LinkRow, 'status'>) => STATUSES.find((s) => s === row.status) ?? 'cancelled';

// Mocks of the Stripe test build's HTTP harness (test-only, excluded from the build). Never a real Stripe call:
// the SDK's network methods are vi.fn(); only its offline signature check (webhooks) is the real one.
import Stripe from 'stripe';
import { vi } from 'vitest';
import type { LinkRow } from '../links/payment-links.queries';
import { STUDENT_ID, SUB_ID } from '../../subscriptions/money/money.fakes';
import { SALES_A } from '../../subscriptions/test-app';

export const LINK_ID = '7a000000-0000-4000-8000-000000000001';
export const TOKEN = 'tok_0123456789abcdefghijklmnopqrstuvwxyzABCDE';
export const REQ = '7b000000-0000-4000-8000-000000000001';
const WHSEC = 'whsec_test0123456789';
export const SESSION = 'cs_test_a1';

const real = new Stripe('sk_test_offline', { apiVersion: '2026-09-30.endive' });

export function stripeMocks() {
  return {
    links: {
      insert: vi.fn(), byRequest: vi.fn(), get: vi.fn(), byToken: vi.fn(), byPaymentIntent: vi.fn(), list: vi.fn(),
      forStudent: vi.fn(), cancel: vi.fn(), setSession: vi.fn(), setProcessing: vi.fn(), markPaid: vi.fn(), student: vi.fn(), attribute: vi.fn(),
    },
    events: { begin: vi.fn(), done: vi.fn() },
    limit: { check: vi.fn() },
    push: { notifyProfiles: vi.fn(), notifyAdmins: vi.fn(), notifySales: vi.fn() },
    /** SalesTeacherAssign: «المعلم/ة» of the subscribe step, sent with a link too. */
    teachers: { ensureActive: vi.fn(), assign: vi.fn(), options: vi.fn() },
    stripe: {
      checkout: { sessions: { create: vi.fn(), retrieve: vi.fn(), expire: vi.fn(), list: vi.fn() } },
      refunds: { list: vi.fn() },
      webhooks: real.webhooks,
    },
  };
}
export type StripeMocks = ReturnType<typeof stripeMocks>;

/** Signs a payload exactly as Stripe does (offline), for POST /webhooks/stripe. */
export function signed(payload: object): { body: string; signature: string } {
  const body = JSON.stringify(payload);
  return { body, signature: real.webhooks.generateTestHeaderString({ payload: body, secret: WHSEC }) };
}

export function linkRow(patch: Partial<LinkRow> = {}): LinkRow {
  return {
    id: LINK_ID, token: TOKEN, student_id: STUDENT_ID, subscription_id: SUB_ID, kind: 'new', package: '4', lessons: 4,
    duration: 90, amount: 120, reference_price: 145, currency: 'SAR', created_by: SALES_A.id, status: 'open',
    expires_at: '2099-01-01T00:00:00Z', stripe_session_id: null, stripe_payment_intent: null, paid_payment_id: null,
    paid_at: null, processing: false, client_request_id: REQ, created_at: '2026-10-28T08:00:00Z', updated_at: '2026-10-28T08:00:00Z',
    student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة أحمد' },
    ...patch,
  };
}

/** Gate ON («الدفع الإلكتروني» on, sandbox keys saved, no cap), the link open, no event seen yet. */
export function stripeDefaults(s: StripeMocks): void {
  for (const group of [s.links, s.events, s.limit, s.push, s.teachers, s.stripe.checkout.sessions, s.stripe.refunds])
    for (const fn of Object.values(group)) fn.mockReset();
  s.teachers.ensureActive.mockResolvedValue(undefined);
  s.teachers.assign.mockResolvedValue(true);
  // The integration keys, read per call through loadEnv() (no DB overlay under vitest).
  vi.stubEnv('STRIPE_ENABLED', 'true');
  vi.stubEnv('STRIPE_API_KEY', 'rk_test_abc123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', WHSEC);
  vi.stubEnv('STRIPE_MAX_DISCOUNT_PCT', '');
  s.links.byRequest.mockResolvedValue(null);
  s.links.get.mockResolvedValue(linkRow());
  s.links.byToken.mockResolvedValue(linkRow());
  s.links.byPaymentIntent.mockResolvedValue(null);
  s.links.insert.mockResolvedValue(linkRow());
  s.links.cancel.mockResolvedValue(linkRow({ status: 'cancelled' }));
  s.links.setSession.mockResolvedValue(true);
  s.links.student.mockResolvedValue({ broughtBy: null, priced: [] });
  s.links.forStudent.mockResolvedValue([]);
  s.events.begin.mockResolvedValue(false);
}

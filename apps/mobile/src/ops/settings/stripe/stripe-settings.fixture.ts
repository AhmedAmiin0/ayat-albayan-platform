import type { StripeAdminSettings } from '@ab/shared';

/** Saved settings as GET /admin/stripe/settings answers them (test-only). */
export const SETTINGS: StripeAdminSettings = {
  enabled: false,
  max_discount_pct: null,
  api_key: { set: true, masked: 'rk_test_••••abcd', updated_at: '2026-10-28T08:00:00Z' },
  webhook_secret: { set: false, masked: null, updated_at: null },
  webhook_url: 'https://api.test.example/webhooks/stripe',
};

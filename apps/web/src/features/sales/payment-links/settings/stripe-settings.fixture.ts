import type { StripeAdminSettings } from '@ab/shared';

// GET /admin/stripe/settings as the API answers it (test data only).
export const STRIPE_SETTINGS: StripeAdminSettings = {
  enabled: false,
  max_discount_pct: 10,
  api_key: { set: true, masked: 'rk_test_••••WXYZ', updated_at: '2026-10-28T08:00:00Z' },
  webhook_secret: { set: false, masked: null, updated_at: null },
  webhook_url: 'https://api.example.com/stripe/webhook',
};

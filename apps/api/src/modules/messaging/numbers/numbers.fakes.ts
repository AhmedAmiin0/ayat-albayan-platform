import type { NumberRow } from './numbers.repo';

// Test-only (excluded from the build): a wa_numbers row with obvious fake ids.

export function numberRow(over: Partial<NumberRow> = {}): NumberRow {
  return {
    id: '00000000-0000-4000-8000-0000000000a1',
    label: 'رقم الإشعارات',
    purpose: 'notifications',
    provider: 'meta',
    phone_number_id: '1000000001',
    waba_id: '2000000001',
    app_id: null,
    display_phone_e164: null,
    enabled: true,
    is_default: true,
    fallback_rank: 100,
    health: null,
    checked_at: null,
    created_at: '2026-10-23T08:00:00Z',
    updated_at: '2026-10-23T08:00:00Z',
    updated_by: null,
    ...over,
  };
}

/** A legacy env with a notifications line (meta) and optionally a chat line. */
export const LEGACY_ENV = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  WA_API_BASE: 'http://localhost:4010',
  WA_PHONE_NUMBER_ID: '1000000001',
  WA_WABA_ID: '2000000001',
  WA_ACCESS_TOKEN: 'token-fake',
  WA_APP_SECRET: 'secret-fake',
};

import type { ImportResult, NumberView, ParityView } from '@ab/shared';

// Test fixtures for «الأرقام» (not app code). Fake ids and a 555 phone only.

const AT = '2026-10-22T08:00:00Z';

export function numberView(patch: Partial<NumberView> = {}): NumberView {
  return {
    id: 'num-1',
    label: 'Notifications line',
    purpose: 'notifications',
    provider: 'meta',
    phone_number_id: '1000000001',
    waba_id: '2000000001',
    app_id: null,
    display_phone_e164: '+15550001111',
    enabled: true,
    is_default: true,
    fallback_rank: 100,
    health: { ok: true, status: 'CONNECTED', quality_rating: 'GREEN', verified_name: null, gaps: [], errors: 0 },
    checked_at: AT,
    updated_at: AT,
    secrets: { access_token: { set: true, updated_at: AT }, app_secret: { set: false, updated_at: null } },
    ...patch,
  };
}

export const NUMBERS: NumberView[] = [
  numberView(),
  numberView({ id: 'num-2', label: 'Spare line', purpose: 'chat', provider: 'kapso', phone_number_id: '1000000002', display_phone_e164: null, enabled: false, is_default: false, health: null, checked_at: null }),
];

export const PARITY_SAME: ParityView = { source: 'legacy', roles: [], differences: [] };

export const PARITY_DIFF: ParityView = {
  source: 'legacy',
  roles: [
    {
      role: 'notifications',
      number_id: 'num-1',
      number_label: 'Notifications line',
      fields: [
        { field: 'waba_id', state: 'different', legacy: '2000000009', module: '2000000001' },
        { field: 'access_token', state: 'missing', legacy: 'set', module: null },
        { field: 'provider', state: 'same', legacy: 'meta', module: 'meta' },
      ],
    },
  ],
  differences: [
    { role: 'notifications', field: 'waba_id', state: 'different' },
    { role: 'notifications', field: 'access_token', state: 'missing' },
  ],
};

export function importResult(patch: Partial<ImportResult> = {}): ImportResult {
  return {
    dry_run: true,
    changed: true,
    roles: [
      {
        role: 'notifications',
        action: 'create',
        number_id: null,
        fields: [
          { field: 'phone_number_id', secret: false, source: 'env', value: '1000000003' },
          { field: 'waba_id', secret: false, source: 'db', value: '2000000003' },
          { field: 'access_token', secret: true, source: 'db', value: null },
        ],
        secrets_to_copy: ['access_token'],
      },
      { role: 'chat', action: 'unconfigured', number_id: null, fields: [], secrets_to_copy: [] },
    ],
    ...patch,
  };
}

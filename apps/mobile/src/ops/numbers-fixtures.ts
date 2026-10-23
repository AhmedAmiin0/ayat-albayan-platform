import type { NumberView, ParityView } from '@ab/shared';

const secrets = { access_token: { set: true, updated_at: null }, app_secret: { set: false, updated_at: null } };

/** Two fake numbers: a checked, default notifications line and a disabled, unchecked chat line. */
export const numbers: NumberView[] = [
  {
    id: 'num-1',
    label: 'Main line',
    purpose: 'notifications',
    provider: 'meta',
    phone_number_id: '100000000000001',
    waba_id: null,
    app_id: null,
    display_phone_e164: '+15550001111',
    enabled: true,
    is_default: true,
    health: { ok: true, status: 'CONNECTED', quality_rating: 'GREEN', verified_name: null, gaps: [], errors: 0 },
    checked_at: '2026-10-20T09:00:00.000Z',
    updated_at: '2026-10-20T09:00:00.000Z',
    secrets,
  },
  {
    id: 'num-2',
    label: 'Chat line',
    purpose: 'chat',
    provider: 'kapso',
    phone_number_id: '100000000000002',
    waba_id: null,
    app_id: null,
    display_phone_e164: null,
    enabled: false,
    is_default: false,
    health: null,
    checked_at: null,
    updated_at: '2026-10-20T09:00:00.000Z',
    secrets,
  },
];

export const parityOk: ParityView = { source: 'legacy', roles: [], differences: [] };

export const parityDiff: ParityView = {
  source: 'module',
  roles: [],
  differences: [
    { role: 'notifications', field: 'phone_number_id', state: 'different' },
    { role: 'chat', field: 'access_token', state: 'missing' },
  ],
};

/** For screens that host the block: GET /admin/numbers → none, parity → ok; else undefined. */
export function numbersAnswer(path: string): NumberView[] | ParityView | undefined {
  if (path === '/admin/numbers') return [];
  return path === '/admin/communications/parity' ? parityOk : undefined;
}

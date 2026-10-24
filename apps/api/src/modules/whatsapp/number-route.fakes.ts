import type { OverlayNumber } from '../../common/integrations/numbers-overlay';
import { routable, type Approvals, type RoutePass } from './number-route';
import { STUB_ENV } from './whatsapp.fakes';

// Test-only (excluded from the build): numbers as the overlay carries them, and one pass's routing input.

export const N1 = '00000000-0000-4000-8000-0000000000a1';
export const N2 = '00000000-0000-4000-8000-0000000000a2';
export const C1 = '00000000-0000-4000-8000-0000000000c1';

/** An enabled notifications default with a working (stub) config of its own. */
export function overlayNum(over: Partial<OverlayNumber> = {}): OverlayNumber {
  return {
    id: N1,
    label: 'رقم الإشعارات',
    purpose: 'notifications',
    phone_number_id: '1000000001',
    waba_id: '2000000001',
    enabled: true,
    is_default: true,
    fallback_rank: 100,
    created_at: '2026-10-23T08:00:00Z',
    env: { ...STUB_ENV, phoneNumberId: over.phone_number_id ?? '1000000001', accessToken: `token-${over.id ?? N1}` },
    appSecret: null,
    ...over,
  };
}

/** notifications default N1, notifications spare N2 (rank 5), chat default C1. */
export const THREE: readonly OverlayNumber[] = [
  overlayNum(),
  overlayNum({ id: N2, phone_number_id: '1000000002', is_default: false, fallback_rank: 5 }),
  overlayNum({ id: C1, phone_number_id: '1000000003', purpose: 'chat' }),
];

export function routePass(input: { numbers?: readonly OverlayNumber[]; rules?: Record<string, string | null>; approvals?: Record<string, Record<string, string>> } = {}): RoutePass {
  const approvals: Approvals = new Map(Object.entries(input.approvals ?? {}).map(([k, v]) => [k, new Map(Object.entries(v))]));
  return { numbers: (input.numbers ?? THREE).map(routable), ruleNumbers: new Map(Object.entries(input.rules ?? {})), approvals };
}

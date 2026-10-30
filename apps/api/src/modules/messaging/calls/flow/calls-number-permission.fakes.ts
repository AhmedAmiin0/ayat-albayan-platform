import { vi } from 'vitest';
import { CALLS_LINE_ENV, fakeNumberStore } from '../calls-number.fakes';
import { ADMIN_ACTOR, FAMILY, fakeApi, fakeGate, fakeKit } from '../calls.fakes';
import type { CallingLine } from '../kapso/calling-line';
import { CallPermissions } from './call-permission.service';
import { CallsNumberPermission } from './calls-number-permission';
import type { Outbox } from '../../inbox/send/outbox';

export const CALLS: CallingLine = { env: CALLS_LINE_ENV, numberId: 'n-calls', calls: true };
export const REQ = '55555555-5555-4555-8555-555555555555';
export const NOW = new Date('2026-10-27T12:00:00Z');
export const TEMPLATE = { name: 'call_permission_ar', language: 'ar' };

/** A CallPermissions over the calls number (docs/28 §10), its Kapso, store and gates faked. */
export function setup(
  o: {
    canCall?: boolean;
    lastInbound?: string | null;
    template?: boolean;
    messaging?: boolean;
  } = {},
) {
  const api = fakeApi();
  api.permission.mockResolvedValue({
    canCall: o.canCall ?? false,
    canRequest: true,
    expiresAt: null,
  });
  const t = fakeKit({ api });
  const store = fakeNumberStore({ lastInbound: o.lastInbound ?? null });
  const gate = Object.assign(fakeGate(), {
    line: () => CALLS,
    messagingOpen: vi.fn(async () => o.messaging !== false),
    permissionTemplate: vi.fn(async () => (o.template ? TEMPLATE : null)),
  });
  const outbox = { send: vi.fn() };
  const calls = new CallsNumberPermission(t.kit, gate, store);
  return {
    ...t,
    api,
    store,
    outbox,
    gate,
    perms: new CallPermissions(t.kit, outbox as unknown as Outbox, calls),
  };
}
export const tap = (s: ReturnType<typeof setup>) =>
  s.perms.request(ADMIN_ACTOR, { phone: FAMILY, clientRequestId: REQ }, NOW);

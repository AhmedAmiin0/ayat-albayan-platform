// Test-only fakes for the calls module (excluded from the build): a recording Kapso calls API and
// the kit around the in-memory wa_calls store.
import { vi, type Mock } from 'vitest';
import { forbidden, notFound } from '@/common/http/errors';

import type { CallActor } from './access/call-access';
import type { CallsGate } from './access/calls-gate';
import { CallsKit } from './flow/call-kit';
import type { CallingLine } from './kapso/calling-line';
import type { CallsApi } from './kapso/calls-api';
import type { CallsRepo } from './store/calls.repo';
import { FakeCallsRepo } from './store/calls.repo.fakes';

export const LINE: CallingLine = {
  env: {
    ...{ provider: 'kapso', base: 'http://stub.test/kapso', version: 'v24.0' },
    ...{ phoneNumberId: 'chat-pn', wabaId: 'w1', apiKey: 'k' },
  },
  numberId: null,
};
export const FAMILY = '+201001234567';
/** The send permission every calling role holds (inbox.send). */
const SEND = ['inbox.read', 'inbox.send'] as const;
export const ADMIN_ACTOR: CallActor = { user: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin', permissions: SEND }, teacher: null, sales: null };
export const SALES_ACTOR: CallActor = { user: { id: 's1', email: null, role: 'sales', permissions: SEND }, teacher: null, sales: { salesId: 's1' } };
export const teacherActor = (phones: string[]): CallActor => ({
  user: { id: 't1', email: null, role: 'teacher', permissions: SEND },
  teacher: { teacherId: 'tch1', teacherName: 'م', phones: new Set(phones), ownPhone: '+201009999999' },
  sales: null,
});

export function fakeApi(): { [K in keyof CallsApi]: Mock<CallsApi[K]> } {
  return {
    permission: vi.fn(async () => ({ canCall: true, canRequest: true, expiresAt: null })),
    connect: vi.fn(async () => ({ waCallId: 'wacid.OUT' })),
    accept: vi.fn(async () => undefined),
    reject: vi.fn(async () => undefined),
    terminate: vi.fn(async () => undefined),
    requestPermission: vi.fn(async () => ({ waMessageId: 'wamid.PERM' })),
  };
}

type FakeThread = { guardian_id: string | null; lead_id: string | null } | null;

function fakeThreads(thread: FakeThread = { guardian_id: 'g1', lead_id: null }) {
  const rows = new Map<string, Record<string, unknown>>();
  // A replayed dedup_key returns the first row, flagged (ThreadsQueries.enqueue, rule 8).
  const enqueue = vi.fn(async (row: Record<string, unknown>) => {
    const key = String(row.dedup_key);
    const first = rows.get(key);
    if (first) return { ...first, replayed: true };
    rows.set(key, { id: `m${rows.size + 1}`, ...row });
    return { ...(rows.get(key) ?? {}) };
  });
  return { thread: vi.fn(async () => thread), numberWindows: vi.fn(async () => []), enqueue };
}

/**
 * A gate with the setting `on`, the Kapso line and the allow-list check (pass `refuse` to block a
 * phone).
 */
export function fakeGate(input: { on?: boolean; refuse?: string } = {}): CallsGate {
  return {
    enabled: async () => input.on !== false,
    assertOn: async () => {
      if (input.on === false) throw notFound('calls_disabled');
    },
    line: () => LINE,
    assertRecipient: (phone: string) => {
      if (phone === input.refuse) throw forbidden('recipient_not_allowed');
    },
  } as unknown as CallsGate;
}

export function fakeKit(input: { api?: CallsApi; thread?: FakeThread } = {}) {
  const queries = new FakeCallsRepo();
  const api = (input.api ?? fakeApi()) as ReturnType<typeof fakeApi>;
  const threads = fakeThreads(input.thread);
  const repo = queries as unknown as CallsRepo;
  const kit = new CallsKit(repo, api, threads as never, threads as never);
  return { kit, queries, api, threads };
}

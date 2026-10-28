// Test-only fakes for the calls module (excluded from the build): an in-memory wa_calls store with the
// same compare-and-set semantics as CallsQueries, a recording Kapso calls API and the kit around them.
import { vi } from 'vitest';
import { forbidden, notFound } from '../../../common/http/errors';
import type { KapsoLineEnv } from '../../../config/env/env';
import type { CallActor } from './access/call-access';
import type { CallsGate } from './access/calls-gate';
import { CallsKit } from './flow/call-kit';
import type { CallingLine } from './kapso/calling-line';
import type { CallsApi } from './kapso/calls-api';
import type { CallMove, CallRow, NewCall } from './store/call-row';
import type { CallsQueries } from './store/calls.queries';

export const LINE: CallingLine = {
  env: { provider: 'kapso', base: 'http://stub.test/kapso', version: 'v24.0', phoneNumberId: 'chat-pn', wabaId: 'w1', apiKey: 'k' } as KapsoLineEnv,
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

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

/** In-memory wa_calls: unique (created_by, client_request_id) and wa_call_id, CAS on the status. */
export class FakeCallsQueries {
  readonly rows = new Map<string, CallRow>();
  readonly order: string[] = [];

  async insert(row: NewCall): Promise<CallRow | null> {
    this.order.push('insert');
    const all = [...this.rows.values()];
    if (row.client_request_id && all.some((r) => r.created_by === row.created_by && r.client_request_id === row.client_request_id)) return null;
    if (row.wa_call_id && all.some((r) => r.wa_call_id === row.wa_call_id)) return null;
    const now = new Date().toISOString();
    const full: CallRow = {
      ...{ id: uuid(), number_id: null, guardian_id: null, lead_id: null, end_reason: null, wa_call_id: null, offer_sdp: null, answer_sdp: null },
      ...{ created_by: null, accepted_by: null, client_request_id: null, started_at: now, answered_at: null, ended_at: null },
      ...{ duration_seconds: null, error_code: null, updated_at: now },
      ...row,
    } as CallRow;
    this.rows.set(full.id, full);
    return { ...full };
  }
  async get(id: string) {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
  async byWaCallId(id: string) {
    const r = [...this.rows.values()].find((x) => x.wa_call_id === id);
    return r ? { ...r } : null;
  }
  async byRequest(by: string, req: string) {
    const r = [...this.rows.values()].find((x) => x.created_by === by && x.client_request_id === req);
    return r ? { ...r } : null;
  }
  async setWaCallId(id: string, wa: string) {
    const r = this.rows.get(id);
    if (r && !r.wa_call_id) r.wa_call_id = wa;
  }
  async move(m: CallMove) {
    const r = this.rows.get(m.id);
    if (!r || r.status !== m.from) return null;
    const { answer_sdp, ...patch } = m.patch;
    if (answer_sdp !== undefined && r.answer_sdp !== null) return null;
    Object.assign(r, patch, answer_sdp === undefined ? {} : { answer_sdp }, Object.keys(patch).length ? { updated_at: new Date().toISOString() } : {});
    return { ...r };
  }
  async live() {
    return [...this.rows.values()].filter((r) => r.status !== 'ended').map((r) => ({ ...r }));
  }
  async list(q: { phone?: string | undefined; phones?: readonly string[] | null; limit: number }) {
    return [...this.rows.values()]
      .filter((r) => (!q.phone || r.phone_e164 === q.phone) && (!q.phones || q.phones.includes(r.phone_e164)))
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, q.limit);
  }
  async names(phones: readonly string[]) {
    return new Map(phones.map((p) => [p, 'أسرة أحمد']));
  }
}

export function fakeApi(): { [K in keyof CallsApi]: ReturnType<typeof vi.fn> } & CallsApi {
  return {
    permission: vi.fn(async () => ({ canCall: true, canRequest: true, expiresAt: null })),
    connect: vi.fn(async () => ({ waCallId: 'wacid.OUT' })),
    accept: vi.fn(async () => undefined),
    reject: vi.fn(async () => undefined),
    terminate: vi.fn(async () => undefined),
  };
}

export function fakeThreads(thread: { guardian_id: string | null; lead_id: string | null } | null = { guardian_id: 'g1', lead_id: null }) {
  return { thread: vi.fn(async () => thread), numberWindows: vi.fn(async () => []) };
}

/** A gate with the setting `on`, the Kapso line and the allow-list check (pass `refuse` to block a phone). */
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

export function fakeKit(input: { api?: CallsApi; thread?: Parameters<typeof fakeThreads>[0] } = {}) {
  const queries = new FakeCallsQueries();
  const api = (input.api ?? fakeApi()) as ReturnType<typeof fakeApi>;
  const threads = fakeThreads(input.thread);
  const kit = new CallsKit(queries as unknown as CallsQueries, api, threads as never);
  return { kit, queries, api, threads };
}

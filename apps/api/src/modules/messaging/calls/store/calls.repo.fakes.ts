import type { CallMove, CallRow, NewCall } from './call-row';

// An in-memory wa_calls store with the same compare-and-set semantics as CallsRepo (test-only).

let seq = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

/** A move that changes a column stamps updated_at. */
const touched = (patch: object) =>
  Object.keys(patch).length ? { updated_at: new Date().toISOString() } : {};

/** In-memory wa_calls: unique (created_by, client_request_id) and wa_call_id, CAS on the status. */
export class FakeCallsRepo {
  readonly rows = new Map<string, CallRow>();
  readonly order: string[] = [];

  async insert(row: NewCall): Promise<CallRow | null> {
    this.order.push('insert');
    const all = [...this.rows.values()];
    const sameRequest = (r: CallRow) =>
      r.created_by === row.created_by && r.client_request_id === row.client_request_id;
    if (row.client_request_id && all.some(sameRequest)) return null;
    if (row.wa_call_id && all.some((r) => r.wa_call_id === row.wa_call_id)) return null;
    const now = new Date().toISOString();
    const full: CallRow = {
      ...{ id: uuid(), number_id: null, guardian_id: null, lead_id: null, end_reason: null },
      ...{ wa_call_id: null, offer_sdp: null, answer_sdp: null, created_by: null },
      ...{ accepted_by: null, client_request_id: null, started_at: now, answered_at: null },
      ...{ ended_at: null, duration_seconds: null, error_code: null, updated_at: now },
      ...row,
    };
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
    const r = [...this.rows.values()].find(
      (x) => x.created_by === by && x.client_request_id === req,
    );
    return r ? { ...r } : null;
  }
  async setWaCallId(id: string, wa: string) {
    const r = this.rows.get(id);
    if (r && !r.wa_call_id) r.wa_call_id = wa;
  }
  async move(m: CallMove) {
    const r = this.rows.get(m.id);
    if (r?.status !== m.from) return null;
    const { answer_sdp, ...patch } = m.patch;
    if (answer_sdp !== undefined && r.answer_sdp !== null) return null;
    const sdp = answer_sdp === undefined ? {} : { answer_sdp };
    Object.assign(r, patch, sdp, touched(patch));
    return { ...r };
  }
  async live() {
    return [...this.rows.values()].filter((r) => r.status !== 'ended').map((r) => ({ ...r }));
  }
  async list(q: { phone?: string | undefined; phones?: readonly string[] | null; limit: number }) {
    return [...this.rows.values()]
      .filter((r) => !q.phone || r.phone_e164 === q.phone)
      .filter((r) => !q.phones || q.phones.includes(r.phone_e164))
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, q.limit);
  }
  async names(phones: readonly string[]) {
    return new Map(phones.map((p) => [p, 'أسرة أحمد']));
  }
}

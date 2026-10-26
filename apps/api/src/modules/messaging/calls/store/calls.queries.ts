import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import type { CallMove, CallRow, CallSdp, NewCall } from './call-row';

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** Postgres unique_violation: a repeated request id, or a wacid the webhook already stored. */
const isDuplicate = (error: { code?: string } | null): boolean => error?.code === '23505';

const SELECT = '*, sdp:wa_call_sdp(offer_sdp, answer_sdp)' as const;
type Joined = Tables<'wa_calls'> & { sdp: CallSdp | CallSdp[] | null };

/** wa_calls + its wa_call_sdp as one flat row (the embed is one-to-one). */
function flat(row: Joined): CallRow {
  const { sdp, ...call } = row;
  const one = Array.isArray(sdp) ? sdp[0] : sdp;
  return { ...call, offer_sdp: one?.offer_sdp ?? null, answer_sdp: one?.answer_sdp ?? null };
}

/** wa_calls and wa_call_sdp (service role; RLS keeps clients read-only, and away from the SDPs). UTC ISO times. */
@Injectable()
export class CallsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The new row, or null when its unique key (request id / wacid) already exists. */
  async insert(input: NewCall): Promise<CallRow | null> {
    const { offer_sdp, ...row } = input;
    const { data, error } = await this.db.from('wa_calls').insert(row).select('id').single();
    if (isDuplicate(error)) return null;
    check(error, 'call insert');
    const sdp = await this.db.from('wa_call_sdp').insert({ call_id: data.id, offer_sdp: offer_sdp ?? null });
    check(sdp.error, 'call sdp insert');
    return this.get(data.id);
  }

  async get(id: string): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').select(SELECT).eq('id', id).maybeSingle();
    check(error, 'call read');
    return data ? flat(data) : null;
  }

  async byWaCallId(waCallId: string): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').select(SELECT).eq('wa_call_id', waCallId).maybeSingle();
    check(error, 'call read by wacid');
    return data ? flat(data) : null;
  }

  /** The call a staff member already placed with this request id (rule 8). */
  async byRequest(createdBy: string, requestId: string): Promise<CallRow | null> {
    const { data, error } = await this.db
      .from('wa_calls').select(SELECT).eq('created_by', createdBy).eq('client_request_id', requestId).maybeSingle();
    check(error, 'call read by request');
    return data ? flat(data) : null;
  }

  /** Records Meta's call id once (the connect answer or its webhook, whichever comes first). */
  async setWaCallId(id: string, waCallId: string): Promise<void> {
    const { error } = await this.db.from('wa_calls').update({ wa_call_id: waCallId }).eq('id', id).is('wa_call_id', null);
    check(error, 'call wacid update');
  }

  /**
   * Compare-and-set on the status: the moved row, or null when someone else moved it first. The answer
   * SDP is written once (only while none is stored), the rest only while the row still has `from`.
   */
  async move(m: CallMove): Promise<CallRow | null> {
    const { answer_sdp, ...patch } = m.patch;
    if (Object.keys(patch).length > 0) {
      const { data, error } = await this.db.from('wa_calls').update(patch).eq('id', m.id).eq('status', m.from).select('id').maybeSingle();
      check(error, 'call update');
      if (!data) return null;
    }
    if (answer_sdp !== undefined) {
      const { data, error } = await this.db.from('wa_call_sdp').update({ answer_sdp }).eq('call_id', m.id).is('answer_sdp', null).select('call_id').maybeSingle();
      check(error, 'call answer update');
      if (!data) return null;
    }
    return this.get(m.id);
  }

  /** Every call not ended yet (a handful): the incoming-call screen, the busy check and the sweep. */
  async live(): Promise<CallRow[]> {
    const { data, error } = await this.db.from('wa_calls').select(SELECT).neq('status', 'ended').order('started_at', { ascending: false }).limit(50);
    check(error, 'live calls read');
    return (data ?? []).map(flat);
  }

  /** The calls log, newest first (no SDP); `phones` narrows it (a teacher's families), `phone` to one chat. */
  async list(q: { phone?: string | undefined; phones?: readonly string[] | null; limit: number }): Promise<CallRow[]> {
    let query = this.db.from('wa_calls').select('*');
    if (q.phone) query = query.eq('phone_e164', q.phone);
    if (q.phones) query = query.in('phone_e164', [...q.phones]);
    const { data, error } = await query.order('started_at', { ascending: false }).limit(q.limit);
    check(error, 'calls read');
    return (data ?? []).map((r) => ({ ...r, offer_sdp: null, answer_sdp: null }));
  }

  /** Display names by phone, as the inbox shows them (v_threads). */
  async names(phones: readonly string[]): Promise<Map<string, string>> {
    if (phones.length === 0) return new Map();
    const { data, error } = await this.db.from('v_threads').select('phone_e164, display_name').in('phone_e164', [...new Set(phones)]);
    check(error, 'call names read');
    return new Map((data ?? []).flatMap((r) => (r.phone_e164 && r.display_name ? [[r.phone_e164, r.display_name]] : [])));
  }
}

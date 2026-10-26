import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import type { CallMove, CallRow, NewCall } from './call-row';

function check(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

/** Postgres unique_violation: a repeated request id, or a wacid the webhook already stored. */
const isDuplicate = (error: { code?: string } | null): boolean => error?.code === '23505';

/** wa_calls (service role; RLS keeps every client role read-only). Times are UTC ISO strings. */
@Injectable()
export class CallsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The new row, or null when its unique key (request id / wacid) already exists. */
  async insert(row: NewCall): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').insert(row).select('*').single();
    if (isDuplicate(error)) return null;
    check(error, 'call insert');
    return data;
  }

  async get(id: string): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').select('*').eq('id', id).maybeSingle();
    check(error, 'call read');
    return data;
  }

  async byWaCallId(waCallId: string): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').select('*').eq('wa_call_id', waCallId).maybeSingle();
    check(error, 'call read by wacid');
    return data;
  }

  /** The call a staff member already placed with this request id (rule 8). */
  async byRequest(createdBy: string, requestId: string): Promise<CallRow | null> {
    const { data, error } = await this.db
      .from('wa_calls').select('*').eq('created_by', createdBy).eq('client_request_id', requestId).maybeSingle();
    check(error, 'call read by request');
    return data;
  }

  /** Compare-and-set on the status: the moved row, or null when someone else moved it first. */
  async move(m: CallMove): Promise<CallRow | null> {
    const { data, error } = await this.db.from('wa_calls').update(m.patch).eq('id', m.id).eq('status', m.from).select('*').maybeSingle();
    check(error, 'call update');
    return data;
  }

  /** Records Meta's call id once (the connect answer or its webhook, whichever comes first). */
  async setWaCallId(id: string, waCallId: string): Promise<void> {
    const { error } = await this.db.from('wa_calls').update({ wa_call_id: waCallId }).eq('id', id).is('wa_call_id', null);
    check(error, 'call wacid update');
  }

  /** Every call not ended yet (a handful): the incoming-call screen, the busy check and the sweep. */
  async live(): Promise<CallRow[]> {
    const { data, error } = await this.db.from('wa_calls').select('*').neq('status', 'ended').order('started_at', { ascending: false }).limit(50);
    check(error, 'live calls read');
    return data ?? [];
  }

  /** The calls log, newest first; `phones` narrows it (a teacher's families), `phone` to one chat. */
  async list(q: { phone?: string | undefined; phones?: readonly string[] | null; limit: number }): Promise<CallRow[]> {
    let query = this.db.from('wa_calls').select('*');
    if (q.phone) query = query.eq('phone_e164', q.phone);
    if (q.phones) query = query.in('phone_e164', [...q.phones]);
    const { data, error } = await query.order('started_at', { ascending: false }).limit(q.limit);
    check(error, 'calls read');
    return data ?? [];
  }

  /** Display names by phone, as the inbox shows them (v_threads). */
  async names(phones: readonly string[]): Promise<Map<string, string>> {
    if (phones.length === 0) return new Map();
    const { data, error } = await this.db.from('v_threads').select('phone_e164, display_name').in('phone_e164', [...new Set(phones)]);
    check(error, 'call names read');
    return new Map((data ?? []).flatMap((r) => (r.phone_e164 && r.display_name ? [[r.phone_e164, r.display_name]] : [])));
  }
}

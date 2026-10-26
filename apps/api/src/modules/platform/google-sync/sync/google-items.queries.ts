import type { Database, Json } from '@ab/db';
import { GOOGLE_SYNC_KINDS, GOOGLE_SYNC_STATES, type GooglePlannedRequest, type GoogleSkipReason, type GoogleSyncKind, type GoogleSyncState } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

type ItemUpdate = Database['public']['Tables']['google_sync_items']['Update'];

/** A claimed outbox row (google_sync_items). */
export type SyncItem = {
  id: string;
  kind: GoogleSyncKind;
  subject_id: string;
  lesson_id: string | null;
  report_id: string | null;
  student_id: string | null;
  google_id: string | null;
  google_parent_id: string | null;
  content_hash: string | null;
  state: GoogleSyncState;
  attempts: number;
  claim_token: string | null;
};

/** How one item ends this pass. `retry` keeps it pending until `at`. */
export type ItemResult =
  | { state: 'synced'; googleId: string | null; parentId: string | null; hash: string | null }
  | { state: 'gone'; error: string }
  | { state: 'skipped'; reason: GoogleSkipReason; planned?: GooglePlannedRequest | null; googleId?: string | null; parentId?: string | null }
  | { state: 'failed'; error: string; attempts: number }
  | { state: 'retry'; error: string; attempts: number; at: Date };

function patchOf(r: ItemResult): ItemUpdate {
  const done = { claimed_at: null, claim_token: null } as const;
  switch (r.state) {
    case 'synced':
      return { ...done, state: 'synced', google_id: r.googleId, google_parent_id: r.parentId, content_hash: r.hash, last_error: null, skip_reason: null, planned: null, attempts: 0, synced_at: new Date().toISOString() };
    case 'gone':
      return { ...done, state: 'gone', last_error: r.error, skip_reason: null };
    case 'skipped':
      return {
        ...done, state: 'skipped', skip_reason: r.reason, planned: (r.planned ?? null) as Json, last_error: null,
        ...(r.googleId !== undefined ? { google_id: r.googleId } : {}), ...(r.parentId !== undefined ? { google_parent_id: r.parentId } : {}),
      };
    case 'failed':
      return { ...done, state: 'failed', last_error: r.error, attempts: r.attempts };
    case 'retry':
      return { ...done, state: 'pending', last_error: r.error, attempts: r.attempts, next_attempt_at: r.at.toISOString() };
  }
}

const fail = (what: string, error: { message: string }) => new Error(`google ${what} failed: ${error.message}`);

/** The outbox: claim with a token, finish only that claim (a re-queue meanwhile wins), list, retry. */
@Injectable()
export class GoogleItemsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async claim(limit: number): Promise<SyncItem[]> {
    const stale = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data, error } = await this.db.rpc('google_sync_claim', { p_limit: limit, p_stale_before: stale });
    if (error) throw fail('claim', error);
    // UPDATE … RETURNING keeps no order: a report's PDF must run before its rows in the same pass.
    return [...(data as SyncItem[])].sort((a, b) => GOOGLE_SYNC_KINDS.indexOf(a.kind) - GOOGLE_SYNC_KINDS.indexOf(b.kind));
  }

  /**
   * Records this claim's outcome (the Google id first, always). When the subject changed while the
   * worker held it (dirty), the row goes back to the queue with the id kept (dropped if gone: §2.4).
   */
  async finish(item: Pick<SyncItem, 'id' | 'claim_token'>, result: ItemResult): Promise<boolean> {
    if (!item.claim_token) return false;
    const { data, error } = await this.db.from('google_sync_items').update(patchOf(result)).eq('id', item.id).eq('claim_token', item.claim_token).select('dirty');
    if (error) throw fail('finish', error);
    if (data[0]?.dirty) {
      const again = await this.db.from('google_sync_items')
        .update({ state: 'pending', dirty: false, content_hash: null, attempts: 0, next_attempt_at: new Date().toISOString(), skip_reason: null, planned: null, ...(result.state === 'gone' ? { google_id: null } : {}) })
        .eq('id', item.id).is('claim_token', null);
      if (again.error) throw fail('requeue dirty', again.error);
    }
    return data.length === 1;
  }

  /** A report's PDF reached Drive: its attendance and summary rows that waited or failed go again. */
  async requeueReportRows(input: { reportId: string; studentId: string | null }): Promise<void> {
    const subjects = [input.reportId, ...(input.studentId ? [input.studentId] : [])];
    const { error } = await this.db.from('google_sync_items')
      .update({ state: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(), skip_reason: null, last_error: null })
      .in('kind', ['attendance_row', 'summary_row']).in('subject_id', subjects).in('state', ['failed', 'skipped'])
      // A failed row has no skip_reason: `neq` alone would drop it (NULL <> x is not true).
      .or('skip_reason.is.null,skip_reason.neq.already_in_sheet');
    if (error) throw fail('requeue rows', error);
  }

  /** Keeps this claim fresh while a slow pass works through its batch: no second worker takes it over. */
  async touch(item: Pick<SyncItem, 'id' | 'claim_token'>): Promise<void> {
    if (item.claim_token) await this.db.from('google_sync_items').update({ claimed_at: new Date().toISOString() }).eq('id', item.id).eq('claim_token', item.claim_token);
  }
  /** Release a claim untouched (the pass stopped: the account is disconnected). */
  async release(item: Pick<SyncItem, 'id' | 'claim_token'>): Promise<void> {
    if (item.claim_token) await this.db.from('google_sync_items').update({ claimed_at: null, claim_token: null }).eq('id', item.id).eq('claim_token', item.claim_token);
  }

  /** The google ids of another item (a report's PDF for its attendance row). */
  async sibling(input: { kind: GoogleSyncKind; subjectId: string }): Promise<(Pick<SyncItem, 'state' | 'google_id' | 'google_parent_id'> & { skip_reason: string | null }) | null> {
    const { data, error } = await this.db.from('google_sync_items').select('state, google_id, google_parent_id, skip_reason').eq('kind', input.kind).eq('subject_id', input.subjectId).maybeSingle();
    if (error) throw fail('sibling read', error);
    return data;
  }

  async reconcile(): Promise<number> {
    const { data, error } = await this.db.rpc('google_sync_reconcile');
    if (error) throw fail('reconcile', error);
    return data;
  }

  async requeue(reason: GoogleSkipReason): Promise<number> {
    const { data, error } = await this.db.rpc('google_sync_requeue', { p_reason: reason });
    if (error) throw fail('requeue', error);
    return data;
  }

  /**
   * «إعادة المحاولة»: a failed or skipped row, never one a worker holds, back to pending now. A gone
   * row is NOT retried: what someone deleted in Google comes back only when the lesson changes (§2.4).
   */
  async retry(id: string): Promise<boolean> {
    const reset = { state: 'pending' as const, attempts: 0, next_attempt_at: new Date().toISOString(), last_error: null, skip_reason: null, planned: null };
    const { data, error } = await this.db.from('google_sync_items').update(reset).eq('id', id).in('state', ['failed', 'skipped']).is('claim_token', null).select('id');
    if (error) throw fail('retry', error);
    return data.length === 1;
  }

  async counts(): Promise<{ counts: Record<GoogleSyncState, number>; skips: Partial<Record<GoogleSkipReason, number>> }> {
    const counts = Object.fromEntries(GOOGLE_SYNC_STATES.map((s) => [s, 0])) as Record<GoogleSyncState, number>;
    const skips: Partial<Record<GoogleSkipReason, number>> = {};
    for (const state of GOOGLE_SYNC_STATES) {
      const { count, error } = await this.db.from('google_sync_items').select('id', { count: 'exact', head: true }).eq('state', state);
      if (error) throw fail('count', error);
      counts[state] = count ?? 0;
    }
    for (const reason of ['teacher_unmapped', 'student_unmapped', 'drive_unconfirmed'] as const) {
      const { count, error } = await this.db.from('google_sync_items').select('id', { count: 'exact', head: true }).eq('state', 'skipped').eq('skip_reason', reason);
      if (error) throw fail('count', error);
      skips[reason] = count ?? 0;
    }
    return { counts, skips };
  }
}

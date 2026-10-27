import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import type { ReportReadyMessage } from './report-ready';

export type Finish =
  | { id: string; version: number; status: 'ready'; path: string }
  | { id: string; version: number; status: 'failed'; error: string }
  /** Held (the rules were unreadable): back in the queue for the next run, never `failed`. */
  | { id: string; version: number; status: 'pending' };

/**
 * The PDF queue is lesson_reports.pdf_status itself (docs/11 §5): B1's submit and the admin retry
 * (R12) set `pending`; this job moves it pending → rendering → ready | failed with compare-and-set
 * updates, so two API instances never render the same version twice.
 */
@Injectable()
export class ReportPdfQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The idle tick's one read: is any report pending or rendering? (partial index
   * lesson_reports_pdf_queue_idx, migration 20261028000830). false = nothing to recover or render.
   */
  async hasWork(): Promise<boolean> {
    const { data, error } = await this.db.from('lesson_reports').select('id').in('pdf_status', ['pending', 'rendering']).limit(1);
    if (error) throw new Error(`PDF queue probe failed: ${error.message}`);
    return data.length > 0;
  }

  /** A render that died mid-way (crash, deploy) leaves `rendering`: put it back in the queue. */
  async recoverStale(before: Date): Promise<number> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .update({ pdf_status: 'pending' })
      .eq('pdf_status', 'rendering')
      .lt('updated_at', before.toISOString())
      .select('id');
    if (error) throw new Error(`stale PDF recovery failed: ${error.message}`);
    return data.length;
  }

  /** Oldest first. */
  async pendingIds(limit: number): Promise<string[]> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id')
      .eq('status', 'submitted')
      .eq('pdf_status', 'pending')
      .order('updated_at', { ascending: true })
      .limit(limit);
    if (error) throw new Error(`pending PDFs read failed: ${error.message}`);
    return data.map((r) => r.id);
  }

  /** pending → rendering. The claimed version, or null when another worker took it first. */
  async claim(id: string): Promise<number | null> {
    const { data, error } = await this.db
      .from('lesson_reports')
      .update({ pdf_status: 'rendering', pdf_error: null })
      .eq('id', id)
      .eq('status', 'submitted')
      .eq('pdf_status', 'pending')
      .select('version')
      .maybeSingle();
    if (error) throw new Error(`PDF claim failed: ${error.message}`);
    return data?.version ?? null;
  }

  /**
   * rendering → ready | failed | pending (held), only for the version this worker claimed: a resubmit during the
   * render has set the row back to pending with a new version, and that one renders next tick.
   */
  async finish(input: Finish): Promise<boolean> {
    const values =
      input.status === 'ready'
        ? { pdf_status: input.status, pdf_path: input.path, pdf_error: null }
        : input.status === 'failed'
          ? { pdf_status: input.status, pdf_error: input.error }
          : { pdf_status: input.status };
    const { data, error } = await this.db
      .from('lesson_reports')
      .update(values)
      .eq('id', input.id)
      .eq('pdf_status', 'rendering')
      .eq('version', input.version)
      .select('id');
    if (error) throw new Error(`PDF status write failed: ${error.message}`);
    return data.length > 0;
  }

  /**
   * Queue report_ready once per report (dedup_key), and point a still-queued one at the document:
   * a message someone queued earlier gets its path; one already sent is left alone.
   */
  async queueMessage(message: ReportReadyMessage): Promise<void> {
    const insert = await this.db
      .from('messages')
      .upsert(message, { onConflict: 'dedup_key', ignoreDuplicates: true });
    if (insert.error) throw new Error(`report_ready queue failed: ${insert.error.message}`);
    const update = await this.db
      .from('messages')
      .update({ template_params: message.template_params })
      .eq('dedup_key', message.dedup_key)
      .eq('status', 'queued');
    if (update.error) throw new Error(`report_ready update failed: ${update.error.message}`);
  }
}

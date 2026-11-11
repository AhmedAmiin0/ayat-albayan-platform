import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { TablesInsert } from '@ab/db';
import { wakeOn } from '@/common/jobs';
import type { ReadyMessage } from './ready/report-ready-choice';
import { renderCutoff } from './report-pdf.cutoff';
import { ReportPdfSettings } from './report-pdf.settings';

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
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ReportPdfSettings) private readonly settings: ReportPdfSettings,
  ) {}

  /**
   * The idle tick's one read: is any report pending or rendering? (partial index
   * lesson_reports_pdf_queue_idx, migration 20261028000861). false = nothing to recover or render.
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

  /**
   * Oldest first, only reports whose teacher edit window has closed (docs/46 D5): first submit at
   * or before renderCutoff. A report still in its window waits for a later poll, so the family
   * gets the final version once; an admin edit of an older report renders at once.
   */
  async pendingIds(limit: number, now: Date): Promise<string[]> {
    const { report_teacher_edit_minutes: minutes } = await this.settings.read();
    const { data, error } = await this.db
      .from('lesson_reports')
      .select('id')
      .eq('status', 'submitted')
      .eq('pdf_status', 'pending')
      .lte('submitted_at', renderCutoff(now, minutes).toISOString())
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
   * Queue each message once per report (dedup_key), and point a still-queued one at this render:
   * its template and params (the family's PDF or link, whichever is approved NOW, so a row of a
   * template that lost its approval is not stuck); one already sent is left alone.
   */
  async queueMessages(messages: readonly ReadyMessage[]): Promise<void> {
    for (const message of messages) await this.queueMessage(message);
  }

  private async queueMessage(message: ReadyMessage): Promise<void> {
    const row: TablesInsert<'messages'> = message;
    const insert = await this.db
      .from('messages')
      .upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true });
    if (insert.error) throw new Error(`${message.template_key} queue failed: ${insert.error.message}`);
    const update = await this.db
      .from('messages')
      .update({ template_key: message.template_key, template_params: message.template_params })
      .eq('dedup_key', message.dedup_key)
      .eq('status', 'queued')
      .select('id');
    if (update.error) throw new Error(`${message.template_key} update failed: ${update.error.message}`);
    wakeOn(update.data.length); // still queued (new or earlier): wake the sender (docs/42 42-1)
  }
}

import { WA_LINES, type TemplateLineSync, type TemplateLineView, type TemplateView, type WaLine } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { lineFacts } from './template-env';
import { toTemplateView, withNumbers } from './template.mapper';
import { TemplatesRepo } from './templates.repo';
import {
  WHATSAPP_LINES, type TemplateRow, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The newest last_checked_at of one line's rows. */
const newest = (rows: readonly TemplateRow[], line: WaLine): string | null =>
  rows.reduce<string | null>((max, r) => (r.line === line && r.last_checked_at && (!max || r.last_checked_at > max) ? r.last_checked_at : max), null);

/**
 * The template catalog (R-MSG-01, issue C1, docs/12 §3.4), per number (owner 2026-10-18): what the rows
 * say, read only. Meta syncs live in TemplateVerifier (templates/sync), the admin's audited edits in
 * TemplateAdmin; the class keeps its name so the senders that ask approved() stay as they are.
 */
@Injectable()
export class TemplateRegistry {
  private readonly log = new Logger(TemplateRegistry.name);

  constructor(
    private readonly queries: TemplatesRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
  ) {}

  /**
   * Each row with number_id and its approvals per number (numbers[], docs/23 phase 5): one extra read. An
   * unreadable approvals table (e.g. the API deployed before migration 633) lists the rows without numbers[].
   */
  async list(): Promise<TemplateView[]> {
    const [rows, approvals] = await Promise.all([this.queries.all(), this.queries.approvals().catch((e: unknown) => this.unread(e, null))]);
    return approvals ? withNumbers(rows, approvals) : rows.map((row) => toTemplateView(row));
  }

  private unread<T>(e: unknown, instead: T): T {
    this.log.warn(`template ${instead === null ? 'numbers' : 'line syncs'} unread, listing without them: ${errText(e)}`);
    return instead;
  }

  /** The row when `key` is approved, else null (B2: H4 answers 409 template_not_approved). */
  async approved(key: string): Promise<TemplateView | null> {
    const row = await this.queries.get(key);
    return row?.status === 'approved' ? toTemplateView(row) : null;
  }

  /** approved() through the 60 s copy (docs/42 42-3): the composer's reopen note, never a send. */
  async approvedCached(key: string): Promise<TemplateView | null> {
    const row = await this.queries.cached(key);
    return row?.status === 'approved' ? toTemplateView(row) : null;
  }

  /**
   * GET /messaging/templates/lines: each line's facts (env only), its newest check, its last sync (stored,
   * so the copy that ran the sync and the one answering may differ; unreadable = none).
   */
  async lineViews(): Promise<TemplateLineView[]> {
    const [rows, last] = await Promise.all([this.queries.all(), this.queries.lineSyncs().catch((e: unknown) => this.unread(e, new Map<WaLine, TemplateLineSync>()))]);
    return WA_LINES.map((line) => ({
      ...lineFacts(line, this.lines[line]),
      last_checked_at: newest(rows, line),
      last_sync: last.get(line) ?? null,
    }));
  }
}

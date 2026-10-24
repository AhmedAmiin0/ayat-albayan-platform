import { WA_LINES, type TemplateHealthView, type TemplateLineSync, type TemplateLineView, type TemplateMoveView, type TemplateView, type WaLine } from '@ab/shared';
import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { lineFacts, requireLine, requireSync, syncOn } from './template-env';
import { syncLine } from './template-line-sync';
import { moveTemplate } from './template-move';
import { submitTemplate } from './template-submit';
import { toTemplateView, withNumbers } from './template.mapper';
import { TemplatesQueries } from './templates.queries';
import { WHATSAPP_LINES, type TemplateRow, type WhatsappLines } from './whatsapp.types';

/** Soon after boot, not at once: the e2e stub may still be starting. */
const BOOT_CHECK_MS = 5_000;
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The newest last_checked_at of one line's rows. */
const newest = (rows: readonly TemplateRow[], line: WaLine): string | null =>
  rows.reduce<string | null>((max, r) => (r.line === line && r.last_checked_at && (!max || r.last_checked_at > max) ? r.last_checked_at : max), null);

/**
 * The template registry (R-MSG-01, issue C1, docs/12 §3.4), per number (owner 2026-10-18). Each line's
 * sync reads only its own WABA's list (read-only) for only its own rows and imports that WABA's new
 * templates; submitting creates a template on the row's own line's WABA and is only ever the admin's
 * explicit action (POST /messaging/templates/:key/submit), never at boot or from a job; the admin can
 * move a template to the other number (PATCH /messaging/templates/:key/line).
 */
@Injectable()
export class TemplateRegistry implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TemplateRegistry.name);
  private timer: NodeJS.Timeout | null = null;
  /** Each line's last sync since boot (this instance): GET /messaging/templates/lines. */
  private readonly last = new Map<WaLine, TemplateLineSync>();

  constructor(
    private readonly queries: TemplatesQueries,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly audit: AuditService,
  ) {}

  /** Best-effort boot sync when a line is configured: log and continue, never block. */
  onApplicationBootstrap(): void {
    if (!this.configuredLines().length || !syncOn()) return;
    this.timer = setTimeout(() => void this.bootCheck(), BOOT_CHECK_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  async bootCheck(): Promise<void> {
    try {
      const { lines, templates } = await this.verifyAll();
      const notReady = templates.filter((v) => v.status !== 'approved').map((v) => `${v.key}=${v.status}`);
      const failed = lines.filter((l) => !l.ok).map((l) => `${l.line}: ${l.error ?? 'error'}`);
      this.log.log(`templates checked: ${templates.length - notReady.length} approved; ${notReady.join(', ') || 'all ready'}`);
      if (failed.length) this.log.warn(`template sync failed for ${failed.join(', ')}`);
    } catch (e) {
      this.log.warn(`boot template check skipped: ${errText(e)}`);
    }
  }

  /** Each row with number_id and its approvals per number (numbers[], docs/23 phase 5): one extra read. */
  async list(): Promise<TemplateView[]> {
    const [rows, approvals] = await Promise.all([this.queries.all(), this.queries.approvals()]);
    return withNumbers(rows, approvals);
  }

  /** The row when `key` is approved, else null (B2: H4 answers 409 template_not_approved). */
  async approved(key: string): Promise<TemplateView | null> {
    const row = await this.queries.get(key);
    return row?.status === 'approved' ? toTemplateView(row) : null;
  }

  /**
   * POST /messaging/templates/health: `line` alone, or every configured line (notifications first, so
   * the chat import sees its rows). A line whose read fails reports its error; the other still syncs.
   * 503 not_configured when the asked line (or every line) is not configured.
   */
  async verifyAll(opts: { line?: WaLine; now?: Date } = {}): Promise<TemplateHealthView> {
    requireSync();
    const now = opts.now ?? new Date();
    if (opts.line) requireLine(this.lines[opts.line], opts.line);
    const targets = opts.line ? [opts.line] : this.configuredLines();
    if (!targets.length) requireLine(this.lines.notifications, 'notifications');
    const results: TemplateLineSync[] = [];
    for (const line of targets) {
      const result = await syncLine({ queries: this.queries, lines: this.lines, log: this.log }, line, now);
      this.last.set(line, result);
      results.push(result);
    }
    return { lines: results, templates: await this.list() };
  }

  /** GET /messaging/templates/lines: each line's facts (env only), its newest check, its last sync. */
  async lineViews(): Promise<TemplateLineView[]> {
    const rows = await this.queries.all();
    return WA_LINES.map((line) => ({
      ...lineFacts(line, this.lines[line]),
      last_checked_at: newest(rows, line),
      last_sync: this.last.get(line) ?? null,
    }));
  }

  /** POST /messaging/templates/:key/submit (template-submit.ts). */
  submit(key: string, actorId: string): Promise<TemplateView> {
    return submitTemplate({ queries: this.queries, lines: this.lines, audit: this.audit }, key, actorId);
  }

  /** PATCH /messaging/templates/:key/line (template-move.ts). */
  moveLine(input: { key: string; line: WaLine }, actorId: string): Promise<TemplateMoveView> {
    const deps = { queries: this.queries, lines: this.lines, audit: this.audit, log: this.log };
    return moveTemplate({ ...deps, remember: (sync) => this.last.set(sync.line, sync) }, input, actorId);
  }

  private configuredLines(): WaLine[] {
    return WA_LINES.filter((line) => this.lines[line].configured());
  }
}

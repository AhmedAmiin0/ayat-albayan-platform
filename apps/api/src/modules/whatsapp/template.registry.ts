import type { TemplateStatus, TemplateView } from '@ab/shared';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { loadEnv } from '../../env';
import { listFor, type MetaLists } from './template-import';
import { chatList, importStarters } from './template-lines';
import { SAMPLE_REPORT, templateProblem } from './template-review';
import { findMeta, ourStatus, syncPatch } from './template-sync';
import { REGISTRY_ENTITY_ID, toTemplateView, waHttpError } from './template.mapper';
import { TemplatesQueries } from './templates.queries';
import { WaError, WHATSAPP_LINES, type WhatsappLines } from './whatsapp.types';

const SUBMITTABLE: ReadonlySet<TemplateStatus> = new Set(['not_submitted', 'rejected', 'missing']);
/** Soon after boot, not at once: the e2e stub may still be starting. */
const BOOT_CHECK_MS = 5_000;
/** Read per call, so tests can vi.stubEnv it. */
const syncOn = (): boolean => loadEnv().WA_TEMPLATE_SYNC !== false;
const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The template registry (R-MSG-01, issue C1, docs/12 §3.4). The health check reads each line's Meta
 * list (read-only), syncs every row against its own line's and imports the chat line's new templates
 * as sales starters; submitting creates a template on the notifications WABA and is only ever the
 * admin's explicit action (POST /messaging/templates/:key/submit), never at boot or from a job.
 */
@Injectable()
export class TemplateRegistry implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TemplateRegistry.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queries: TemplatesQueries,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly audit: AuditService,
  ) {}

  /** Best-effort boot health check when WhatsApp is configured: log and continue, never block. */
  onApplicationBootstrap(): void {
    if (!this.lines.notifications.configured() || !syncOn()) return;
    this.timer = setTimeout(() => void this.bootCheck(), BOOT_CHECK_MS).unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  async bootCheck(): Promise<void> {
    try {
      const views = await this.verifyAll();
      const notReady = views.filter((v) => v.status !== 'approved').map((v) => `${v.key}=${v.status}`);
      this.log.log(`templates checked: ${views.length - notReady.length} approved; ${notReady.join(', ') || 'all ready'}`);
    } catch (e) {
      this.log.warn(`boot template check skipped: ${errText(e)}`);
    }
  }

  async list(): Promise<TemplateView[]> {
    return (await this.queries.all()).map(toTemplateView);
  }

  /** The row when `key` is approved, else null (B2: H4 answers 409 template_not_approved). */
  async approved(key: string): Promise<TemplateView | null> {
    const row = await this.queries.get(key);
    return row?.status === 'approved' ? toTemplateView(row) : null;
  }

  /** POST /messaging/templates/health: every row against its line's Meta list, then the chat line's new templates. */
  async verifyAll(now = new Date()): Promise<TemplateView[]> {
    this.requireSync();
    this.requireConfigured();
    const notifications = await this.fromMeta(() => this.lines.notifications.getTemplates());
    const chat = this.lines.chat.configured() ? () => this.lines.chat.getTemplates() : null;
    const lists: MetaLists = { notifications, ...(await chatList(chat, this.log)) };
    const rows = await this.queries.all();
    const views: TemplateView[] = [];
    for (const row of rows) {
      const meta = listFor(row, lists);
      const updated = meta ? await this.queries.update(row.key, syncPatch(row, findMeta(row, meta), now)) : null;
      views.push(toTemplateView(updated ?? row));
    }
    return [...views, ...(await importStarters({ queries: this.queries, known: rows, lists, now, log: this.log }))];
  }

  /**
   * POST /messaging/templates/:key/submit. A body Meta would reject is 409 invalid_template before
   * any call. A document header (report_ready) first uploads the sample PDF for Meta's reviewer:
   * that needs WA_APP_ID (409 needs_app_id without it).
   */
  async submit(key: string, actorId: string): Promise<TemplateView> {
    this.requireSync();
    const row = await this.queries.get(key);
    if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
    // A chat-WABA template is never posted to the notifications WABA (owner 2026-10-12).
    if (!SUBMITTABLE.has(row.status) || row.line === 'chat') throw waHttpError('not_submittable', 409, { status: row.status });
    const problem = templateProblem(row);
    if (problem) throw waHttpError('invalid_template', 409, { reason: problem });
    this.requireConfigured();
    const document = row.header_format === 'document';
    const client = this.lines.notifications;
    if (document && !client.canUploadSamples()) throw waHttpError('needs_app_id', 409);
    const headerHandle = document ? await this.fromMeta(() => client.uploadSample(SAMPLE_REPORT)) : undefined;
    const res = await this.fromMeta(() => client.submitTemplate(row, { headerHandle }));
    const status = ourStatus(res.status);
    const meta_id = res.metaId || row.meta_id;
    const updated = await this.queries.update(key, {
      status,
      meta_id,
      submitted_at: new Date().toISOString(),
      last_error: null,
    });
    await this.audit.record({
      actorId,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_submitted',
      before: { key, status: row.status, meta_id: row.meta_id },
      after: { key, status, meta_id },
    });
    return toTemplateView(updated ?? row);
  }

  /** WA_TEMPLATE_SYNC=false (docs/12 §13.9): staging on Meta TEST credentials must not touch the registry. */
  private requireSync(): void {
    if (!syncOn()) throw waHttpError('template_sync_off', 409);
  }

  private requireConfigured(): void {
    if (!this.lines.notifications.configured()) throw waHttpError('not_configured', 503);
  }

  /** A Graph failure → 502 meta_error with Meta's code and message for the admin. */
  private async fromMeta<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (e) {
      if (!(e instanceof WaError)) throw e;
      throw waHttpError('meta_error', 502, { meta_code: e.info.code, meta_message: e.info.details ?? e.message });
    }
  }
}

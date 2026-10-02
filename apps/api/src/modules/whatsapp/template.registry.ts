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
import { findMeta, ourStatus, syncPatch } from './template-sync';
import { toTemplateView, waHttpError } from './template.mapper';
import { TemplatesQueries } from './templates.queries';
import { WaError, WHATSAPP_CLIENT, type WhatsappClient } from './whatsapp.types';

/** audit_log.entity_id is a uuid; the template key goes in before/after (as settings do). */
const REGISTRY_ENTITY_ID = '00000000-0000-0000-0000-000000000000';
const SUBMITTABLE: ReadonlySet<TemplateStatus> = new Set(['not_submitted', 'rejected', 'missing']);
/** Soon after boot, not at once: the e2e stub may still be starting. */
const BOOT_CHECK_MS = 5_000;

/**
 * The template registry (R-MSG-01, issue C1, docs/12 §3.4). The health check reads Meta's list
 * (read-only) and syncs every row; submitting creates a template on Meta and is only ever the
 * admin's explicit action (POST /messaging/templates/:key/submit), never at boot or from a job.
 */
@Injectable()
export class TemplateRegistry implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TemplateRegistry.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly queries: TemplatesQueries,
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsappClient,
    private readonly audit: AuditService,
  ) {}

  /** Best-effort boot health check when WhatsApp is configured: log and continue, never block. */
  onApplicationBootstrap(): void {
    if (!this.client.configured()) return;
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
      this.log.warn(`boot template check skipped: ${e instanceof Error ? e.message : String(e)}`);
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

  /** POST /messaging/templates/health: every row against Meta's list. */
  async verifyAll(now = new Date()): Promise<TemplateView[]> {
    this.requireConfigured();
    const meta = await this.fromMeta(() => this.client.getTemplates());
    const views: TemplateView[] = [];
    for (const row of await this.queries.all()) {
      const updated = await this.queries.update(row.key, syncPatch(row, findMeta(row, meta), now));
      views.push(toTemplateView(updated ?? row));
    }
    return views;
  }

  /**
   * POST /messaging/templates/:key/submit. A document header needs a sample upload handle we
   * can't produce: the admin submits report_ready in Business Manager, then runs the check.
   */
  async submit(key: string, actorId: string): Promise<TemplateView> {
    const row = await this.queries.get(key);
    if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
    if (!SUBMITTABLE.has(row.status)) throw waHttpError('not_submittable', 409, { status: row.status });
    if (row.header_format === 'document') throw waHttpError('needs_manual_submit', 409);
    this.requireConfigured();
    const res = await this.fromMeta(() => this.client.submitTemplate(row));
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

  private requireConfigured(): void {
    if (!this.client.configured()) throw waHttpError('not_configured', 503);
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

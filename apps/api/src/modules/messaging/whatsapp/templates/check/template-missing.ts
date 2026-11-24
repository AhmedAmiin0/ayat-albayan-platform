import { crmTemplateName, type WaLine } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { REGISTRY_ENTITY_ID } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The CRM cannot list its templates (docs/19), so a #132001 refusal marks the row missing.

/** Meta's «template name does not exist in the translation» (#132001), as the CRM passes it on. */
const ABSENT = /\b132001\b|does not exist in the translation/i;
const ERROR_MAX = 300;

/** Meta's own code, as the meta and kapso drivers report it (graph-errors.ts). */
const META_ABSENT = 132001;

/**
 * A crm send refused because the template (name + language) is not on the CRM's WhatsApp account.
 */
export function absentOnCrm(error: unknown): error is WaError {
  if (!(error instanceof WaError) || error.info.crmCode !== 'meta_error') return false;
  return ABSENT.test(`${error.info.details ?? ''} ${error.message}`);
}

/** A Graph send (meta / kapso line) Meta refused with #132001: no such name + language. */
const absentOnGraph = (info: WaError['info']): boolean =>
  !info.crmCode && info.code === META_ABSENT;

/**
 * Either driver's «this template is not on the WABA» (docs/19 «CRM → Meta»: the same rule after
 * the switch): the error itself, else null.
 */
export function absentOnWaba(error: unknown): WaError | null {
  if (!(error instanceof WaError)) return null;
  const graph = absentOnGraph(error.info);
  return graph || absentOnCrm(error) ? error : null;
}

interface FailedSend {
  /** messages.template_key; null for a session message. */
  key: string | null;
  /** The line it went from (module mode: its number's role). */
  line: WaLine;
  error: unknown;
  now: Date;
}

interface Absent {
  key: string;
  line: WaLine;
  error: WaError;
  now: Date;
}

/** MessageWorker calls check() after it records a failed send. */
@Injectable()
export class TemplateMissing {
  private readonly log = new Logger(TemplateMissing.name);

  constructor(
    private readonly queries: TemplatesRepo,
    private readonly audit: AuditService,
  ) {}

  /** Never throws: the send's own failure is already recorded, this is the registry's follow-up. */
  async check(send: FailedSend): Promise<void> {
    const { key, line, now } = send;
    const error = absentOnWaba(send.error);
    if (!key || !error) return;
    try {
      await this.mark({ key, line, error, now });
    } catch (e) {
      this.log.warn(`template ${key} not marked missing: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Compare-and-set: one write and audit however many fail; only the own WABA name counts. */
  private async mark(m: Absent): Promise<void> {
    const row = await this.queries.get(m.key);
    if (row?.status !== 'approved' || row.line !== m.line) return;
    const own = crmTemplateName(row);
    if (m.error.info.template !== own) {
      this.log.warn(`template ${m.key} kept: #132001 for ${m.error.info.template ?? '?'}, not ${own}`);
      return;
    }
    const last_error = (m.error.info.details ?? m.error.message).slice(0, ERROR_MAX);
    const patch = { status: 'missing' as const, last_error, last_checked_at: m.now.toISOString() };
    if (!(await this.queries.update(m.key, patch, 'approved'))) return;
    this.log.warn(`template ${m.key} marked missing on ${m.line}: Meta #132001`);
    await this.audit.record({
      actorId: null,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_marked_missing',
      before: { key: m.key, status: 'approved', line: m.line },
      after: { key: m.key, status: 'missing', line: m.line, error: last_error },
    });
  }
}

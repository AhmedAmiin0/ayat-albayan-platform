import type { TemplateCrmNameInput, TemplateMoveView, TemplateView, WaLine } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { setCrmName } from './template-crm-name';
import { setCrmStatus, type CrmTemplateStatus } from './template-crm-status';
import { rememberSync } from '@/modules/messaging/whatsapp/templates/sync/template-line-sync';
import { moveTemplate } from '@/modules/messaging/whatsapp/templates/sync/template-move';
import { submitTemplate } from '@/modules/messaging/whatsapp/templates/sync/template-submit';
import { TemplatesRepo } from './templates.repo';
import {
  WHATSAPP_LINES, type WhatsappLines,
} from '@/modules/messaging/whatsapp/whatsapp.types';

/**
 * The admin's audited template edits (R-MSG-01, docs/12 §3.4): submitting creates a template on
 * the row's own line's WABA and is only ever the admin's explicit action (POST
 * /messaging/templates/:key/submit), never at boot or from a job; the admin can move a template
 * to the other number (PATCH /messaging/templates/:key/line) and set a crm line's status and name
 * by hand.
 */
@Injectable()
export class TemplateAdmin {
  private readonly log = new Logger(TemplateAdmin.name);

  constructor(
    private readonly queries: TemplatesRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly audit: AuditService,
  ) {}

  /** POST /messaging/templates/:key/submit (template-submit.ts). */
  submit(key: string, actorId: string): Promise<TemplateView> {
    const deps = { queries: this.queries, lines: this.lines, audit: this.audit };
    return submitTemplate(deps, key, actorId);
  }

  /** PUT /messaging/templates/:key/crm-status (template-crm-status.ts): by hand, crm line only. */
  setCrmStatus(
    input: { key: string; status: CrmTemplateStatus },
    actorId: string,
  ): Promise<TemplateView> {
    return setCrmStatus({ queries: this.queries, audit: this.audit }, input, actorId);
  }

  /** PUT /messaging/templates/:key/crm-name (template-crm-name.ts): its CRM name / language. */
  setCrmName(
    input: TemplateCrmNameInput & { key: string },
    actorId: string,
  ): Promise<TemplateView> {
    return setCrmName({ queries: this.queries, audit: this.audit }, input, actorId);
  }

  /** PATCH /messaging/templates/:key/line (template-move.ts); the new line's sync is remembered. */
  moveLine(input: { key: string; line: WaLine }, actorId: string): Promise<TemplateMoveView> {
    const deps = { queries: this.queries, lines: this.lines, audit: this.audit, log: this.log };
    return moveTemplate({ ...deps, remember: (sync) => rememberSync(deps, sync) }, input, actorId);
  }
}

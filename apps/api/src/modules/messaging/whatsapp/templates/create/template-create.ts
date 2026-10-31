import type { Json } from '@ab/db';
import { registryButtons, type TemplateCreateInput, type TemplateView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { templateProblem } from '@/modules/messaging/whatsapp/template-review';
import {
  REGISTRY_ENTITY_ID,
  toTemplateView,
  waHttpError,
} from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplatesQueries } from '@/modules/messaging/whatsapp/templates/catalog/templates.queries';
import type { ImportRow } from '@/modules/messaging/whatsapp/templates/sync/template-import';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// «قالب جديد» (owner 2026-10-31: «add ability to create and sync templates from the admin»). The
// row is the registry's like any other: the existing submit sends it to its own line's WABA (meta /
// kapso), the line's sync then keeps its status; on a crm line the admin creates it in the CRM and
// marks it.

type CreatedRow = ImportRow & Pick<TemplateRow, 'body_ar' | 'params'>;

/**
 * The new registry row: key = its Meta name, not submitted, off the restricted allow-list. A header
 * is fixed text in `display` (what WhatsApp draws, and what the submit sends as a TEXT header); the
 * review samples go in `samples` by {{n}} position (migration 994).
 */
export function createdRow(input: TemplateCreateInput): CreatedRow {
  const { key, line, language, category, header, buttons, params } = input;
  const display = header ? { header: { type: 'text', text: header }, buttons: registryButtons(buttons) } : null;
  return {
    key,
    meta_name: key,
    line,
    language,
    category,
    body_ar: input.body,
    footer_ar: input.footer,
    params: params.map((p) => p.name),
    samples: params.map((p) => p.sample),
    buttons,
    // Plain JSON (strings and arrays); TS cannot see the display interfaces as Json.
    display: display as unknown as Json,
    status: 'not_submitted',
    sales_starter: false,
  };
}

/** POST /messaging/templates (templates.manage + TemplateManagerGuard on the controller). */
@Injectable()
export class TemplateCreator {
  constructor(
    private readonly queries: TemplatesQueries,
    private readonly audit: AuditService,
  ) {}

  /**
   * 409 invalid_template (a body Meta would refuse) or template_exists; audited template_created.
   */
  async create(input: TemplateCreateInput, actorId: string): Promise<TemplateView> {
    const row = createdRow(input);
    const problem = templateProblem(row);
    if (problem) throw waHttpError('invalid_template', 409, { reason: problem });
    const saved = await this.queries.create(row);
    if (!saved) throw waHttpError('template_exists', 409, { key: row.key });
    const { key, line, language, category } = input;
    await this.audit.record({
      actorId,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_created',
      after: { key, line, language, category, params: row.params },
    });
    return toTemplateView(saved);
  }
}

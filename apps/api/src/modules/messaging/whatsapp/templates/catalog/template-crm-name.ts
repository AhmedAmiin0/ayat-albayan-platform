import type { TemplateCrmNameInput, TemplateView } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { CrmStatusDeps } from './template-crm-status';
import { REGISTRY_ENTITY_ID, toTemplateView } from './template.mapper';

/**
 * A template's name / language on the WhatsApp account («اسم القالب في واتساب», docs/19, migration 680):
 * what every driver sends instead of meta_name / language (waba-template.ts); null = the default
 * (crmTemplateName). Set on any line, so a line switched from crm to meta keeps sending the WABA's own
 * templates; audited.
 */
export async function setCrmName(deps: CrmStatusDeps, input: TemplateCrmNameInput & { key: string }, actorId: string): Promise<TemplateView> {
  const { key, crm_name, crm_language } = input;
  const row = await deps.queries.get(key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  const patch = { crm_name, crm_language };
  const updated = await deps.queries.update(key, patch);
  await deps.audit.record({
    actorId,
    entity: 'message_templates',
    entityId: REGISTRY_ENTITY_ID,
    action: 'template_crm_name_set',
    before: { key, crm_name: row.crm_name, crm_language: row.crm_language, line: row.line },
    after: { key, crm_name, crm_language, line: row.line },
  });
  return toTemplateView(updated ?? { ...row, ...patch });
}

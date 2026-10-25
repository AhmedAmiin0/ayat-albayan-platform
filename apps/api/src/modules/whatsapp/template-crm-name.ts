import type { TemplateCrmNameInput, TemplateView } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import { onCrm } from './template-env';
import type { CrmStatusDeps } from './template-crm-status';
import { REGISTRY_ENTITY_ID, toTemplateView, waHttpError } from './template.mapper';

/**
 * A crm line's template name / language in the CRM (docs/19 «crm driver», migration 680): what the crm driver
 * sends instead of meta_name / language; null = the default (crmTemplateName). Like the crm status: only
 * while the row's line is on crm (409 not_crm_line otherwise), audited. The meta and kapso drivers never read it.
 */
export async function setCrmName(deps: CrmStatusDeps, input: TemplateCrmNameInput & { key: string }, actorId: string): Promise<TemplateView> {
  const { key, crm_name, crm_language } = input;
  const row = await deps.queries.get(key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  if (!onCrm(row.line)) throw waHttpError('not_crm_line', 409, { line: row.line });
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

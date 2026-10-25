import type { CRM_TEMPLATE_STATUSES, TemplateView } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '../../../../common/audit/audit.service';
import { onCrm } from './template-env';
import { REGISTRY_ENTITY_ID, toTemplateView, waHttpError } from './template.mapper';
import type { TemplatesQueries } from './templates.queries';

/** «معتمد في نظام CRM» (approved) or «غير متاح في نظام CRM» (missing). */
export type CrmTemplateStatus = (typeof CRM_TEMPLATE_STATUSES)[number];

/**
 * A crm line's template status by hand (docs/19 «crm driver»). The queue gate (teacher-alert.plan.ts,
 * confirmations) and the send gate (sender.queries.ts) read message_templates.status from our db, but a
 * crm line is never synced: its templates live in the CRM. So the admin says whether the CRM holds the
 * template approved. Only while the row's line is on crm (409 not_crm_line otherwise); audited. No sync
 * overwrites it while that line stays on crm (template-line-sync.ts answers crm_managed, touching no row).
 */
export interface CrmStatusDeps {
  queries: Pick<TemplatesQueries, 'get' | 'update'>;
  audit: Pick<AuditService, 'record'>;
}

/** PUT /messaging/templates/:key/crm-status. 404 template_not_found. */
export async function setCrmStatus(deps: CrmStatusDeps, input: { key: string; status: CrmTemplateStatus }, actorId: string): Promise<TemplateView> {
  const { key, status } = input;
  const row = await deps.queries.get(key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  if (!onCrm(row.line)) throw waHttpError('not_crm_line', 409, { line: row.line });
  const patch = { status, last_error: null, last_checked_at: new Date().toISOString() };
  const updated = await deps.queries.update(key, patch);
  await deps.audit.record({
    actorId,
    entity: 'message_templates',
    entityId: REGISTRY_ENTITY_ID,
    action: 'template_crm_status_set',
    before: { key, status: row.status, line: row.line },
    after: { key, status, line: row.line },
  });
  return toTemplateView(updated ?? { ...row, ...patch });
}

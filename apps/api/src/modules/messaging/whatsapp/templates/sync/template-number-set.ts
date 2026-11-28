import type { TemplateNumberSetView } from '@ab/shared';
import { NotFoundException } from '@nestjs/common';
import type { AuditService } from '@/common/audit/audit.service';
import { REGISTRY_ENTITY_ID, toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { ApprovalRow, NumberRef } from '@/modules/messaging/whatsapp/templates/catalog/types';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { httpError } from '@/common/http/errors';

// docs/23 phase 5, docs/23c: null is the role's default; never blocked, only a warning.

export interface NumberSetDeps {
  queries: Pick<TemplatesRepo, 'get' | 'update' | 'approvals' | 'numberRef'>;
  audit: Pick<AuditService, 'record'>;
}

export interface NumberSetInput {
  key: string;
  number_id: string | null;
}

/**
 * Decision 4: its own approved row, else (no row yet) the role's default number when the row is
 * approved.
 */
export function approvedOn(
  row: TemplateRow,
  ref: NumberRef,
  approvals: readonly ApprovalRow[],
): boolean {
  const own = approvals.find((a) => a.number_id === ref.id);
  if (own) return own.status === 'approved';
  return ref.is_default && ref.purpose === row.line && row.status === 'approved';
}

/**
 * PUT /messaging/templates/:key/number (audited, template_number_set); the same number is a no-op.
 */
export async function setTemplateNumber(
  deps: NumberSetDeps,
  input: NumberSetInput,
  actorId: string,
): Promise<TemplateNumberSetView> {
  const row = await deps.queries.get(input.key);
  if (!row) throw new NotFoundException({ code: 'template_not_found', message: 'template_not_found' });
  const ref = input.number_id === null ? null : await deps.queries.numberRef(input.number_id);
  // A calls number never sends a template (docs/28 §10): it is not a number a template can pick.
  if (input.number_id !== null && (!ref || ref.purpose === 'calls')) throw httpError(404, 'unknown_number');
  let after = row;
  if (row.number_id !== input.number_id) {
    after = (await deps.queries.update(input.key, { number_id: input.number_id })) ?? {
      ...row,
      number_id: input.number_id,
    };
    await deps.audit.record({
      actorId,
      entity: 'message_templates',
      entityId: REGISTRY_ENTITY_ID,
      action: 'template_number_set',
      before: { key: input.key, number_id: row.number_id },
      after: { key: input.key, number_id: input.number_id },
    });
  }
  const approvals = await deps.queries.approvals(input.key);
  return {
    template: toTemplateView(after, approvals),
    not_approved_on_number: ref ? !approvedOn(after, ref, approvals) : false,
  };
}

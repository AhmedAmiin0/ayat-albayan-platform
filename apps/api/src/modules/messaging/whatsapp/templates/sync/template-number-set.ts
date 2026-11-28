import type { TemplateNumberSetView } from '@ab/shared';
import type { AuditService } from '@/common/audit/audit.service';
import { REGISTRY_ENTITY_ID, toTemplateView } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { ApprovalRow, NumberRef } from '@/modules/messaging/whatsapp/templates/catalog/types';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { httpError } from '@/common/http/errors';
import { requireTemplate } from '@/modules/messaging/whatsapp/templates/catalog/template-env';

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

/** PUT /messaging/templates/:key/number (audited, template_number_set); the same number: no-op. */
export async function setTemplateNumber(
  deps: NumberSetDeps,
  input: NumberSetInput,
  actorId: string,
): Promise<TemplateNumberSetView> {
  const row = await requireTemplate(deps.queries, input.key);
  const ref = await pickedNumber(deps, input.number_id);
  const after = await withNumber({ deps, row, input, actorId });
  const approvals = await deps.queries.approvals(input.key);
  return {
    template: toTemplateView(after, approvals),
    not_approved_on_number: ref ? !approvedOn(after, ref, approvals) : false,
  };
}

/** null = the role's default; 404 unknown_number for no such number. */
async function pickedNumber(
  deps: NumberSetDeps,
  numberId: string | null,
): Promise<NumberRef | null> {
  if (numberId === null) return null;
  const ref = await deps.queries.numberRef(numberId);
  // A calls number never sends a template (docs/28 §10): it is not a number a template can pick.
  if (!ref || ref.purpose === 'calls') throw httpError(404, 'unknown_number');
  return ref;
}

interface NumberChange {
  deps: NumberSetDeps;
  row: TemplateRow;
  input: NumberSetInput;
  actorId: string;
}

/** The row on its new number, audited; unchanged when the number is the same. */
async function withNumber({ deps, row, input, actorId }: NumberChange): Promise<TemplateRow> {
  if (row.number_id === input.number_id) return row;
  const patch = { number_id: input.number_id };
  const after = (await deps.queries.update(input.key, patch)) ?? { ...row, ...patch };
  await deps.audit.record({
    actorId,
    entity: 'message_templates',
    entityId: REGISTRY_ENTITY_ID,
    action: 'template_number_set',
    before: { key: input.key, number_id: row.number_id },
    after: { key: input.key, number_id: input.number_id },
  });
  return after;
}

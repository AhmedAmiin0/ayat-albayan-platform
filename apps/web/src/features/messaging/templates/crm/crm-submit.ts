import type { TemplateView } from '@ab/shared';
import { canSubmit } from '@/features/messaging/templates/api';

// «إرسال إلى ميتا» on a crm line (docs/39): the API submits through the CRM, except what only
// the CRM dashboard can do (409 crm_managed, template-submit.ts / crm.client.ts). Pure: the
// row's button shows exactly when the server would accept it.

/** Why a submittable crm row is made in the CRM dashboard instead. */
export type CrmOnly = 'document' | 'rejected';

type Row = Pick<TemplateView, 'status' | 'header_format' | 'meta_id'>;

/** A PDF header: the CRM uploads no sample file for Meta's reviewer. */
const hasDocument = (tpl: Row): boolean => tpl.header_format === 'document';
/** Meta already holds it rejected: the CRM's API has no edit. */
const editedInCrm = (tpl: Row): boolean => tpl.status === 'rejected' && Boolean(tpl.meta_id);

const ONLY_IN_CRM: readonly (readonly [CrmOnly, (tpl: Row) => boolean])[] = [
  ['document', hasDocument],
  ['rejected', editedInCrm],
];

/** The reason a submittable crm row stays in the CRM dashboard; null when it may go from here. */
export function crmOnly(tpl: Row): CrmOnly | null {
  if (!canSubmit(tpl)) return null;
  return ONLY_IN_CRM.find(([, applies]) => applies(tpl))?.[0] ?? null;
}

/** not_submitted / missing, or rejected without a meta_id, and never a document header. */
export const crmCanSubmit = (tpl: Row): boolean => canSubmit(tpl) && crmOnly(tpl) === null;

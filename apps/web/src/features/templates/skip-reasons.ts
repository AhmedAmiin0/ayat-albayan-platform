import type { TemplateSkipReason } from '@ab/shared';
import { t } from '@/lib/i18n';

// Why a sync did not import a Meta template, in the admin's language (the API sends codes, never prose).

const TEXTS: Record<TemplateSkipReason['code'], string> = t.templates.perNumber.skipReasons;

/** templates.perNumber.skipReasons.<code>, with its {category} / {max} filled in. */
export function skipReasonText(reason: TemplateSkipReason): string {
  const text = TEXTS[reason.code];
  if (reason.code === 'category') return text.replace('{category}', reason.category);
  if (reason.code === 'too_many_vars') return text.replace('{max}', String(reason.max));
  return text;
}

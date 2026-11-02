import { BODY_SLOTS, crmTemplateName } from '@ab/shared';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// A template named outside the platform (the old Apps Script, through the script relay) → its
// message_templates row, and its body values in messages.template_params' shape («1», «2», …).
// Pure; display only: nothing here decides what is sent.

type Matcher = (t: TemplateRow, name: string) => boolean;

/** First kind that matches wins: our key, Meta's name, then the CRM's name (admin's or default). */
const MATCHERS: readonly Matcher[] = [
  (t, name) => t.key === name,
  (t, name) => t.meta_name === name,
  (t, name) => t.crm_name === name || crmTemplateName(t) === name,
];

/** The catalog row a script's template name stands for; null when none. */
export function templateByName(rows: readonly TemplateRow[], name: string): TemplateRow | null {
  const hits = MATCHERS.map((matches) => rows.find((t) => matches(t, name)));
  return hits.find((t) => t !== undefined) ?? null;
}

const SLOT = /\{\{(\d+)\}\}/g;

/** How many body values the template takes: its highest {{n}} (0 for none). */
export function slotCount(bodyAr: string): number {
  return Math.max(0, ...Array.from(bodyAr.matchAll(SLOT), (m) => Number(m[1])));
}

const fitsTemplate = (values: readonly string[], t: Pick<TemplateRow, 'body_ar'>): boolean =>
  values.length === slotCount(t.body_ar) && values.length <= BODY_SLOTS.length;

/** The values as «1», «2», … in order; null when their count is not the template's own. */
export function numberedParams(
  values: readonly string[],
  t: Pick<TemplateRow, 'body_ar'>,
): Record<string, string> | null {
  if (!fitsTemplate(values, t)) return null;
  return Object.fromEntries(values.map((v, i) => [String(i + 1), v]));
}

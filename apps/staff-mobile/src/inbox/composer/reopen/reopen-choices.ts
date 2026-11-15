import { reopenChoices, type ReopenChoices } from '@ab/client-core';
import { forAudience, type TemplateView } from '@ab/shared';

/** This user's approved templates for this chat's audience (TemplateList's own filter). */
export const audienceOf = (rows: readonly TemplateView[] | undefined, teacher: boolean) =>
  (rows ?? []).filter((row) => forAudience(row.key, teacher));

/**
 * «إعادة فتح المحادثة» (owner 2026-11-14): the reopen choices among this user's approved templates
 * for this chat's audience (the picker's own list, TemplateList), on the chat line only.
 */
export function reopenAllowed(
  rows: readonly TemplateView[] | undefined,
  teacher: boolean,
  preferred: string | undefined,
): ReopenChoices {
  return reopenChoices(audienceOf(rows, teacher), preferred);
}

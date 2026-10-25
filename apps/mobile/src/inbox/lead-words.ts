import { leadStatusStyle, type StatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// A lead's status / source as the inbox lists show them. The API can send a value this build has
// no word or shape for yet (a newer DB enum): it shows raw and neutral instead of crashing the row.

const NEUTRAL: StatusStyle = { tone: 'neutral', glyph: 'hollow' };

/** Spread into <StatusChip>: the status's nuqta shape + its ar.json word. */
export function leadStatusChip(status: string): StatusStyle & { label: string } {
  const style = (leadStatusStyle as Record<string, StatusStyle | undefined>)[status] ?? NEUTRAL;
  const word = (t.enums.leadStatus as Record<string, string | undefined>)[status];
  return { ...style, label: word ?? status };
}

/** «إعلان فيسبوك», or the raw value. */
export const leadSourceWord = (source: string): string =>
  (t.enums.leadSource as Record<string, string | undefined>)[source] ?? source;

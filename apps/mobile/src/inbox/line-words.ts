import type { WaLine } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';

// Which WhatsApp line a message came in on or left from (docs/12 §13.10). The API can send a line
// this build has no word for yet (a newer DB enum): it shows raw instead of crashing the bubble.

/** «خط المحادثات», or the raw value. */
export const lineWord = (line: WaLine | string): string =>
  (t.enums.waLine as Record<string, string | undefined>)[line] ?? line;

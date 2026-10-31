import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';

const cities: Record<string, string | undefined> = t.tz;

/**
 * «الأوقات بتوقيتك (القاهرة)»: the note on a screen or a picker whose times read in the viewer's
 * zone `tz` (useViewerTz, docs/34); a zone without an ar.json city keeps its id (LTR).
 */
export function zoneNote(tz: string): string {
  return t.schedule.zoneNote.replace('{city}', cities[tz] ?? ltr(tz));
}

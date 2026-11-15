import { t, ltr } from '@ab/mobile-kit';

const cities: Record<string, string | undefined> = t.tz;

/**
 * «الأوقات بتوقيتك (القاهرة)»: the note on a screen or a picker whose times read in the viewer's
 * zone `tz` (useViewerTz, docs/34); a zone without an ar.json city keeps its id (LTR).
 */
export function zoneNote(tz: string): string {
  return t.schedule.zoneNote.replace('{city}', cities[tz] ?? ltr(tz));
}

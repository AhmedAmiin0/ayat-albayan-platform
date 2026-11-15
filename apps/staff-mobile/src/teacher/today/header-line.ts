import { zoneNote } from '@/core/lib/clock';
import { localDate, shortDate } from '@/today';

/**
 * The line under her greeting (docs/48): the date without the year, and «الأوقات بتوقيتك (القاهرة)»
 * only when her times read in another zone than the phone's (the profile zone differs).
 */
export function teacherDateLine(now: Date, zones: { viewer: string; device: string }): string {
  const zone = zones.viewer === zones.device ? [] : [zoneNote(zones.viewer)];
  // Her calendar day, not Riyadh's: 09:00Z of her date falls on the same date in Riyadh.
  const hers = new Date(`${localDate(now, zones.viewer)}T09:00:00Z`);
  return [shortDate(hers), ...zone].join(' · ');
}

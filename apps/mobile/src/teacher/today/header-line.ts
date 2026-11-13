import { zoneNote } from '@/core/lib/clock';
import { shortDate } from '@/today';

/**
 * The line under her greeting (docs/48): the date without the year, and «الأوقات بتوقيتك (القاهرة)»
 * only when her times read in another zone than the phone's (the profile zone differs).
 */
export function teacherDateLine(now: Date, zones: { viewer: string; device: string }): string {
  const zone = zones.viewer === zones.device ? [] : [zoneNote(zones.viewer)];
  return [shortDate(now), ...zone].join(' · ');
}

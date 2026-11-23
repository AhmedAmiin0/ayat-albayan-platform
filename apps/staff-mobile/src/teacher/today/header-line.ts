import { zoneNote } from '@/core/lib/clock';
import { localDate, shortDate } from '@/today';

/** The zone note only when her profile zone differs from the phone's (docs/48). */
export function teacherDateLine(now: Date, zones: { viewer: string; device: string }): string {
  const zone = zones.viewer === zones.device ? [] : [zoneNote(zones.viewer)];
  // Her calendar day, not Riyadh's: 09:00Z of her date falls on the same date in Riyadh.
  const hers = new Date(`${localDate(now, zones.viewer)}T09:00:00Z`);
  return [shortDate(hers), ...zone].join(' · ');
}

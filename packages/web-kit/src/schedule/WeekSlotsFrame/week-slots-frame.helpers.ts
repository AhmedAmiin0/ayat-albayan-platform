import { tzCity } from '@ab/web-kit/components/ui/form/TimeZoneSelect';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const cityOf = (tz: string) => tzCity(tz) ?? tz;

/** The viewer's zone when the student shares it, else the student's for the small times. */
export const zoneLegend = (studentTz: string, viewerTz: string): string =>
  studentTz === viewerTz
    ? t.schedule.zoneNote.replace('{city}', cityOf(viewerTz))
    : t.booking.slotLegendViewer.replace('{city}', cityOf(studentTz));

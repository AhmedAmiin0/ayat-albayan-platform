import { addDays, dateText, type DateFields } from '@ab/time';
import { t } from '../../i18n/i18n';
import { locale } from '../../i18n/locale';

// Calendar days are formatted at UTC noon in UTC: the device's own zone never shifts them.
const SHORT: DateFields = { day: 'numeric', month: 'long' };
const calendarText = (date: string, fields: DateFields) =>
  dateText(new Date(`${date}T12:00:00Z`), { tz: 'UTC', locale }, fields);

/** `start` is YYYY-MM-DD. */
export function weekLabel(start: string): string {
  return t.calendar.range
    .replace('{from}', calendarText(start, SHORT))
    .replace('{to}', calendarText(addDays(start, 6), SHORT));
}

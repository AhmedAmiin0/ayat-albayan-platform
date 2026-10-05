// Invented calendars in Google's export shape (no real people): duplicate series, a cancelled event,
// an exception instance, an ended series and the main calendar.
export const TEACHER_ICS = [
  'BEGIN:VCALENDAR', 'X-WR-CALNAME:آيات البيان — Testa', 'X-WR-TIMEZONE:Asia/Riyadh',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20260926T080000', 'DTEND;TZID=Asia/Riyadh:20260926T084500',
  'RRULE:FREQ=WEEKLY;BYDAY=SA,TU;UNTIL=20261220T000000Z', 'SUMMARY:حلقة — سلمى تجربة (يحتاج تأكيد)', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20260926T080000', 'DTEND;TZID=Asia/Riyadh:20260926T084500',
  'RRULE:FREQ=WEEKLY;BYDAY=SA,TU;UNTIL=20261220T000000Z', 'SUMMARY:حلقة — سلمى تجربة (يحتاج تأكيد)', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART:20261001T130000Z', 'DTEND:20261001T140000Z',
  'RRULE:FREQ=WEEKLY;COUNT=8', 'SUMMARY:حلقة — نور', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20260801T100000', 'DTEND;TZID=Asia/Riyadh:20260801T104500',
  'RRULE:FREQ=WEEKLY;BYDAY=SA;UNTIL=20260830T000000Z', 'SUMMARY:حلقة — انتهى', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20261003T080000', 'RECURRENCE-ID;TZID=Asia/Riyadh:20261003T080000',
  'SUMMARY:حلقة — سلمى تجربة', 'END:VEVENT',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20261005T090000', 'STATUS:CANCELLED', 'SUMMARY:حلقة — ملغي', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

export const MAIN_ICS = [
  'BEGIN:VCALENDAR', 'X-WR-CALNAME:أكاديمية آيات البيان',
  'BEGIN:VEVENT', 'DTSTART;TZID=Asia/Riyadh:20261004T090000', 'SUMMARY:حلقة — سلمى تجربة', 'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

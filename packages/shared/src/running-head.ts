// Running head (docs/07 §1.7, §7): Gregorian + Hijri date and the Riyadh / Cairo clocks.
// Western digits everywhere (one numeral system), Hijri via Umm al-Qura. DB stays UTC.

export const RIYADH_TZ = 'Asia/Riyadh';
export const CAIRO_TZ = 'Africa/Cairo';

export interface RunningHead {
  /** «الخميس 1 أكتوبر 2026» (Riyadh calendar day). */
  gregorian: string;
  /** «20 ربيع الآخر 1448 هـ». */
  hijri: string;
  /** «15:20», 24h. */
  riyadhTime: string;
  cairoTime: string;
}

const gregorian = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: RIYADH_TZ,
});
const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: RIYADH_TZ,
});

/** «HH:mm» in `timeZone`, 24h, Western digits. */
export function clockTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

/** Weekday, day, month, year joined by spaces (Intl puts «، » after the weekday). */
function gregorianLine(date: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    gregorian.formatToParts(date).find((p) => p.type === type)?.value ?? '';
  return [part('weekday'), part('day'), part('month'), part('year')].join(' ');
}

export function formatRunningHead(date: Date): RunningHead {
  return {
    gregorian: gregorianLine(date),
    hijri: hijri.format(date),
    riyadhTime: clockTime(date, RIYADH_TZ),
    cairoTime: clockTime(date, CAIRO_TZ),
  };
}

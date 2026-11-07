// The native picker (@expo/ui DateTimePicker) works on the phone's own clock; the fields keep plain
// wall values: a day «YYYY-MM-DD» and a time «HH:MM». A day travels as that day's local noon (no
// zone or DST edge moves it), a time as that clock on a fixed day. Pure.

const pad = (n: number): string => String(n).padStart(2, '0');

/** «YYYY-MM-DD» → that day at the phone's local noon. */
export function dayToDate(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** The phone-local day of a picked Date, «YYYY-MM-DD». */
export const dateToDay = (at: Date): string =>
  `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

/** «HH:MM» → that clock on a fixed local day (2000-01-01); '' opens on 12:00. */
export function timeToDate(time: string): Date {
  const [h = 12, m = 0] = time === '' ? [] : time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m);
}

/** The phone-local clock of a picked Date, «HH:MM» (24 h, the value every API takes). */
export const dateToTime = (at: Date): string => `${pad(at.getHours())}:${pad(at.getMinutes())}`;

// Calendar series → the standing weekly slots (teacher, student, weekday, local time, minutes).
// The old calendars hold the same student in several duplicate series (docs/02 B1: «نمنم» 7 times):
// identical slots collapse into one with a `series` count, so the comparison is per lesson slot.

export const ACADEMY_TZ = 'Asia/Riyadh';
const WEEK_MS = 7 * 86_400_000;

/** «آيات البيان — Abrar» → «Abrar»; a calendar without « — name » (the main one) → null. */
export function teacherOf(calendar) {
  const parts = (calendar ?? '').split(/\s[—–-]\s/);
  return parts.length > 1 ? (parts.at(-1) ?? '').trim() || null : null;
}

/** «حلقة — مرام يحي (يحتاج تأكيد)» → «مرام يحي». */
export function studentOf(summary) {
  return summary.replace(/^\s*حلقة\s*[—–-]\s*/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** A stamp as wall time + its zone: UTC stamps become Riyadh time, zoned ones stay as written. */
export function localParts(stamp) {
  if (!stamp.utc) return { date: stamp.date, time: stamp.time ?? '00:00', tz: stamp.tz ?? ACADEMY_TZ };
  const at = new Date(`${stamp.date}T${stamp.time}:00Z`);
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: ACADEMY_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, tz: ACADEMY_TZ };
}

const weekdayOf = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** The last day a series still runs (null = no end), so ended series are left out. */
export function lastDate(series) {
  const r = series.rrule;
  if (!r) return localParts(series.start).date;
  if (r.until) return r.until.date;
  if (!r.count) return null;
  const perWeek = Math.max(r.byday.length, 1);
  const end = new Date(`${series.start.date}T12:00:00Z`).getTime() + Math.ceil(r.count / perWeek) * WEEK_MS;
  return new Date(end).toISOString().slice(0, 10);
}

function minutesOf(series) {
  if (!series.end?.time || !series.start.time) return null;
  const a = new Date(`${series.start.date}T${series.start.time}:00Z`).getTime();
  const b = new Date(`${series.end.date}T${series.end.time}:00Z`).getTime();
  return Math.round((b - a) / 60_000) || null;
}

/** Calendars → unique slots still running on `today`, plus counts of what was left out and why. */
export function toSlots(calendars, today) {
  const slots = new Map();
  const skipped = { mainCalendar: 0, ended: 0, notWeekly: 0, allDay: 0 };
  for (const cal of calendars) {
    const teacher = teacherOf(cal.calendar);
    for (const s of cal.series) {
      if (!teacher) skipped.mainCalendar += 1;
      else if (!s.start.time) skipped.allDay += 1;
      else if (s.rrule && s.rrule.freq !== 'WEEKLY') skipped.notWeekly += 1;
      else if ((lastDate(s) ?? '9999-12-31') < today) skipped.ended += 1;
      else addSeries(slots, { teacher, series: s });
    }
  }
  return { slots: [...slots.values()], skipped };
}

function addSeries(slots, { teacher, series }) {
  const local = localParts(series.start);
  const days = series.rrule?.byday.length ? series.rrule.byday : [weekdayOf(local.date)];
  const student = studentOf(series.summary);
  for (const weekday of days) {
    const key = [teacher, student, weekday, local.time, local.tz].join('|');
    const slot = slots.get(key) ?? { teacher, student, weekday, at: local.time, tz: local.tz, minutes: minutesOf(series), series: 0 };
    slot.series += 1;
    slots.set(key, slot);
  }
}

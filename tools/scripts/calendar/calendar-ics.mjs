// Parses Google Calendar .ics exports (the old Apps Script calendars, docs/01 T5/T6) into series:
// one per VEVENT, with the calendar's name, the event title, its first start and its weekly rule.
// No dependencies: Google's export is plain RFC 5545 text. Exception instances (RECURRENCE-ID) and
// cancelled events are dropped: the calendar's standing schedule is what we compare.

const DAY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/** RFC 5545 line unfolding: a line starting with a space or tab continues the previous one. */
export function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

const unescapeText = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/** «DTSTART;TZID=Asia/Riyadh:20260926T080000» → { name, params, value }. */
export function parseLine(line) {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const [name, ...rest] = line.slice(0, colon).split(';');
  const params = Object.fromEntries(rest.map((p) => p.split('=')).map(([k, v]) => [k.toUpperCase(), v]));
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** A DTSTART/DTEND/UNTIL value → { date: 'YYYY-MM-DD', time: 'HH:MM' | null, utc: boolean, tz }. */
export function parseStamp(value, tz = null) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi, z] = m;
  return { date: `${y}-${mo}-${d}`, time: h ? `${h}:${mi}` : null, utc: Boolean(z), tz };
}

/** «FREQ=WEEKLY;BYDAY=SA,TU;UNTIL=20261006T000000Z» → { freq, byday: [6, 2], until, count }. */
export function parseRrule(value) {
  const kv = Object.fromEntries(value.split(';').map((p) => p.split('=')));
  const byday = (kv.BYDAY ?? '').split(',').map((d) => DAY[d.slice(-2)]).filter((d) => d !== undefined);
  return {
    freq: kv.FREQ ?? null,
    byday,
    until: kv.UNTIL ? parseStamp(kv.UNTIL) : null,
    count: kv.COUNT ? Number(kv.COUNT) : null,
  };
}

/** One .ics file → { calendar, series: [{ summary, start, end, rrule }] }. */
export function parseIcs(text) {
  const state = { calendar: null, series: [], ev: null };
  for (const line of unfold(text).map(parseLine)) if (line) readLine(state, line);
  return { calendar: state.calendar, series: state.series.map(({ skip, ...s }) => s) };
}

const keepEvent = (ev) => Boolean(ev && !ev.skip && ev.start && ev.summary);

function closeEvent(state) {
  if (keepEvent(state.ev)) state.series.push(state.ev);
  state.ev = null;
}

const MARKERS = new Map([
  ['BEGIN:VEVENT', (state) => (state.ev = { skip: false })],
  ['END:VEVENT', closeEvent],
]);

function readLine(state, line) {
  const marker = MARKERS.get(`${line.name}:${line.value}`);
  if (marker) return marker(state);
  return state.ev ? readEventLine(state.ev, line) : readCalendarLine(state, line);
}

function readCalendarLine(state, line) {
  if (line.name === 'X-WR-CALNAME') state.calendar = unescapeText(line.value);
}

const stampOf = (line) => parseStamp(line.value, line.params.TZID ?? null);
const isCancelled = (line) => line.value.toUpperCase() === 'CANCELLED';

const EVENT_FIELDS = new Map([
  ['SUMMARY', (ev, line) => (ev.summary = unescapeText(line.value))],
  ['DTSTART', (ev, line) => (ev.start = stampOf(line))],
  ['DTEND', (ev, line) => (ev.end = stampOf(line))],
  ['RRULE', (ev, line) => (ev.rrule = parseRrule(line.value))],
  ['RECURRENCE-ID', (ev) => (ev.skip = true)],
  ['STATUS', (ev, line) => (ev.skip ||= isCancelled(line))],
]);

function readEventLine(ev, line) {
  EVENT_FIELDS.get(line.name)?.(ev, line);
}

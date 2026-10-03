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
  return { freq: kv.FREQ ?? null, byday, until: kv.UNTIL ? parseStamp(kv.UNTIL) : null, count: kv.COUNT ? Number(kv.COUNT) : null };
}

/** One .ics file → { calendar, series: [{ summary, start, end, rrule }] }. */
export function parseIcs(text) {
  const out = { calendar: null, series: [] };
  let ev = null;
  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === 'X-WR-CALNAME' && !ev) out.calendar = unescapeText(line.value);
    else if (line.name === 'BEGIN' && line.value === 'VEVENT') ev = { skip: false };
    else if (line.name === 'END' && line.value === 'VEVENT') {
      if (ev && !ev.skip && ev.start && ev.summary) out.series.push(ev);
      ev = null;
    } else if (ev) readEventLine(ev, line);
  }
  out.series = out.series.map(({ skip, ...s }) => s);
  return out;
}

function readEventLine(ev, line) {
  if (line.name === 'SUMMARY') ev.summary = unescapeText(line.value);
  else if (line.name === 'DTSTART') ev.start = parseStamp(line.value, line.params.TZID ?? null);
  else if (line.name === 'DTEND') ev.end = parseStamp(line.value, line.params.TZID ?? null);
  else if (line.name === 'RRULE') ev.rrule = parseRrule(line.value);
  else if (line.name === 'RECURRENCE-ID') ev.skip = true;
  else if (line.name === 'STATUS' && line.value.toUpperCase() === 'CANCELLED') ev.skip = true;
}

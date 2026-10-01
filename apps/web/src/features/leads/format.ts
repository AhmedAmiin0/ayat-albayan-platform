// Display helpers for the inbox. DB times are UTC; these render in the viewer's zone (rule 6).
const dateTime = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
const relative = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

/** Lead age as relative time ("منذ ٣ أيام"): minutes under an hour, hours under a day. */
export function formatAge(iso: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(iso).getTime();
  if (ms < HOUR) return relative.format(-Math.floor(ms / MINUTE), 'minute');
  if (ms < DAY) return relative.format(-Math.floor(ms / HOUR), 'hour');
  return relative.format(-Math.floor(ms / DAY), 'day');
}

/** Latest message either way, or null when the thread is empty. */
export function lastMessageAt(row: {
  last_inbound_at: string | null;
  last_outbound_at: string | null;
}): string | null {
  const times = [row.last_inbound_at, row.last_outbound_at].filter((t) => t !== null);
  if (times.length === 0) return null;
  return times.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b));
}

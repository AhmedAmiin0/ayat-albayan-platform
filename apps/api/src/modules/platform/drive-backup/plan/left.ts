// Objects the night's cap (or Drive's room) leaves for later, watched across nights (round 3):
// each keeps the night it was first left, so one left every night is found even while the newer
// ones before it go the next night.

/** `bucket/key` → when it was first left (ISO). At most WATCH_MAX: the oldest are kept. */
type LeftWatch = Readonly<Record<string, string>>;

interface LeftState {
  left_count: number;
  left_watch: LeftWatch;
}

const WATCH_MAX = 100;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Left on 3 nights in a row (the first, the second, and tonight): the admins are told. */
const STUCK_MS = 2 * DAY_MS - HOUR_MS;

const byAge = (a: [string, string], b: [string, string]) =>
  a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]);

/** Tonight's left objects, each with the night it was first left (kept from the last watch). */
export function leftWatch(
  prev: LeftWatch,
  input: { left: readonly string[]; now: Date },
): LeftState {
  const now = input.now.toISOString();
  const all: [string, string][] = input.left.map((id) => [id, prev[id] ?? now]);
  const kept = all.sort(byAge).slice(0, WATCH_MAX);
  return { left_count: input.left.length, left_watch: Object.fromEntries(kept) };
}

export interface OldestLeft {
  count: number;
  key: string;
  since: string;
}

/** The object left the longest, with the count; null: nothing left. */
export function oldestLeft(s: LeftState): OldestLeft | null {
  const first = Object.entries(s.left_watch).sort(byAge)[0];
  return first ? { count: s.left_count, key: first[0], since: first[1] } : null;
}

/** The oldest left object has now been left on 3 nights: the admins are told. */
export const leftStuck = (o: OldestLeft | null, now: Date): o is OldestLeft =>
  o !== null && now.getTime() - Date.parse(o.since) >= STUCK_MS;

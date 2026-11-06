import { localDayStart } from '@ab/shared';

// GET /report-link/legacy/<path> (owner 2026-11-06): the old Vercel report redirector forwards
// every /r/<path> here. Two shapes are known; anything else is the «invalid link» page. Pure.

/** (a) our own v2 button suffix; (b) the old Apps Script's «AB-0004/<teacher>/<token>». */
export type LegacyPath =
  { kind: 'lesson'; lessonId: string } | { kind: 'pair'; code: string; teacherName: string };

const LESSON = /^teacher\/report\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const PAIR = /^(AB-\d{4,6})\/([^/]{1,120})\/[^/]+/i;
const MAX_PATH = 400;

/** decodeURIComponent that answers null on a malformed escape. */
function decoded(part: string): string | null {
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

function pairOf(match: RegExpExecArray): LegacyPath | null {
  const name = decoded(match[2] ?? '')
    ?.replace(/\s+/g, ' ')
    .trim();
  return name ? { kind: 'pair', code: (match[1] ?? '').toUpperCase(), teacherName: name } : null;
}

/** The path after /report-link/legacy/ (no leading slash, no query); null = not a known shape. */
export function parseLegacyPath(raw: string): LegacyPath | null {
  const path = raw.replace(/^\/+/, '').split('?')[0] ?? '';
  if (path.length > MAX_PATH) return null;
  const lesson = LESSON.exec(path.toLowerCase());
  if (lesson?.[1]) return { kind: 'lesson', lessonId: lesson[1] };
  const pair = PAIR.exec(path);
  return pair ? pairOf(pair) : null;
}

/** A lesson of the pair, as the resolver reads it. */
export interface PairLesson {
  id: string;
  starts_at: string;
}

const DAY_MS = 24 * 3_600_000;

/** The instant the teacher's local day after `now` starts (DST-safe: re-anchored on the day). */
export const endOfLocalDay = (now: Date, tz: string): Date =>
  localDayStart(new Date(localDayStart(now, tz).getTime() + 26 * 3_600_000), tz);

/** The window the resolver reads: from 24 h ago until the end of the teacher's day. */
export const pairWindow = (now: Date, tz: string): { from: Date; to: Date } => ({
  from: new Date(now.getTime() - DAY_MS),
  to: endOfLocalDay(now, tz),
});

/**
 * (b): the most recent lesson of the pair that started within the last 24 h, else the pair's next
 * lesson today (the teacher's day); null when neither. `lessons` are inside pairWindow.
 */
export function pickPairLesson(lessons: readonly PairLesson[], now: Date): PairLesson | null {
  const t = now.getTime();
  const at = (l: PairLesson) => Date.parse(l.starts_at);
  const started = lessons.filter((l) => at(l) <= t && at(l) > t - DAY_MS);
  const recent = [...started].sort((a, b) => at(b) - at(a))[0];
  const next = lessons.filter((l) => at(l) > t).sort((a, b) => at(a) - at(b))[0];
  return recent ?? next ?? null;
}

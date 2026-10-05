import { isOpenLesson, joinWindow, lessonStatusStyle, type LessonView, type Tone, type Glyph } from '@ab/shared';
import { t } from '@/lib/i18n';

/** The three groups of /admin/classrooms, in reading order. */
export const SESSION_GROUPS = ['now', 'upcoming', 'ended'] as const;
export type SessionGroup = (typeof SESSION_GROUPS)[number];

/** Which group a lesson is in at `now`: its room is open, still to open, or closed. */
export function groupOf(lesson: LessonView, now: Date): SessionGroup {
  const state = joinWindow(lesson, now).state;
  return state === 'open' ? 'now' : state === 'early' ? 'upcoming' : 'ended';
}

/** The day's lessons that still take place, by group, each group earliest first. */
export function groupSessions(lessons: LessonView[], now: Date): Record<SessionGroup, LessonView[]> {
  const out: Record<SessionGroup, LessonView[]> = { now: [], upcoming: [], ended: [] };
  const open = lessons.filter((l) => isOpenLesson(l.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const l of open) out[groupOf(l, now)].push(l);
  return out;
}

/** The card's chip: «بدأت» / «انتهت» by the room, otherwise the lesson's own status (مؤكدة, يحتاج تأكيد). */
export function sessionChip(lesson: LessonView, group: SessionGroup): { tone: Tone; glyph: Glyph; label: string } {
  if (group === 'now') return { tone: 'ok', glyph: 'fill', label: t.classroom.admin.live };
  if (group === 'ended') return { tone: 'neutral', glyph: 'struck', label: t.classroom.admin.ended };
  return { ...lessonStatusStyle[lesson.status], label: t.enums.lessonStatus[lesson.status] };
}

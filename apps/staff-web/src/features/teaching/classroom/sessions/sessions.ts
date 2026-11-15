import { DEFAULT_JOIN_WINDOW, isOpenLesson, joinWindow, type JoinWindowConfig, type LessonView } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import { lessonStatusText, type LessonStatusChip } from '@/lib/settings/lesson-status-text';

/** The three groups of /admin/classrooms, in reading order. */
export const SESSION_GROUPS = ['now', 'upcoming', 'ended'] as const;
export type SessionGroup = (typeof SESSION_GROUPS)[number];

/** Which group a lesson is in at `now`: its room is open, still to open, or closed. */
export function groupOf(lesson: LessonView, now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): SessionGroup {
  const state = joinWindow(lesson, now, win).state;
  return state === 'open' ? 'now' : state === 'early' ? 'upcoming' : 'ended';
}

/** The day's lessons that still take place, by group, each group earliest first. */
export function groupSessions(lessons: LessonView[], now: Date, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): Record<SessionGroup, LessonView[]> {
  const out: Record<SessionGroup, LessonView[]> = { now: [], upcoming: [], ended: [] };
  const open = lessons.filter((l) => isOpenLesson(l.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const l of open) out[groupOf(l, now, win)].push(l);
  return out;
}

/**
 * The card's chip: «بدأت» / «انتهت» by the room, otherwise the lesson's own status (مؤكدة, يحتاج تأكيد
 * while the academy requires a confirmation, `required`; else «مجدولة»).
 */
export function sessionChip(lesson: LessonView, group: SessionGroup, required: boolean): LessonStatusChip {
  if (group === 'now') return { tone: 'ok', glyph: 'fill', label: t.classroom.admin.live };
  if (group === 'ended') return { tone: 'neutral', glyph: 'struck', label: t.classroom.admin.ended };
  return lessonStatusText(required).chip(lesson.status);
}

import {
  isOpenLesson,
  joinWindow,
  meetingModeOf,
  usesPlatform,
  type JoinWindowConfig,
  type PortalLesson,
  type PortalWayIn,
} from '@ab/shared';
import type { PortalLessonRow } from './portal-lessons.repo';

interface WayContext {
  /** settings.meeting_link_auto: the academy default for a teacher whose meeting_mode is null. */
  academyAuto: boolean;
  /** students.meeting_link_override of the caller's student. */
  override: string | null;
  /** LIVEKIT_* configured: without it our classroom cannot open. */
  classroom: boolean;
  win: JoinWindowConfig;
  now: Date;
}

/**
 * The external link of a lesson: the student's own override on a one-student lesson (the link the
 * booking copies first for that student), else the lesson's own link. Trimmed; blank = none.
 */
export function externalLink(row: PortalLessonRow, override: string | null): string | null {
  const own = row.lesson_students.length === 1 ? override?.trim() : '';
  return own || row.meeting_link?.trim() || null;
}

/**
 * The reminders' rule (reminders.links.ts roomFor): our room for a platform lesson, or for a lesson with
 * no link of its own, once LiveKit is configured; a platform lesson never falls back to a fixed link.
 */
export function wayIn(row: PortalLessonRow, ctx: Pick<WayContext, 'academyAuto' | 'override' | 'classroom'>): PortalWayIn {
  const platform = usesPlatform(meetingModeOf(row.teacher?.meeting_mode), ctx.academyAuto);
  const link = externalLink(row, ctx.override);
  if (ctx.classroom && (platform || !link)) return 'classroom';
  return !platform && link ? 'external' : 'none';
}

/** Whitelist: time, status, the teacher's display names, the way in. The URL only while the room is open. */
export function toPortalLesson(row: PortalLessonRow, ctx: WayContext): PortalLesson {
  const window = joinWindow(row, ctx.now, ctx.win);
  const way = isOpenLesson(row.status) ? wayIn(row, ctx) : 'none';
  const open = window.state === 'open' && way === 'external';
  return {
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    teacher: { display_name_ar: row.teacher?.display_name_ar ?? '', display_name_en: row.teacher?.display_name_en ?? null },
    way_in: way,
    meeting_url: open ? externalLink(row, ctx.override) : null,
    window,
  };
}

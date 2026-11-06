import { meetingModeOf, usesPlatform, type LessonStatus } from '@ab/shared';
import { z } from 'zod';
import { JOIN_GRACE_MS } from './join-token';

// Where GET /join/:token sends the teacher (owner 2026-11-06). Never an open redirect: the only
// targets are the lesson's own stored link (written by staff, http(s) without credentials) or our
// own classroom page on the web origin. Pure.

/** The lesson as the join link reads it at click time. */
export interface JoinLesson {
  id: string;
  teacher_id: string;
  status: LessonStatus;
  ends_at: string;
  meeting_link: string | null;
  /** teachers.meeting_mode (migration 490): null = the academy default. */
  meeting_mode: string | null;
}

interface JoinContext {
  /** The token's teacher: the lesson must still be theirs. */
  teacherId: string;
  /** settings.meeting_link_auto: the default of a teacher whose meeting_mode is null. */
  auto: boolean;
  /** The web app's origin (the first of WEB_ORIGIN): the host of /classroom/<id>. */
  origin: string;
  now: Date;
}

/** A lesson that was cancelled or moved has no room to join. */
const GONE: ReadonlySet<LessonStatus> = new Set<LessonStatus>([
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'rescheduled',
]);

const webUrl = z.url({ protocol: /^https?$/ });

/** The stored link when it is a plain http(s) URL (no user:password); null otherwise. */
export function storedLink(link: string | null): string | null {
  const parsed = webUrl.safeParse((link ?? '').trim());
  if (!parsed.success) return null;
  const u = new URL(parsed.data);
  return u.username === '' && u.password === '' ? u.toString() : null;
}

const joinable = (lesson: JoinLesson, ctx: JoinContext): boolean =>
  lesson.teacher_id === ctx.teacherId &&
  !GONE.has(lesson.status) &&
  Date.parse(lesson.ends_at) + JOIN_GRACE_MS > ctx.now.getTime() &&
  ctx.origin !== '';

/** Where a lesson is held: the academy default and our web origin. */
interface RoomContext {
  auto: boolean;
  origin: string;
}

/**
 * The lesson's own room: our classroom when its teacher's mode (else the academy default) holds it
 * on the platform, else its stored link, else our classroom. Also teacher_lesson_v3's {{6}}.
 */
export function lessonRoom(
  lesson: Pick<JoinLesson, 'id' | 'meeting_link' | 'meeting_mode'>,
  ctx: RoomContext,
): string {
  const classroom = `${ctx.origin}/classroom/${lesson.id}`;
  const platform = usesPlatform(meetingModeOf(lesson.meeting_mode), ctx.auto);
  return platform ? classroom : (storedLink(lesson.meeting_link) ?? classroom);
}

/**
 * GET /join/:token's answer: the lesson's own room (lessonRoom). null: no lesson, another
 * teacher's, cancelled or moved, long over, or no web origin configured.
 */
export function joinTarget(lesson: JoinLesson | null, ctx: JoinContext): string | null {
  return lesson && joinable(lesson, ctx) ? lessonRoom(lesson, ctx) : null;
}

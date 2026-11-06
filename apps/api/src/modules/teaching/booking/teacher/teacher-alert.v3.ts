import { Logger } from '@nestjs/common';
import { lessonRoom, type TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import type { AlertV3 } from './teacher-alert.plan';
import type { AlertLessonRow } from './teacher-alert.repo';

// teacher_lesson_v3's parts for the new-student alert (owner 2026-11-06): each teacher's first
// lesson of the booking with its room ({{6}}) and its signed join and report tokens (the buttons).

const log = new Logger('TeacherAlertV3');

interface AlertV3Deps {
  links: TeacherLessonLinks;
  /** settings.meeting_link_auto. */
  auto: boolean;
  /** The web origin (first of WEB_ORIGIN): '' = no v3 at all. */
  origin: string;
}

/** Each teacher's earliest lesson (the one the alert names). */
function firstPerTeacher(lessons: readonly AlertLessonRow[]): AlertLessonRow[] {
  const sorted = [...lessons].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const seen = new Set<string>();
  return sorted.filter((l) => {
    const id = l.teacher?.id ?? '';
    const fresh = id !== '' && !seen.has(id);
    seen.add(id);
    return fresh;
  });
}

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The lesson's room ({{6}}): its teacher's mode, else the academy default (lessonRoom). */
const roomOf = (lesson: AlertLessonRow, deps: AlertV3Deps): string =>
  lessonRoom(
    {
      id: lesson.id,
      meeting_link: lesson.meeting_link ?? null,
      meeting_mode: lesson.teacher?.meeting_mode ?? null,
    },
    deps,
  );

async function signed(
  lesson: AlertLessonRow & { teacher: { id: string }; ends_at: string },
  deps: AlertV3Deps,
) {
  try {
    const { id, teacher, ends_at } = lesson;
    return await deps.links.forLesson({ id, teacherId: teacher.id, ends_at });
  } catch (e) {
    log.warn(`teacher_lesson_v3 links failed for lesson ${lesson.id}: ${why(e)}`);
    return null;
  }
}

/** A lesson with a teacher and an end: what the links are signed for. */
const signable = (
  l: AlertLessonRow,
): l is AlertLessonRow & { teacher: { id: string }; ends_at: string } =>
  Boolean(l.teacher && l.ends_at);

async function one(lesson: AlertLessonRow, deps: AlertV3Deps): Promise<AlertV3 | null> {
  const links = signable(lesson) ? await signed(lesson, deps) : null;
  return links ? { links, room: roomOf(lesson, deps) } : null;
}

/** Per lesson id; a lesson without its links is absent (the alert then keeps its own template). */
export async function alertV3(
  lessons: readonly AlertLessonRow[],
  deps: AlertV3Deps,
): Promise<Map<string, AlertV3>> {
  if (!deps.origin) return new Map();
  const pairs = await Promise.all(
    firstPerTeacher(lessons).map(async (l) => [l.id, await one(l, deps)] as const),
  );
  return new Map(pairs.flatMap(([id, v3]) => (v3 ? [[id, v3] as const] : [])));
}

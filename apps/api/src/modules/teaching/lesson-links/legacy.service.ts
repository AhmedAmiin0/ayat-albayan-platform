import { Injectable } from '@nestjs/common';
import { TeacherReportLinks } from '@/modules/reporting/reports';
import { parseLegacyPath, pairWindow, pickPairLesson, type LegacyPath } from './legacy-path';
import { LessonLinksRepo, type LinkLesson } from './lesson-links.repo';

type Pair = Extract<LegacyPath, { kind: 'pair' }>;

/** Cancelled or moved: no report to write. */
const GONE: ReadonlySet<string> = new Set([
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'rescheduled',
]);

/**
 * GET /report-link/legacy/<path> (owner 2026-11-06): the old Vercel report redirector's links,
 * answered with the no-login report page of exactly ONE lesson, issued for that lesson's current
 * teacher: (a) teacher/report/<lessonId>; (b) <studentCode>/<teacherName>/… → the pair's most
 * recent lesson started within 24 h, else its next one today. null → the «invalid link» page.
 */
@Injectable()
export class LegacyReportLinks {
  constructor(
    private readonly repo: LessonLinksRepo,
    private readonly reports: TeacherReportLinks,
  ) {}

  async target(path: string, now: Date): Promise<string | null> {
    const lesson = await this.find(path, now);
    const open = lesson && !GONE.has(lesson.status) ? lesson : null;
    return open ? ((await this.issue(open))?.url ?? null) : null;
  }

  /** The one lesson the path names now; null when it names none. */
  private async find(path: string, now: Date): Promise<LinkLesson | null> {
    const parsed = parseLegacyPath(path);
    const lessonId = parsed ? await this.lessonOf(parsed, now) : null;
    return lessonId ? this.repo.lesson(lessonId) : null;
  }

  private issue(lesson: LinkLesson) {
    return this.reports.forLesson({
      id: lesson.id,
      teacherId: lesson.teacher_id,
      ends_at: lesson.ends_at,
    });
  }

  private async lessonOf(parsed: LegacyPath, now: Date): Promise<string | null> {
    return parsed.kind === 'lesson' ? parsed.lessonId : this.pairLesson(parsed, now);
  }

  /** One student, exactly one teacher of that name, and their lesson by pickPairLesson. */
  private async pairLesson(pair: Pair, now: Date): Promise<string | null> {
    const [studentId, teachers] = await Promise.all([
      this.repo.studentByCode(pair.code),
      this.repo.teachersNamed(pair.teacherName),
    ]);
    const [teacher] = teachers;
    if (!studentId || !teacher || teachers.length !== 1) return null;
    const window = pairWindow(now, teacher.tz);
    const lessons = await this.repo.pairLessons({ studentId, teacherId: teacher.id, ...window });
    return pickPairLesson(lessons, now)?.id ?? null;
  }
}

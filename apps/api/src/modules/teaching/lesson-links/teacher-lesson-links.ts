import { Inject, Injectable } from '@nestjs/common';
import {
  TEACHER_LINK_CONFIG,
  TeacherReportLinks,
  type TeacherLinkConfig,
  type TeacherReportLink,
} from '@/modules/reporting/reports';
import { joinExpiry, signTeacherJoin } from './join-token';

/** One lesson's two teacher links (teacher_lesson_v3's button suffixes, owner 2026-11-06). */
export interface TeacherLessonTokens {
  /** The signed-in report page and its button suffix, the lesson id («تقرير الحلقة»). */
  report: TeacherReportLink;
  /** The signed /join token («ادخل الحلقة»): GET /join/:token, until the end + 2 h. */
  join: string;
}

interface LinkLesson {
  id: string;
  teacherId: string;
  ends_at: string;
}

/**
 * The teacher's two links of one lesson: the /join token, signed with FEEDBACK_TOKEN_SECRET and
 * stored nowhere, and the signed-in report page (owner 2026-11-14, no report token any more). null
 * when the secret or the web origin is not configured: the producers then keep their fallbacks.
 */
@Injectable()
export class TeacherLessonLinks {
  constructor(
    private readonly reports: TeacherReportLinks,
    @Inject(TEACHER_LINK_CONFIG) private readonly config: TeacherLinkConfig,
  ) {}

  async forLesson(lesson: LinkLesson): Promise<TeacherLessonTokens | null> {
    const report = this.reports.forLesson(lesson);
    const { secret } = this.config;
    if (!report || !secret) return null;
    const exp = joinExpiry(lesson.ends_at);
    const join = signTeacherJoin(secret, { lessonId: lesson.id, teacherId: lesson.teacherId, exp });
    return { report, join };
  }
}

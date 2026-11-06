import { Inject, Injectable } from '@nestjs/common';
import { firstOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from './teacher-link.config';
import { signTeacherLink, teacherLinkExpiry } from './teacher-link.token';

interface TeacherLinkLesson {
  id: string;
  teacherId: string;
  ends_at: string;
}

/** The teacher's report link of one lesson: the signed token and the page it opens. */
export interface TeacherReportLink {
  /** The button suffix of teacher_lesson_v3 («تقرير الحلقة» …/teacher-report/{{1}}). */
  token: string;
  /** The web page /teacher-report/<token> (public, no sign-in). */
  url: string;
  /** Unix seconds: the lesson's end + settings.report_teacher_edit_hours. */
  exp: number;
}

/** The web page the link opens: /teacher-report/<token> (public, no sign-in). */
const teacherLinkPage = (origin: string, token: string): string =>
  `${origin}/teacher-report/${token}`;

/**
 * The teacher's report link for one lesson (docs/19 «Teacher report link»): a signed token valid
 * until the lesson's end + settings.report_teacher_edit_hours, sent as it is (owner 2026-11-06:
 * no short link any more). null when the secret or the web origin is not configured: the reminder
 * then keeps the signed-in report page.
 */
@Injectable()
export class TeacherReportLinks {
  constructor(
    private readonly settings: ReportsSettings,
    @Inject(TEACHER_LINK_CONFIG) private readonly config: TeacherLinkConfig,
  ) {}

  async forLesson(lesson: TeacherLinkLesson): Promise<TeacherReportLink | null> {
    const origin = firstOrigin(loadEnv().WEB_ORIGIN);
    const { secret } = this.config;
    if (!secret || !origin) return null;
    const { report_teacher_edit_hours: hours } = await this.settings.read();
    const exp = teacherLinkExpiry(lesson.ends_at, hours);
    const token = signTeacherLink(secret, {
      lessonId: lesson.id,
      teacherId: lesson.teacherId,
      exp,
    });
    return { token, url: teacherLinkPage(origin, token), exp };
  }
}

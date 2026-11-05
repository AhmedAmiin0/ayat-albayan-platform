import { Inject, Injectable } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { ShortLinks } from '@/modules/platform/short-links';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { firstWebOrigin } from '@/modules/teaching/classroom';
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from './teacher-link.config';
import { signTeacherLink, teacherLinkExpiry } from './teacher-link.token';

interface TeacherLinkLesson {
  id: string;
  teacherId: string;
  ends_at: string;
}

/** The web page the link opens: /teacher-report/<token> (public, no sign-in). */
const teacherLinkPage = (origin: string, token: string): string =>
  `${origin}/teacher-report/${token}`;

/**
 * The teacher's report link for one lesson as a short link (docs/19 «Teacher report link»): a
 * signed
 * token valid until the lesson's end + settings.report_teacher_edit_hours, behind /r/<code> (one
 * code
 * per lesson; a new teacher or time refreshes its target). null when the secret or the web origin
 * is
 * not configured: the reminder then keeps the signed-in report page.
 */
@Injectable()
export class TeacherReportLinks {
  constructor(
    private readonly links: ShortLinks,
    private readonly settings: ReportsSettings,
    @Inject(TEACHER_LINK_CONFIG) private readonly config: TeacherLinkConfig,
  ) {}

  async forLesson(lesson: TeacherLinkLesson): Promise<string | null> {
    const origin = firstWebOrigin(loadEnv().WEB_ORIGIN);
    const { secret } = this.config;
    if (!secret || !origin) return null;
    const { report_teacher_edit_hours: hours } = await this.settings.read();
    const exp = teacherLinkExpiry(lesson.ends_at, hours);
    const token = signTeacherLink(secret, {
      lessonId: lesson.id,
      teacherId: lesson.teacherId,
      exp,
    });
    const url = teacherLinkPage(origin, token);
    return this.links.forTarget({
      kind: 'teacher_report',
      // Per teacher: a substitute's link is a new code, never the old teacher's code re-pointed.
      subject: `${lesson.id}:${lesson.teacherId}`,
      url,
      expiresAt: new Date(exp * 1000),
    });
  }

  /** Our own classroom page, shortened (a Meet or a teacher's fixed link is never shortened). */
  classroom(input: { lessonId: string; url: string; expiresAt: Date }): Promise<string> {
    return this.links.forTarget({
      kind: 'classroom',
      subject: input.lessonId,
      url: input.url,
      expiresAt: input.expiresAt,
    });
  }
}

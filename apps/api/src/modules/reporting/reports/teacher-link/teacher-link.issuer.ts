import { Injectable } from '@nestjs/common';
import { firstOrigin } from '@/common/http/public-origin';
import { loadEnv } from '@/config/env/env';

/** The teacher's report link of one lesson: the signed-in portal page and its button suffix. */
export interface TeacherReportLink {
  /**
   * The button suffix of teacher_lesson_v3 («تقرير الحلقة» …/teacher-report/{{1}}): the lesson id.
   * The public route /teacher-report/<lesson id> redirects to the portal page.
   */
  suffix: string;
  /** The portal page /teacher/report/<lesson id> (signed in; the login returns to it). */
  url: string;
}

/** The page the link opens: /teacher/report/<lessonId> (the signed-in teacher portal). */
const portalPage = (origin: string, lessonId: string): string =>
  `${origin}/teacher/report/${lessonId}`;

/**
 * The teacher's report link for one lesson (docs/19 «Teacher report link»): the signed-in portal
 * page (owner 2026-11-14: «send the portal url that is authenticated»). No token: the no-login
 * tokens already sent stay valid until the lesson's end + report_teacher_edit_hours. null when the
 * web origin is not configured.
 */
@Injectable()
export class TeacherReportLinks {
  forLesson(lesson: { id: string }): TeacherReportLink | null {
    const origin = firstOrigin(loadEnv().WEB_ORIGIN);
    return origin ? { suffix: lesson.id, url: portalPage(origin, lesson.id) } : null;
  }
}

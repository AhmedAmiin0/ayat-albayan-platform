import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { LinkCaller } from '@/modules/reporting/reports/report-access';
import { ReportsQueries } from '@/modules/reporting/reports/reports.queries';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from './teacher-link.config';
import { TeacherLinkRepo } from './teacher-link.repo';
import {
  teacherLinkExpiry,
  verifyTeacherLink,
  type TeacherLinkPayload,
} from './teacher-link.token';

/**
 * Unknown, tampered, unconfigured, or no longer this lesson's teacher: one answer, nothing learnt.
 */
const invalid = () => notFound('link_not_found');
const expired = () =>
  new HttpException({ code: 'link_expired', message: 'link_expired' }, HttpStatus.GONE);

export interface LinkScope {
  lessonId: string;
  caller: LinkCaller;
}

/**
 * The teacher report link's checks (docs/19 «Teacher report link»), on every call: the signature,
 * the
 * signed expiry, the lesson still taught by the token's teacher, and its window as it is now: from
 * the
 * lesson's start (409 link_not_open) until its end + settings.report_teacher_edit_hours (410).
 */
@Injectable()
export class TeacherLinkAccess {
  constructor(
    private readonly queries: ReportsQueries,
    private readonly settings: ReportsSettings,
    private readonly teachers: TeacherLinkRepo,
  ) {}

  @Inject(TEACHER_LINK_CONFIG) private readonly config!: TeacherLinkConfig;

  async open(token: string, now: Date): Promise<LinkScope> {
    const { lessonId, teacherId } = this.verified(token, now);
    const lesson = await this.queries.lesson(lessonId);
    if (lesson?.teacher_id !== teacherId) throw invalid();
    if (Date.parse(lesson.starts_at) > now.getTime()) throw conflict('link_not_open');
    const { report_teacher_edit_hours: hours } = await this.settings.read();
    if (teacherLinkExpiry(lesson.ends_at, hours) * 1000 <= now.getTime()) throw expired();
    const profileId = await this.teachers.profileOf(teacherId);
    return { lessonId, caller: new LinkCaller(teacherId, profileId) };
  }

  /** The report must be one of this link's lesson: any other id is 404, as if it did not exist. */
  async report(input: { token: string; reportId: string }, now: Date): Promise<LinkScope> {
    const scope = await this.open(input.token, now);
    const row = await this.queries.get(input.reportId);
    if (row?.lesson_id !== scope.lessonId) throw notFound('report_not_found');
    return scope;
  }

  private verified(token: string, now: Date): TeacherLinkPayload {
    if (!this.config.secret) throw invalid();
    const check = verifyTeacherLink(this.config.secret, token, now);
    if (check.ok) return check.payload;
    throw check.reason === 'expired' ? expired() : invalid();
  }
}

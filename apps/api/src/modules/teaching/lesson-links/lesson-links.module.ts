import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { ReportsModule } from '@/modules/reporting/reports';
import { TeacherJoin } from './join.service';
import { LegacyReportLinks } from './legacy.service';
import { LegacyReportLinkController, TeacherJoinController } from './lesson-links.controller';
import { LessonLinksLimit } from './lesson-links.limit';
import { LessonLinksRepo } from './lesson-links.repo';
import { LessonLinksSettings } from './lesson-links.settings';
import { TeacherLessonLinks } from './teacher-lesson-links';

/**
 * The teacher's links of one lesson (owner 2026-11-06, teacher_lesson_v3): the signed join link
 * GET /join/:token, the old report redirector's bridge GET /report-link/legacy/*, and the issuer
 * of both button tokens for the reminders and the new-student alert. No short links.
 */
@Module({
  imports: [ReportsModule],
  controllers: [TeacherJoinController, LegacyReportLinkController],
  providers: [
    RateLimitRepo,
    LessonLinksRepo,
    LessonLinksSettings,
    LessonLinksLimit,
    TeacherJoin,
    LegacyReportLinks,
    TeacherLessonLinks,
  ],
  exports: [TeacherLessonLinks],
})
export class LessonLinksModule {}

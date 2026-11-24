import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { TeachersModule } from '@/modules/people/teachers';
import { ReportAccess } from './report-access';
import { ReportGate } from './report-gate';
import { ReportLessonQueries } from './report-lesson.queries';
import { ReportsQueries } from './reports.queries';
import { ReportsService } from './reports.service';
import { ReportsSettings } from './reports.settings';
import { TEACHER_LINK_CONFIG, type TeacherLinkConfig } from './teacher-link.config';
import { TeacherReportLinks } from './teacher-link.issuer';

/** The teacher link's secret: the existing public-link secret (FEEDBACK_TOKEN_SECRET). */
const linkConfig = (): TeacherLinkConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null });

/**
 * What two or more report folders inject: who may open a report (ReportAccess, ReportGate), the
 * report rows and the lesson's form (ReportsService), the settings slice, and the teacher link's
 * secret and issuer that lesson-links reads too.
 */
const SHARED = [
  ...[ReportAccess, ReportGate, ReportLessonQueries, ReportsQueries, ReportsService],
  ...[ReportsSettings, TeacherReportLinks],
];

@Module({
  imports: [TeachersModule],
  providers: [...SHARED, { provide: TEACHER_LINK_CONFIG, useFactory: linkConfig }],
  exports: [...SHARED, TEACHER_LINK_CONFIG],
})
export class ReportsSharedModule {}

import type { PortalFileUrl, PortalHome, PortalLessons, PortalPackageView, PortalReports, RoomJoinResult } from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageService } from './package/portal-package.service';
import { PortalReportsService } from './reports/portal-reports.service';

const UUID = new ParseUUIDPipe();

/**
 * The family portal (docs/31): a guardian login (their students) or a student login (itself), through
 * the self.portal scope key that only those base roles carry. Every :id is resolved by PortalScopes
 * first (404 student_not_found for anyone else's). Responses are whitelists: no money, notes, reasons,
 * teacher contacts or other families.
 */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal')
export class PortalController {
  constructor(
    private readonly home: PortalHomeService,
    private readonly lessons: PortalLessonsService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PortalHome> {
    return this.home.home(user);
  }

  @Get('students/:id/lessons')
  upcoming(@Param('id', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<PortalLessons> {
    return this.lessons.upcoming({ user, studentId });
  }

  /** «ادخل الحلقة» of a classroom lesson: the room join itself; 404, 409 not_classroom_lesson, 403, 410, 429, 503. */
  @Post('students/:id/lessons/:lessonId/join')
  @HttpCode(200)
  join(@Param('id', UUID) studentId: string, @Param('lessonId', UUID) lessonId: string, @CurrentUser() user: AuthUser): Promise<RoomJoinResult> {
    return this.lessons.join({ user, studentId, lessonId });
  }
}

/** «تقارير الحلقات» and «الباقة»: same scope key and scoping as PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal')
export class PortalRecordsController {
  constructor(
    private readonly reports: PortalReportsService,
    private readonly packages: PortalPackageService,
  ) {}

  @Get('students/:id/reports')
  reportList(@Param('id', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<PortalReports> {
    return this.reports.list({ user, studentId });
  }

  @Post('students/:id/reports/:reportId/url')
  @HttpCode(200)
  reportUrl(@Param('id', UUID) studentId: string, @Param('reportId', UUID) id: string, @CurrentUser() user: AuthUser): Promise<PortalFileUrl> {
    return this.reports.reportUrl({ user, studentId, id });
  }

  @Post('students/:id/recordings/:recordingId/url')
  @HttpCode(200)
  recordingUrl(@Param('id', UUID) studentId: string, @Param('recordingId', UUID) id: string, @CurrentUser() user: AuthUser): Promise<PortalFileUrl> {
    return this.reports.recordingUrl({ user, studentId, id });
  }

  @Get('students/:id/package')
  currentPackage(@Param('id', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<PortalPackageView> {
    return this.packages.current({ user, studentId });
  }
}

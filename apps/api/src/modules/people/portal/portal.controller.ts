import {
  portalHistoryQuerySchema,
  type PortalFileUrl,
  type PortalHistory,
  type PortalHistoryQuery,
  type PortalHome,
  type PortalLessons,
  type PortalPackageView,
  type PortalReports,
  type PortalRoomLink,
  type RoomJoinResult,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { PortalHistoryService } from './history/portal-history.service';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageService } from './package/portal-package.service';
import { PortalReportsService } from './reports/portal-reports.service';

const UUID = new ParseUUIDPipe();

/**
 * The family portal (docs/31): a guardian login (their students) or a student login (itself),
 * through the self.portal scope key that only those base roles carry. Every :id is resolved by
 * PortalScopes first (404 student_not_found for anyone else's). Responses are whitelists: no notes,
 * internal reasons, teacher contacts or other families; money only on the package of a guardian or
 * an adult student (docs/50).
 */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal')
export class PortalController {
  constructor(
    @Inject(PortalHomeService) private readonly home: PortalHomeService,
    @Inject(PortalLessonsService) private readonly lessons: PortalLessonsService,
    @Inject(PortalHistoryService) private readonly past: PortalHistoryService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PortalHome> {
    return this.home.home(user);
  }

  @Get('students/:id/lessons')
  upcoming(@Param('id', UUID) studentId: string, @CurrentUser() user: AuthUser): Promise<PortalLessons> {
    return this.lessons.upcoming({ user, studentId });
  }

  /** docs/50 §5: a keyset page of past lessons, newest first. */
  @Get('students/:id/history')
  history(
    @ZodParam('id', z.uuid()) studentId: string,
    @ZodQuery(portalHistoryQuerySchema) query: PortalHistoryQuery,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalHistory> {
    return this.past.history({ user, studentId, query });
  }

  @Post('students/:id/lessons/:lessonId/join')
  @HttpCode(200)
  join(@Param('id', UUID) studentId: string, @Param('lessonId', UUID) lessonId: string, @CurrentUser() user: AuthUser): Promise<RoomJoinResult> {
    return this.lessons.join({ user, studentId, lessonId });
  }

  /** A signed link with no second sign-in, until the room closes. */
  @Post('students/:id/lessons/:lessonId/room-link')
  @HttpCode(200)
  roomLink(
    @ZodParam('id', z.uuid()) studentId: string,
    @ZodParam('lessonId', z.uuid()) lessonId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalRoomLink> {
    return this.lessons.roomLink({ user, studentId, lessonId });
  }
}

/** Same scope key and scoping as PortalController. */
@ApiTags('portal')
@ApiBearerAuth()
@Permissions('self.portal')
@Controller('portal')
export class PortalRecordsController {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalPackageService) private readonly packages: PortalPackageService,
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

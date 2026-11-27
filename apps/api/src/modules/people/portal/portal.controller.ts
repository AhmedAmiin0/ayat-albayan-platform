import {
  portalRoutes as routes,
  type PortalFileUrl,
  type PortalHistory,
  type PortalHome,
  type PortalLessons,
  type PortalPackageView,
  type PortalReports,
  type PortalRoomLink,
} from '@ab/shared';
import type { RoomJoinResult } from '@ab/schedule';
import { Controller, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { PortalHistoryService } from './history/portal-history.service';
import { PortalHomeService } from './home/portal-home.service';
import { PortalLessonsService } from './lessons/portal-lessons.service';
import { PortalPackageService } from './package/portal-package.service';
import { PortalReportsService } from './reports/portal-reports.service';

const UUID = new ParseUUIDPipe();

type Input<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/**
 * The family portal (docs/31): a guardian login (their students) or a student login (itself),
 * through the self.portal scope key that only those base roles carry. Every :id is resolved by
 * PortalScopes first (404 student_not_found for anyone else's). Responses are whitelists: no notes,
 * internal reasons, teacher contacts or other families; money only on the package of a guardian or
 * an adult student (docs/50).
 */
@ApiBearerAuth()
@Controller()
export class PortalController {
  constructor(
    @Inject(PortalHomeService) private readonly home: PortalHomeService,
    @Inject(PortalLessonsService) private readonly lessons: PortalLessonsService,
    @Inject(PortalHistoryService) private readonly past: PortalHistoryService,
  ) {}

  @Route(routes.home)
  me(@CurrentUser() user: AuthUser): Promise<PortalHome> {
    return this.home.home(user);
  }

  @Route(routes.lessons)
  upcoming(
    @RouteInput() { params }: Input<'lessons'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalLessons> {
    return this.lessons.upcoming({ user, studentId: params.id });
  }

  @Route(routes.history)
  history(
    @RouteInput() { params, query }: Input<'history'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalHistory> {
    return this.past.history({ user, studentId: params.id, query });
  }

  /** The classroom join answer has no shared schema yet, so this handler keeps its decorators. */
  @Post('portal/students/:id/lessons/:lessonId/join')
  @ApiTags('portal')
  @Permissions('self.portal')
  @HttpCode(200)
  join(
    @Param('id', UUID) studentId: string,
    @Param('lessonId', UUID) lessonId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RoomJoinResult> {
    return this.lessons.join({ user, studentId, lessonId });
  }

  @Route(routes.roomLink)
  @HttpCode(200)
  roomLink(
    @RouteInput() { params }: Input<'roomLink'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalRoomLink> {
    return this.lessons.roomLink({ user, studentId: params.id, lessonId: params.lessonId });
  }
}

/** Same scope key and scoping as PortalController. */
@ApiBearerAuth()
@Controller()
export class PortalRecordsController {
  constructor(
    @Inject(PortalReportsService) private readonly reports: PortalReportsService,
    @Inject(PortalPackageService) private readonly packages: PortalPackageService,
  ) {}

  @Route(routes.reports)
  reportList(
    @RouteInput() { params }: Input<'reports'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalReports> {
    return this.reports.list({ user, studentId: params.id });
  }

  @Route(routes.reportUrl)
  @HttpCode(200)
  reportUrl(
    @RouteInput() { params }: Input<'reportUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalFileUrl> {
    return this.reports.reportUrl({ user, studentId: params.id, id: params.reportId });
  }

  @Route(routes.recordingUrl)
  @HttpCode(200)
  recordingUrl(
    @RouteInput() { params }: Input<'recordingUrl'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalFileUrl> {
    return this.reports.recordingUrl({ user, studentId: params.id, id: params.recordingId });
  }

  @Route(routes.package)
  currentPackage(
    @RouteInput() { params }: Input<'package'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PortalPackageView> {
    return this.packages.current({ user, studentId: params.id });
  }
}

import { lessonRoomRoutes as routes, type RoomJoinResult } from '@ab/schedule';
import { Body, Controller, HttpCode, Ip, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, Public } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { StudentLinkAdminService } from './student-link.admin.service';
import { StudentLinkService } from './student-link.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** The student's own door (no login): the token in the path is the whole credential. */
@Public()
@Controller()
export class StudentLinkPublicController {
  constructor(private readonly links: StudentLinkService) {}

  /** The current or next lesson and its window. */
  @Route(routes.studentLink)
  view(@RouteInput() { params }: In<'studentLink'>, @Ip() ip: string) {
    return this.links.view({ token: params.token, ip });
  }

  /** The lesson whose room is open now; the service reads the name after the rate limit. */
  @Route(routes.studentJoin)
  @HttpCode(200)
  join(
    @Param('token') token: string,
    @Body() body: unknown,
    @Ip() ip: string,
  ): Promise<RoomJoinResult> {
    return this.links.join({ token, ip, body });
  }
}

/** Admin: create or rotate the student's long-lived link. */
@ApiBearerAuth()
@Controller()
export class StudentLinkAdminController {
  constructor(private readonly links: StudentLinkAdminService) {}

  @Route(routes.issueStudentLink)
  @HttpCode(200)
  issue(@RouteInput() { params }: In<'issueStudentLink'>, @CurrentUser() user: AuthUser) {
    return this.links.issue({ studentId: params.id, actorId: user.id });
  }
}

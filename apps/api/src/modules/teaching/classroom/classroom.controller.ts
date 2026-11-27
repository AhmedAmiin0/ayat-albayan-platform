import { lessonJoinRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { JoinLinkCopyService } from './join/join-link.copy.service';
import { JoinLinkService } from './join/join-link.service';
import { JoinLinkStaffService } from './join/join-link.staff.service';
import { RoomJoinService } from './join/room-join.service';

/** Online classroom, staff side. The service decides who may enter (admin, the lesson's teacher, an assigned assistant). */
@ApiBearerAuth()
@Controller()
export class ClassroomController {
  constructor(
    private readonly rooms: RoomJoinService,
    private readonly links: JoinLinkService,
    private readonly copies: JoinLinkCopyService,
  ) {}

  /** 403 not yours / join_not_open_yet, 410 join_closed, 503 classroom_not_configured. */
  @Route(routes.join)
  @HttpCode(200)
  join(@RouteInput() { params }: RouteInputOf<typeof routes.join>, @CurrentUser() user: AuthUser) {
    return this.rooms.join({ user, lessonId: params.id });
  }

  /** 409 template_not_approved, 404 student_not_in_lesson. */
  @Route(routes.sendLink)
  @HttpCode(200)
  sendLink(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.sendLink>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.links.send({ lessonId: params.id, body, actorId: user.id });
  }

  /** Returns the guest URL, for the admin or the lesson's own teacher. */
  @Route(routes.linkUrl)
  @HttpCode(200)
  linkUrl(
    @RouteInput() { params }: RouteInputOf<typeof routes.linkUrl>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.copies.url({ lessonId: params.id, user });
  }
}

/** A family link opened by a signed-in staff member: where their own staff room is. */
@ApiBearerAuth()
@Controller()
export class JoinLinkStaffController {
  constructor(private readonly links: JoinLinkStaffService) {}

  /** 404 link_invalid / lesson_not_found, 403 not their lesson. */
  @Route(routes.staffLessonOf)
  lessonOf(
    @RouteInput() { params }: RouteInputOf<typeof routes.staffLessonOf>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.links.lessonOf({ user, token: params.token });
  }
}

import { joinLinkRequestSchema, type JoinLinkResult, type JoinLinkUrl, type RoomJoinResult } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../../common/http/http';
import { JoinLinkCopyService } from './join-link.copy.service';
import { JoinLinkService } from './join-link.service';
import { JoinLinkStaffService } from './join-link.staff.service';
import { RoomJoinService } from './room-join.service';

/** Online classroom, staff side. The service decides who may enter (admin, the lesson's teacher, an assigned assistant). */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.join')
@Controller('lessons/:id')
export class ClassroomController {
  constructor(
    private readonly rooms: RoomJoinService,
    private readonly links: JoinLinkService,
    private readonly copies: JoinLinkCopyService,
  ) {}

  /** 403 not yours / join_not_open_yet, 410 join_closed, 503 classroom_not_configured. */
  @Post('room/join')
  @HttpCode(200)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RoomJoinResult> {
    return this.rooms.join({ user, lessonId: id });
  }

  /** «ابعت لينك الحلقة»: 409 template_not_approved, 404 student_not_in_lesson. */
  @Post('join-link')
  @HttpCode(200)
  @Permissions('classroom.links')
  sendLink(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<JoinLinkResult> {
    return this.links.send({ lessonId: id, body: parseOrThrow(joinLinkRequestSchema, body), actorId: user.id });
  }

  /** «انسخ لينك الطالب»: the guest URL, for the admin or the lesson's own teacher. */
  @Post('join-link/url')
  @HttpCode(200)
  @Permissions('classroom.host')
  linkUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<JoinLinkUrl> {
    return this.copies.url({ lessonId: id, user });
  }
}

/** A family link opened by a signed-in staff member: where their own staff room is. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.join')
@Controller('join-links')
export class JoinLinkStaffController {
  constructor(private readonly links: JoinLinkStaffService) {}

  /** {lessonId}; 404 link_invalid / lesson_not_found, 403 not their lesson. */
  @Get(':token/lesson')
  lessonOf(@Param('token') token: string, @CurrentUser() user: AuthUser): Promise<{ lessonId: string }> {
    return this.links.lessonOf({ user, token });
  }
}

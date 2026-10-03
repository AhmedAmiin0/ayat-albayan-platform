import { joinLinkRequestSchema, type JoinLinkResult, type JoinLinkUrl, type RoomJoinResult } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { JoinLinkCopyService } from './join-link.copy.service';
import { JoinLinkService } from './join-link.service';
import { RoomJoinService } from './room-join.service';

/** Online classroom, staff side. The service decides who may enter (admin, the lesson's teacher, an assigned assistant). */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('lessons/:id')
export class ClassroomController {
  constructor(
    private readonly rooms: RoomJoinService,
    private readonly links: JoinLinkService,
    private readonly copies: JoinLinkCopyService,
  ) {}

  /** 403 not yours / join_not_open_yet, 410 join_closed, 503 classroom_not_configured. */
  @Post('room/join')
  @Roles('admin', 'teacher', 'assistant')
  @HttpCode(200)
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RoomJoinResult> {
    return this.rooms.join({ user, lessonId: id });
  }

  /** «ابعت لينك الحلقة»: 409 template_not_approved, 404 student_not_in_lesson. */
  @Post('join-link')
  @Roles('admin')
  @HttpCode(200)
  sendLink(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<JoinLinkResult> {
    return this.links.send({ lessonId: id, body: parseOrThrow(joinLinkRequestSchema, body), actorId: user.id });
  }

  /** «انسخ لينك الطالب»: the guest URL, for the admin or the lesson's own teacher. */
  @Post('join-link/url')
  @Roles('admin', 'teacher')
  @HttpCode(200)
  linkUrl(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<JoinLinkUrl> {
    return this.copies.url({ lessonId: id, user });
  }
}

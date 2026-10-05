import type { RoomJoinResult, StudentJoinLinkUrl, StudentLinkView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Ip, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions, Public } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { StudentLinkAdminService } from './student-link.admin.service';
import { StudentLinkService } from './student-link.service';

/** The student's own door (no login): the token in the path is the whole credential. */
@ApiTags('classroom')
@Public()
@Controller('public/student')
export class StudentLinkPublicController {
  constructor(private readonly links: StudentLinkService) {}

  /** «حلقتك القادمة …»: the current or next lesson and its window. */
  @Get(':token')
  view(@Param('token') token: string, @Ip() ip: string): Promise<StudentLinkView> {
    return this.links.view({ token, ip });
  }

  /** «ادخل الحلقة»: the guest join of the lesson whose room is open now. */
  @Post(':token/join')
  @HttpCode(200)
  join(@Param('token') token: string, @Body() body: unknown, @Ip() ip: string): Promise<RoomJoinResult> {
    return this.links.join({ token, ip, body });
  }
}

/** «رابط دخول الطالب» (admin): create or rotate the student's long-lived link. */
@ApiTags('classroom')
@ApiBearerAuth()
@Permissions('classroom.links')
@Controller('students/:id/join-link')
export class StudentLinkAdminController {
  constructor(private readonly links: StudentLinkAdminService) {}

  @Post()
  @HttpCode(200)
  issue(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<StudentJoinLinkUrl> {
    return this.links.issue({ studentId: id, actorId: user.id });
  }
}

import type { RoomOpenResult } from '@ab/shared';
import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { RoomOpenService } from './room-open.service';

/** «افتح الحلقة الآن»: the admin or the lesson's teacher opens the room before the usual 15 minutes. */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller('lessons/:id/room')
export class RoomOpenController {
  constructor(private readonly opener: RoomOpenService) {}

  /** 200 the new window; 403 not yours, 409 lesson_not_open, 410 join_closed. */
  @Post('open')
  @Roles('admin', 'teacher')
  @HttpCode(200)
  open(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<RoomOpenResult> {
    return this.opener.open({ user, lessonId: id });
  }
}

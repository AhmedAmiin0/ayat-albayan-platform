import { lessonRoomRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { RoomOpenService } from './room-open.service';

/** The admin or the lesson's teacher opens the room before the usual 15 minutes. */
@ApiBearerAuth()
@Controller()
export class RoomOpenController {
  constructor(private readonly opener: RoomOpenService) {}

  /** 200 the new window; 403 not yours, 409 lesson_not_open, 410 join_closed. */
  @Route(routes.open)
  @HttpCode(200)
  open(@RouteInput() { params }: RouteInputOf<typeof routes.open>, @CurrentUser() user: AuthUser) {
    return this.opener.open({ user, lessonId: params.id });
  }
}

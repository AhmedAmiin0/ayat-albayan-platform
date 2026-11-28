import { lessonJoinRoutes as routes, type RoomJoinResult } from '@ab/schedule';
import { Body, Controller, HttpCode, Ip, Param } from '@nestjs/common';
import { Public } from '@/common/auth/decorators';
import { Route } from '@/common/http/route';
import { GuestJoinService } from './join/guest-join.service';

/** The family's door (no login): the link token in the path is the whole credential. */
@Public()
@Controller()
export class ClassroomPublicController {
  constructor(private readonly guests: GuestJoinService) {}

  /** The body is read by the service, by token kind and after the rate limit (429 before 400). */
  @Route(routes.guestJoin)
  @HttpCode(200)
  join(
    @Param('linkToken') linkToken: string,
    @Body() body: unknown,
    @Ip() ip: string,
  ): Promise<RoomJoinResult> {
    return this.guests.join({ linkToken, ip, body });
  }
}

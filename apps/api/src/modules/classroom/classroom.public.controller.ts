import type { RoomJoinResult } from '@ab/shared';
import { Body, Controller, HttpCode, Ip, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/decorators';
import { GuestJoinService } from './guest-join.service';

/** The family's door (no login): the link token in the path is the whole credential. */
@ApiTags('classroom')
@Public()
@Controller('public/join')
export class ClassroomPublicController {
  constructor(private readonly guests: GuestJoinService) {}

  @Post(':linkToken')
  @HttpCode(200)
  join(@Param('linkToken') linkToken: string, @Body() body: unknown, @Ip() ip: string): Promise<RoomJoinResult> {
    return this.guests.join({ linkToken, ip, body });
  }
}

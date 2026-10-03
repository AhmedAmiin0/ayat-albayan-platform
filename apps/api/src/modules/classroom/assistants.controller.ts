import type { AssistantLessonView, AssistantView } from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { AssistantsService } from './assistants.service';

/** Teaching assistants: the admin assigns them per student; an assistant reads only their own sessions. */
@ApiTags('classroom')
@ApiBearerAuth()
@Controller()
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  /** Every assistant login, for the picker. */
  @Get('assistants')
  @Roles('admin')
  all(): Promise<AssistantView[]> {
    return this.assistants.all();
  }

  /** The caller's own sessions between `from` and `to` (ISO instants). */
  @Get('assistants/me/lessons')
  @Roles('assistant')
  mine(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<AssistantLessonView[]> {
    return this.assistants.mine({ profileId: user.id, query });
  }

  @Get('students/:id/assistants')
  @Roles('admin')
  forStudent(@Param('id', ParseUUIDPipe) id: string): Promise<AssistantView[]> {
    return this.assistants.forStudent(id);
  }

  @Post('students/:id/assistants')
  @Roles('admin')
  @HttpCode(200)
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<AssistantView[]> {
    return this.assistants.assign({ studentId: id, body, actorId: user.id });
  }

  @Delete('students/:id/assistants/:profileId')
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string, @Param('profileId', ParseUUIDPipe) profileId: string): Promise<AssistantView[]> {
    return this.assistants.remove(id, profileId);
  }
}

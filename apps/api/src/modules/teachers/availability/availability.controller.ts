import { availabilityReplaceSchema, timeOffCreateSchema } from '@ab/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { orNotFound, parseOrThrow } from '../http';
import { OwnTeacherGuard } from '../own-teacher.guard';
import { AvailabilityQueries, type AvailabilityRow, type TimeOff } from './availability.queries';

const uuid = new ParseUUIDPipe();

/** Weekly grid + time-off (R-TCH-02). Admin for anyone; a teacher only for their own row. */
@ApiTags('teachers')
@ApiBearerAuth()
@Roles('admin', 'teacher')
@UseGuards(OwnTeacherGuard)
@Controller('teachers/:id')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityQueries) {}

  @Get('availability')
  grid(@Param('id', uuid) id: string): Promise<AvailabilityRow[]> {
    return this.availability.listSlots(id);
  }

  /** Replaces every row of the teacher's weekly grid with `slots`. */
  @Put('availability')
  replaceGrid(
    @Param('id', uuid) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilityRow[]> {
    const { slots } = parseOrThrow(availabilityReplaceSchema, body);
    return this.availability.replaceSlots({ teacherId: id, actorId: user.id, slots });
  }

  @Get('time-off')
  timeOff(@Param('id', uuid) id: string): Promise<TimeOff[]> {
    return this.availability.listTimeOff(id);
  }

  @Post('time-off')
  addTimeOff(
    @Param('id', uuid) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<TimeOff> {
    const parsed = parseOrThrow(timeOffCreateSchema, body);
    return this.availability.insertTimeOff({ teacherId: id, actorId: user.id, body: parsed });
  }

  @Put('time-off/:timeOffId')
  async editTimeOff(
    @Param('id', uuid) id: string,
    @Param('timeOffId', uuid) timeOffId: string,
    @Body() body: unknown,
  ): Promise<TimeOff> {
    const parsed = parseOrThrow(timeOffCreateSchema, body);
    return orNotFound(await this.availability.updateTimeOff({ teacherId: id, id: timeOffId, body: parsed }));
  }

  @Delete('time-off/:timeOffId')
  @HttpCode(204)
  async removeTimeOff(
    @Param('id', uuid) id: string,
    @Param('timeOffId', uuid) timeOffId: string,
  ): Promise<void> {
    if (!(await this.availability.deleteTimeOff(id, timeOffId))) throw new NotFoundException();
  }
}

import { availabilityReplaceSchema, timeOffCreateSchema } from '@ab/shared';
import {
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
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { orNotFound } from '@/common/http/http';
import { ZodBody } from '@/common/http/zod-inputs';
import { OwnTeacherGuard } from '@/modules/people/teachers/own-teacher.guard';
import { AvailabilityRepo, type AvailabilityRow, type TimeOff } from './availability.repo';

const uuid = new ParseUUIDPipe();

/** Weekly grid + time-off (R-TCH-02). Admin for anyone; a teacher only for their own row. */
@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(OwnTeacherGuard)
@Permissions('availability.write')
@Controller('teachers/:id')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityRepo) {}

  @Get('availability')
  @Permissions('availability.read')
  grid(@Param('id', uuid) id: string): Promise<AvailabilityRow[]> {
    return this.availability.listSlots(id);
  }

  /** Replaces every row of the teacher's weekly grid with `slots`. */
  @Put('availability')
  replaceGrid(
    @Param('id', uuid) id: string,
    @ZodBody(availabilityReplaceSchema) body: z.output<typeof availabilityReplaceSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilityRow[]> {
    const { slots } = body;
    return this.availability.replaceSlots({ teacherId: id, actorId: user.id, slots });
  }

  @Get('time-off')
  @Permissions('availability.read')
  timeOff(@Param('id', uuid) id: string): Promise<TimeOff[]> {
    return this.availability.listTimeOff(id);
  }

  @Post('time-off')
  addTimeOff(
    @Param('id', uuid) id: string,
    @ZodBody(timeOffCreateSchema) body: z.output<typeof timeOffCreateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TimeOff> {
    return this.availability.insertTimeOff({ teacherId: id, actorId: user.id, body });
  }

  @Put('time-off/:timeOffId')
  async editTimeOff(
    @Param('id', uuid) id: string,
    @Param('timeOffId', uuid) timeOffId: string,
    @ZodBody(timeOffCreateSchema) body: z.output<typeof timeOffCreateSchema>,
  ): Promise<TimeOff> {
    return orNotFound(
      await this.availability.updateTimeOff({ teacherId: id, id: timeOffId, body }),
    );
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

import { availabilityRoutes as routes, type AvailabilityRow, type TimeOff } from '@ab/shared';
import { Controller, HttpCode, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { orNotFound } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { OwnTeacherGuard } from '@/modules/people/teachers/own-teacher.guard';
import { AvailabilityRepo } from './availability.repo';

/** Weekly grid + time-off (R-TCH-02). Admin for anyone; a teacher only for their own row. */
@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(OwnTeacherGuard)
@Permissions('availability.write')
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityRepo) {}

  @Route(routes.grid)
  @Permissions('availability.read')
  grid(@RouteInput() { params }: RouteInputOf<typeof routes.grid>): Promise<AvailabilityRow[]> {
    return this.availability.listSlots(params.id);
  }

  /** Replaces every row of the teacher's weekly grid with `slots`. */
  @Route(routes.replaceGrid)
  replaceGrid(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.replaceGrid>,
    @CurrentUser() user: AuthUser,
  ): Promise<AvailabilityRow[]> {
    const { slots } = body;
    return this.availability.replaceSlots({ teacherId: params.id, actorId: user.id, slots });
  }

  @Route(routes.timeOff)
  @Permissions('availability.read')
  timeOff(@RouteInput() { params }: RouteInputOf<typeof routes.timeOff>): Promise<TimeOff[]> {
    return this.availability.listTimeOff(params.id);
  }

  @Route(routes.addTimeOff)
  addTimeOff(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.addTimeOff>,
    @CurrentUser() user: AuthUser,
  ): Promise<TimeOff> {
    return this.availability.insertTimeOff({ teacherId: params.id, actorId: user.id, body });
  }

  @Route(routes.editTimeOff)
  async editTimeOff(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.editTimeOff>,
  ): Promise<TimeOff> {
    const edit = { teacherId: params.id, id: params.timeOffId, body };
    return orNotFound(await this.availability.updateTimeOff(edit));
  }

  @Route(routes.removeTimeOff)
  @HttpCode(204)
  async removeTimeOff(
    @RouteInput() { params }: RouteInputOf<typeof routes.removeTimeOff>,
  ): Promise<void> {
    const removed = await this.availability.deleteTimeOff(params.id, params.timeOffId);
    if (!removed) throw new NotFoundException();
  }
}

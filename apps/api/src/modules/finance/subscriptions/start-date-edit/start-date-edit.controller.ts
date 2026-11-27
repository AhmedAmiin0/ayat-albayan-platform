import { startDateEditRoutes as routes, type StartDateEditResult } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { StartDateEdit } from './start-date-edit.service';

/** Needs subscriptions.edit_terms (not set_start_date alone); never teachers or families. */
@ApiBearerAuth()
@Controller()
export class StartDateEditController {
  constructor(private readonly edits: StartDateEdit) {}

  /** See StartDateEdit for the refusals. */
  @Route(routes.edit)
  edit(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.edit>,
    @CurrentUser() user: AuthUser,
  ): Promise<StartDateEditResult> {
    const { id } = params;
    return this.edits.edit({ id, startsOn: body.startsOn, actorId: user.id, now: new Date() });
  }
}

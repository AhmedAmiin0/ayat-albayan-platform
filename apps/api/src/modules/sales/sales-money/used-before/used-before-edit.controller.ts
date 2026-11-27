import { usedBeforeRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { UsedBeforeEdit } from '@/modules/finance/subscriptions';
import { UsedBeforeAccess } from './used-before-access';

/** Needs subscriptions.edit_terms; never teachers or families; own students only if enforced. */
@ApiBearerAuth()
@Controller()
export class UsedBeforeEditController {
  constructor(
    private readonly edits: UsedBeforeEdit,
    private readonly access: UsedBeforeAccess,
  ) {}

  /** The stored number, the stepper's max, a refusal (cancelled, course). */
  @Route(routes.state)
  async state(
    @RouteInput() { params }: RouteInputOf<typeof routes.state>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assert(params.id, user);
    return asResponse(routes.state.response, await this.edits.state(params.id));
  }

  /** See UsedBeforeEdit for the refusals. */
  @Route(routes.edit)
  async edit(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.edit>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.access.assert(params.id, user);
    const input = { id: params.id, lessonsUsedBefore: body.lessonsUsedBefore, actorId: user.id };
    return this.edits.edit({ ...input, now: new Date() });
  }
}

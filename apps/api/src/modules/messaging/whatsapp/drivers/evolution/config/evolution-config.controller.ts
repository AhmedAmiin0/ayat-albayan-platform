import {
  evolutionRoutes as routes,
  evolutionSyncFailed,
  evolutionSyncSchema,
  type EvolutionSyncView,
} from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { NumbersEvolution } from '@/modules/messaging/numbers';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import type { AuthUser } from '@/common/auth/verify-token';
import { CurrentUser } from '@/common/auth/decorators';
import { evolutionFailure } from './evolution-failure';
import { syncEvolution } from './evolution-push';

/** Saved, pushed and read back; no secret in a body, answer or log. */
@ApiBearerAuth()
@Controller()
export class EvolutionConfigController {
  constructor(private readonly numbers: NumbersEvolution) {}

  /** A save stands even when Evolution is unreachable: 502 with saved. */
  @Route(routes.saveConfig)
  async config(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.saveConfig>,
    @CurrentUser() user: AuthUser,
  ): Promise<EvolutionSyncView> {
    await this.numbers.saveConfig({ id: params.id, config: body, actorId: user.id });
    return this.sync(params.id, { push: true, saved: true });
  }

  @Route(routes.push)
  @HttpCode(200)
  push(@RouteInput() { params }: RouteInputOf<typeof routes.push>): Promise<EvolutionSyncView> {
    return this.sync(params.id, { push: true, saved: false });
  }

  @Route(routes.verify)
  async verify(
    @RouteInput() { params }: RouteInputOf<typeof routes.verify>,
  ): Promise<EvolutionSyncView> {
    const view = await this.sync(params.id, { push: false, saved: false });
    return asResponse(evolutionSyncSchema, view);
  }

  /** A failure first stores unsynced, so an older synced state never outlives it. */
  private async sync(
    id: string,
    at: { push: boolean; saved: boolean },
  ): Promise<EvolutionSyncView> {
    const now = new Date();
    try {
      const view = await syncEvolution(await this.numbers.pushInput(id), { push: at.push, now });
      await this.numbers.saveSync(id, view);
      return view;
    } catch (e) {
      await this.numbers.saveSync(id, evolutionSyncFailed(now)).catch(() => undefined);
      throw evolutionFailure(e, at.saved);
    }
  }
}

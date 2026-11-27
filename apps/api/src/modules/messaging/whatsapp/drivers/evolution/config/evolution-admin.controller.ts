import {
  evolutionQrViewSchema,
  evolutionRoutes as routes,
  evolutionStateViewSchema,
  type EvolutionQrView,
  type EvolutionStateView,
} from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { NumbersEvolution } from '@/modules/messaging/numbers';
import { evolutionFailure as failure } from './evolution-failure';
import { instanceQr, instanceState } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-instance';

/** Read calls only: no token leaves. */
@ApiBearerAuth()
@Controller()
export class NumbersEvolutionController {
  constructor(private readonly numbers: NumbersEvolution) {}

  @Route(routes.state)
  async state(
    @RouteInput() { params }: RouteInputOf<typeof routes.state>,
  ): Promise<EvolutionStateView> {
    const env = await this.numbers.instanceEnv(params.id);
    const state = await instanceState({ env }).catch((e: unknown) => {
      throw failure(e);
    });
    return asResponse(evolutionStateViewSchema, { state, checked_at: new Date().toISOString() });
  }

  @Route(routes.qr)
  async qr(@RouteInput() { params }: RouteInputOf<typeof routes.qr>): Promise<EvolutionQrView> {
    const env = await this.numbers.instanceEnv(params.id);
    const q = await instanceQr({ env }).catch((e: unknown) => {
      throw failure(e);
    });
    return asResponse(evolutionQrViewSchema, {
      state: q.state,
      qr: q.qr,
      pairing_code: q.pairingCode,
    });
  }
}

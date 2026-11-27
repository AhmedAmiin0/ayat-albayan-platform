import { communicationsRoutes as routes, type CommsSourceView, type ParityView } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { CommunicationsService } from './communications.service';

/**
 * docs/23 §2e steps 4–5: parity shows ids and «same / different / missing», never a secret value;
 * the switch never opens the send gate.
 */
@ApiBearerAuth()
@Controller()
export class CommunicationsController {
  constructor(private readonly comms: CommunicationsService) {}

  @Route(routes.parity)
  parity(): Promise<ParityView> {
    return this.comms.parity();
  }

  @Route(routes.source)
  @HttpCode(200)
  setSource(
    @RouteInput() { body }: RouteInputOf<typeof routes.source>,
    @CurrentUser() user: AuthUser,
  ): Promise<CommsSourceView> {
    return this.comms.setSource(body.source, user.id);
  }
}

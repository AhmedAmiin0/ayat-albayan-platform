import { shortLinkGateRoutes as routes } from '@ab/shared';
import { Controller, Header, HttpCode, Inject, Ip, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { RouteResult } from '@ab/core';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { GateLimit } from './gate.limit';
import { GateService } from './gate.service';

const input = () => RouteInput({ badParam: () => notFound('short_link_not_found') });
type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;
type Out<K extends keyof typeof routes> = Promise<RouteResult<(typeof routes)[K]>>;

/**
 * The web gate /l/<code> of a managed link (docs/19 «Gate»): the link's title and state (never the
 * target), then a signed-in open or a WhatsApp code. 404 short_link_not_found, 401 invalid_code,
 * 429 too_many_requests. Never cached.
 */
@UseGuards(GateLimit)
@Controller()
export class GatePublicController {
  constructor(@Inject(GateService) private readonly gate: GateService) {}

  @Route(routes.view)
  @Header('Cache-Control', 'no-store')
  async view(@input() { params }: In<'view'>): Out<'view'> {
    return asResponse(routes.view.response, await this.gate.view(params.code));
  }

  @Route(routes.start)
  @HttpCode(202)
  async start(@input() { params, body }: In<'start'>, @Ip() ip: string): Promise<void> {
    await this.gate.start({ code: params.code, phone: body.phone, ip });
  }

  @Route(routes.verify)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  verify(@input() { params, body }: In<'verify'>, @Ip() ip: string): Out<'verify'> {
    return this.gate.verify({ code: params.code, phone: body.phone, otp: body.code, ip });
  }
}

/** POST /public/short-links/:code/open with the caller's JWT: the visit by profile. */
@ApiBearerAuth()
@SignedIn()
@UseGuards(GateLimit)
@Controller()
export class GateSignedInController {
  constructor(@Inject(GateService) private readonly gate: GateService) {}

  @Route(routes.open)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  open(@input() { params }: In<'open'>, @CurrentUser() user: AuthUser): Out<'open'> {
    return this.gate.openAs(params.code, user.id);
  }
}

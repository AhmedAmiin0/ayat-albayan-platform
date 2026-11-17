import {
  shortCodeSchema,
  shortLinkOtpStartSchema,
  shortLinkOtpVerifySchema,
  type ShortLinkGateView,
  type ShortLinkOpenResult,
  type ShortLinkOtpStart,
  type ShortLinkOtpVerify,
} from '@ab/shared';
import { Controller, Get, Header, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Public, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { GateLimit } from './gate.limit';
import { GateService } from './gate.service';

const code = () => ZodParam('code', shortCodeSchema, () => notFound('short_link_not_found'));

/**
 * The web gate /l/<code> of a managed link (docs/19 «Gate»): the link's title and state (never the
 * target), then a signed-in open or a WhatsApp code. 404 short_link_not_found, 401 invalid_code,
 * 429 too_many_requests. Never cached.
 */
@ApiTags('short-links')
@Public()
@UseGuards(GateLimit)
@Controller('public/short-links/:code')
export class GatePublicController {
  constructor(private readonly gate: GateService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  view(@code() c: string): Promise<ShortLinkGateView> {
    return this.gate.view(c);
  }

  @Post('otp/start')
  @HttpCode(202)
  async start(
    @code() c: string,
    @ZodBody(shortLinkOtpStartSchema) body: ShortLinkOtpStart,
    @Ip() ip: string,
  ): Promise<void> {
    await this.gate.start({ code: c, phone: body.phone, ip });
  }

  @Post('otp/verify')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  verify(
    @code() c: string,
    @ZodBody(shortLinkOtpVerifySchema) body: ShortLinkOtpVerify,
    @Ip() ip: string,
  ): Promise<ShortLinkOpenResult> {
    return this.gate.verify({ code: c, phone: body.phone, otp: body.code, ip });
  }
}

/** POST /public/short-links/:code/open with the caller's JWT: the visit by profile. */
@ApiTags('short-links')
@ApiBearerAuth()
@SignedIn()
@UseGuards(GateLimit)
@Controller('public/short-links/:code')
export class GateSignedInController {
  constructor(private readonly gate: GateService) {}

  @Post('open')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  open(@code() c: string, @CurrentUser() user: AuthUser): Promise<ShortLinkOpenResult> {
    return this.gate.openAs(c, user.id);
  }
}

import {
  codeRequestSchema,
  codeVerifySchema,
  forgotSchema,
  loginSchema,
  resetSchema,
  type CodeSession,
  type CodeStatus,
  type PasswordSession,
} from '@ab/shared';
import { Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { ZodBody } from '@/common/http/zod-inputs';
import { FamilyCodeService } from './flows/family-code.service';
import { PasswordService } from './flows/password.service';
import { SignInSettings } from './sign-in.settings';

/**
 * Family accounts (docs/30 §6): public routes, each zod-validated by its packages/shared schema and
 * rate-limited (429 too_many_requests). The code request / forgot routes answer 202 whatever exists.
 */
@ApiTags('auth')
@Public()
@Controller('auth')
export class SignInController {
  constructor(
    private readonly family: FamilyCodeService,
    private readonly passwords: PasswordService,
    private readonly settings: SignInSettings,
  ) {}

  /** Which sign-in / forgot screens to show: codes can be sent now (or «not yet» / «ask the admin»). */
  @Get('code/status')
  async status(): Promise<CodeStatus> {
    return { available: await this.family.available() };
  }

  @Post('code/request')
  @HttpCode(202)
  request(
    @ZodBody(codeRequestSchema) body: z.output<typeof codeRequestSchema>,
    @Ip() ip: string,
  ): Promise<void> {
    return this.family.request(body, ip);
  }

  @Post('code/verify')
  @HttpCode(200)
  verify(
    @ZodBody(codeVerifySchema) body: z.output<typeof codeVerifySchema>,
    @Ip() ip: string,
  ): Promise<CodeSession> {
    return this.family.verify(body, ip);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @ZodBody(loginSchema) body: z.output<typeof loginSchema>,
    @Ip() ip: string,
  ): Promise<PasswordSession> {
    return this.passwords.login(body, ip);
  }

  @Post('password/forgot')
  @HttpCode(202)
  forgot(
    @ZodBody(forgotSchema) body: z.output<typeof forgotSchema>,
    @Ip() ip: string,
  ): Promise<void> {
    return this.passwords.forgot(body, ip);
  }

  @Post('password/reset')
  @HttpCode(204)
  async reset(
    @ZodBody(resetSchema) body: z.output<typeof resetSchema>,
    @Ip() ip: string,
  ): Promise<void> {
    await this.passwords.reset(body, ip, this.settings.config.passwordMinLength);
  }
}

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
import { Body, Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/auth/decorators';
import { parseOrThrow } from '../../../common/http/http';
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
  request(@Body() body: unknown, @Ip() ip: string): Promise<void> {
    return this.family.request(parseOrThrow(codeRequestSchema, body), ip);
  }

  @Post('code/verify')
  @HttpCode(200)
  verify(@Body() body: unknown, @Ip() ip: string): Promise<CodeSession> {
    return this.family.verify(parseOrThrow(codeVerifySchema, body), ip);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: unknown, @Ip() ip: string): Promise<PasswordSession> {
    return this.passwords.login(parseOrThrow(loginSchema, body), ip);
  }

  @Post('password/forgot')
  @HttpCode(202)
  forgot(@Body() body: unknown, @Ip() ip: string): Promise<void> {
    return this.passwords.forgot(parseOrThrow(forgotSchema, body), ip);
  }

  @Post('password/reset')
  @HttpCode(204)
  async reset(@Body() body: unknown, @Ip() ip: string): Promise<void> {
    await this.passwords.reset(parseOrThrow(resetSchema, body), ip, this.settings.config.passwordMinLength);
  }
}

import { activityListQuery, type ActivityPage } from '@ab/shared';
import { Controller, Get, HttpCode, HttpException, HttpStatus, Ip, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '../http/http';
import { WindowCounter } from '../../modules/feedback/public/feedback.rate-limit';
import { CurrentUser, Permissions, Public, SignedIn } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { ActivityQueries } from './activity.queries';

/** «سجل النشاط»: GET /activity, admin only, paged + filtered + sorted (R-NFR-08). */
@ApiTags('activity')
@ApiBearerAuth()
@Permissions('activity.read')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityQueries) {}

  @Get()
  list(@Query() query: unknown): Promise<ActivityPage> {
    return this.activity.list(parseOrThrow(activityListQuery, query));
  }
}

function tooMany(): HttpException {
  return new HttpException({ code: 'too_many_requests', message: 'too_many_requests' }, HttpStatus.TOO_MANY_REQUESTS);
}

/**
 * Sign-in happens against Supabase Auth from the browser, so the web reports it here; the
 * ActivityInterceptor writes the row (authSession.login / .logout / .loginFailed). The handlers do
 * nothing else. No body is expected, and values are never stored: a failed sign-in keeps no email,
 * only IP and user agent (plus the names of any fields a client did send).
 * Rate-limited per user (30) and, for failures, per IP (20), each per 10 minutes.
 */
@ApiTags('activity')
@SignedIn()
@Controller('activity/session')
export class AuthSessionController {
  private readonly perUser = new WindowCounter(30);
  private readonly perIp = new WindowCounter(20);

  @ApiBearerAuth()
  @Post('login')
  @HttpCode(204)
  login(@CurrentUser() user: AuthUser): void {
    if (!this.perUser.allow(user.id, Date.now())) throw tooMany();
  }

  /** Called before supabase.auth.signOut(), while the token is still valid. */
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser() user: AuthUser): void {
    if (!this.perUser.allow(user.id, Date.now())) throw tooMany();
  }

  @Public()
  @Post('login-failed')
  @HttpCode(204)
  loginFailed(@Ip() ip: string): void {
    if (!this.perIp.allow(ip, Date.now())) throw tooMany();
  }
}

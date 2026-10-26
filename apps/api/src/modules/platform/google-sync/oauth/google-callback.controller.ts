import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../../../common/auth/decorators';
import { loadEnv } from '../../../../config/env/env';
import { firstWebOrigin } from '../../../teaching/classroom/classroom.config';
import { GoogleOAuthService } from './google-oauth.service';

/**
 * GET /integrations/google/callback — where Google sends the owner's browser back (the exact URI
 * registered in the OAuth client). Public: the signed single-use state proves which admin started
 * it. Always a redirect to the settings page; never echoes a code or token.
 */
@ApiExcludeController()
@Controller('integrations/google')
export class GoogleCallbackController {
  constructor(private readonly oauth: GoogleOAuthService) {}

  @Get('callback')
  @Public()
  @Redirect()
  async callback(@Query() query: Record<string, string | undefined>): Promise<{ url: string; statusCode: number }> {
    const outcome = await this.oauth.callback({ code: query['code'], state: query['state'], error: query['error'] }).catch(() => 'exchange' as const);
    const q = outcome === 'connected' ? 'google=connected' : `google=error&reason=${outcome}`;
    return { url: `${firstWebOrigin(loadEnv().WEB_ORIGIN)}/admin/settings?${q}#integrations`, statusCode: 302 };
  }
}

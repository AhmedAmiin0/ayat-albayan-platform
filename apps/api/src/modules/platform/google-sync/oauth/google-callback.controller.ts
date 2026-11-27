import { Controller, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '@/common/auth/decorators';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { loadEnv } from '@/config/env/env';
import { firstWebOrigin } from '@/modules/teaching/classroom/classroom.config';
import { googleOAuthRoutes as routes } from './google-oauth.routes';
import { GoogleOAuthService } from './google-oauth.service';

/**
 * GET /integrations/google/callback — where Google sends the owner's browser back (the exact URI
 * registered in the OAuth client). Public: the signed single-use state proves which admin started
 * it. Always a redirect to the settings page; never echoes a code or token.
 */
@ApiExcludeController()
@Controller()
export class GoogleCallbackController {
  constructor(private readonly oauth: GoogleOAuthService) {}

  @Route(routes.callback)
  @Public()
  @Redirect()
  async callback(
    @RouteInput() { query }: RouteInputOf<typeof routes.callback>,
  ): Promise<{ url: string; statusCode: number }> {
    const outcome = await this.oauth.callback(query).catch(() => 'exchange' as const);
    const q = outcome === 'connected' ? 'google=connected' : `google=error&reason=${outcome}`;
    const origin = firstWebOrigin(loadEnv().WEB_ORIGIN);
    return { url: `${origin}/admin/settings?${q}#integrations`, statusCode: 302 };
  }
}

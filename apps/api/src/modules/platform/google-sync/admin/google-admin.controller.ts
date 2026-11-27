import { googleAdminRoutes as routes, type GoogleConnectUrl, type GoogleStatusView } from '@ab/catalog';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { AdminUser, requireAdmin } from './admin-only';
import { GoogleAdminService } from './google-admin.service';
import { GoogleOAuthService } from '@/modules/platform/google-sync/oauth/google-oauth.service';
import { GoogleStatusService } from './google-status.service';

/** docs/24 §3: admins only. */
@ApiBearerAuth()
@Controller()
export class GoogleAdminController {
  constructor(
    private readonly status: GoogleStatusService,
    private readonly oauth: GoogleOAuthService,
    private readonly admin: GoogleAdminService,
  ) {}

  @Route(routes.status)
  view(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    return this.answer();
  }

  /** The consent URL; the browser goes there itself (a redirect cannot carry the bearer). */
  @Route(routes.connect)
  async connect(@CurrentUser() user: AuthUser): Promise<GoogleConnectUrl> {
    requireAdmin(user);
    return { url: await this.oauth.connectUrl(user.id) };
  }

  @Route(routes.disconnect)
  async disconnect(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.oauth.disconnect(user.id);
    return this.answer();
  }

  @Route(routes.settings)
  async settings(
    @RouteInput() { body }: RouteInputOf<typeof routes.settings>,
    @AdminUser() user: AuthUser,
  ): Promise<GoogleStatusView> {
    await this.admin.saveSettings({ values: body, actorId: user.id });
    return this.answer();
  }

  @Route(routes.discover)
  async discover(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.admin.discover();
    return this.answer();
  }

  @Route(routes.drive)
  async drive(
    @RouteInput() { body }: RouteInputOf<typeof routes.drive>,
    @AdminUser() user: AuthUser,
  ): Promise<GoogleStatusView> {
    await this.admin.confirmDrive({ values: body, actorId: user.id });
    return this.answer();
  }

  private async answer(): Promise<GoogleStatusView> {
    return asResponse(routes.status.response, await this.status.view());
  }
}

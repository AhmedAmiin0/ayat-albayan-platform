import { googleDriveSchema, googleSettingsSchema, type GoogleStatusView } from '@ab/shared';
import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { requireAdmin } from './admin-only';
import { GoogleAdminService } from './google-admin.service';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleStatusService } from './google-status.service';

/** «التكاملات» → Google (docs/24 §3): the connection, the two switches, discovery and the Drive root. Admins only. */
@ApiTags('google-sync')
@ApiBearerAuth()
@Permissions('settings.write')
@Controller('admin/google')
export class GoogleAdminController {
  constructor(
    private readonly status: GoogleStatusService,
    private readonly oauth: GoogleOAuthService,
    private readonly admin: GoogleAdminService,
  ) {}

  @Get('status')
  @Permissions('settings.read')
  view(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    return this.status.view();
  }

  /** The consent URL; the browser goes there itself (a redirect cannot carry the bearer). */
  @Get('connect')
  async connect(@CurrentUser() user: AuthUser): Promise<{ url: string }> {
    requireAdmin(user);
    return { url: await this.oauth.connectUrl(user.id) };
  }

  @Post('disconnect')
  async disconnect(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.oauth.disconnect(user.id);
    return this.status.view();
  }

  @Put('settings')
  async settings(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.admin.saveSettings({ values: parseOrThrow(googleSettingsSchema, body), actorId: user.id });
    return this.status.view();
  }

  @Post('discover')
  async discover(@CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.admin.discover();
    return this.status.view();
  }

  @Put('drive')
  async drive(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<GoogleStatusView> {
    requireAdmin(user);
    await this.admin.confirmDrive({ values: parseOrThrow(googleDriveSchema, body), actorId: user.id });
    return this.status.view();
  }
}

import { stripeSettingsPatchSchema, type StripeAdminSettings } from '@ab/shared';
import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { StripeAdmin } from './stripe-admin.service';

/** What Fastify tells us about the host the admin reached (trustProxy: the visitor's scheme and host). */
interface HostRequest {
  protocol: string;
  hostname: string;
}

/** The URL to paste into the Stripe sandbox's webhook endpoint: this API's POST /webhooks/stripe. */
const webhookUrlOf = (req: HostRequest): string => `${req.protocol}://${req.hostname}/webhooks/stripe`;

/**
 * GET / PATCH /admin/stripe/settings: mounted with FEATURE_STRIPE=test only (whatever the DB switch says, so
 * the owner can turn it on). Admin permissions, like «التكاملات». Secrets are write-only.
 */
@ApiTags('stripe')
@ApiBearerAuth()
@Permissions('settings.read')
@Controller('admin/stripe/settings')
export class StripeAdminController {
  constructor(private readonly admin: StripeAdmin) {}

  @Get()
  get(@Req() req: HostRequest): Promise<StripeAdminSettings> {
    return this.admin.view(webhookUrlOf(req));
  }

  @Patch()
  @Permissions('settings.write')
  async patch(@Body() body: unknown, @CurrentUser() user: AuthUser, @Req() req: HostRequest): Promise<StripeAdminSettings> {
    await this.admin.patch(parseOrThrow(stripeSettingsPatchSchema, body), user.id);
    return this.admin.view(webhookUrlOf(req));
  }
}

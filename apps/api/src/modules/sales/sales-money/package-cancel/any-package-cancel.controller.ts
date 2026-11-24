import {
  salesPackageIdSchema,
  subscriptionCancelSchema,
  type SalesPackageCancelCheck,
  type SalesPackageCancelled,
  type SubscriptionCancel,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { AnyPackageCancel } from './any-package-cancel.service';

/** subscriptions.stop (migration 990), never subscriptions.write; own students only if enforced. */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('subscriptions.stop')
@Controller('sales/packages')
export class AnyPackageCancelController {
  constructor(private readonly cancels: AnyPackageCancel) {}

  /** Whether the button shows: the POST's 409 code, or null. 404 subscription_not_found. */
  @Get(':id/cancel')
  check(
    @ZodParam('id', salesPackageIdSchema) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesPackageCancelCheck> {
    return this.cancels.check(id, user);
  }

  /** 409 already_cancelled, has_payments, has_lessons or has_commission. */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @ZodParam('id', salesPackageIdSchema) id: string,
    @ZodBody(subscriptionCancelSchema, { orEmpty: true }) body: SubscriptionCancel,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesPackageCancelled> {
    return this.cancels.cancel(id, body, user);
  }
}

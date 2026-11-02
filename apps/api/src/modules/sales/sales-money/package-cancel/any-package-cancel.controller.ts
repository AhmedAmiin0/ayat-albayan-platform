import {
  subscriptionCancelSchema,
  type SalesPackageCancelCheck,
  type SalesPackageCancelled,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { AnyPackageCancel } from './any-package-cancel.service';

const packageId = z.uuid();
const cancelBody = subscriptionCancelSchema;

/**
 * «إلغاء الباقة» in the assistant's «تفاصيل الطالب» (owner 2026-11-02), next to «إلغاء الاشتراك»:
 * subscriptions.stop (system admin and sales by default, migration 990), ANY student; never
 * subscriptions.write (the admin's POST /subscriptions/:id/cancel). Teachers and families never.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('subscriptions.stop')
@Controller('sales/packages')
export class AnyPackageCancelController {
  constructor(private readonly cancels: AnyPackageCancel) {}

  /** Whether the button shows: the POST's 409 code, or null. 404 subscription_not_found. */
  @Get(':id/cancel')
  check(@ZodParam('id', packageId) id: string): Promise<SalesPackageCancelCheck> {
    return this.cancels.check(id);
  }

  /** 200 «ملغاة»; 409 already_cancelled / has_payments / has_lessons / has_commission. */
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(
    @ZodParam('id', packageId) id: string,
    @ZodBody(cancelBody, { orEmpty: true }) body: z.output<typeof cancelBody>,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesPackageCancelled> {
    return this.cancels.cancel(id, body, user);
  }
}

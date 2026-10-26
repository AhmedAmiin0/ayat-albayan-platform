import {
  salesMeetingsQuerySchema,
  salesSubscriptionsQuerySchema,
  type SalesMeetingView,
  type SalesSubscriptionView,
} from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { SalesService } from './sales.service';

/** The salesperson's portal: my subscriptions (no money) and my meetings. Chats are /threads. */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales')
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get('subscriptions')
  subscriptions(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesSubscriptionView[]> {
    return this.sales.subscriptions(user, parseOrThrow(salesSubscriptionsQuerySchema, query).kind);
  }

  @Get('meetings')
  meetings(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesMeetingView[]> {
    return this.sales.meetings(user, parseOrThrow(salesMeetingsQuerySchema, query));
  }
}

import {
  salesChatReceiptRoutes as routes,
  salesFamilyQuerySchema,
  type SalesFamilyView,
} from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesChatReceipts } from '@/modules/sales/sales-money/chat';
import { SalesMoneyFamily } from './sales-money-family.service';

/**
 * What the sales subscribe flow reads (docs/16 rows 16–19): her students of a chat and its
 * receipt files.
 */
@ApiBearerAuth()
@Controller()
export class SalesMoneyReadsController {
  constructor(
    private readonly families: SalesMoneyFamily,
    private readonly receipts: SalesChatReceipts,
  ) {}

  /**
   * Her students in the family of this chat (every child with sales.renew_any), each with the
   * packages still owed.
   */
  @Get('sales/money/family')
  @ApiTags('sales')
  @Permissions('self.sales_money')
  family(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesFamilyView> {
    return this.families.familyOf(parseOrThrow(salesFamilyQuerySchema, query).phone, user);
  }

  @Route(routes.list)
  async chatReceipts(
    @RouteInput() { query }: RouteInputOf<typeof routes.list>,
    @CurrentUser() user: AuthUser,
  ) {
    return asResponse(routes.list.response, await this.receipts.list(query, user));
  }

  @Route(routes.file)
  async chatReceipt(
    @RouteInput() { params, query }: RouteInputOf<typeof routes.file>,
    @CurrentUser() user: AuthUser,
  ) {
    const input = { ...query, messageId: params.messageId };
    return asResponse(routes.file.response, await this.receipts.file(input, user));
  }
}

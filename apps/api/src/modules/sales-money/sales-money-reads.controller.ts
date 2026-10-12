import {
  salesChatReceiptsQuerySchema,
  salesFamilyQuerySchema,
  type SalesChatReceipt,
  type SalesChatReceiptFile,
  type SalesFamilyView,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { SalesChatReceipts } from './sales-chat-receipts.service';
import { SalesMoney } from './sales-money.service';

/** What the sales subscribe flow reads (docs/16 rows 16–19): her students of a chat and its receipt files. */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_money')
@Controller('sales/money')
export class SalesMoneyReadsController {
  constructor(
    private readonly money: SalesMoney,
    private readonly receipts: SalesChatReceipts,
  ) {}

  /** Her students in the family of this chat (none of its other children), each with the packages still owed. */
  @Get('family')
  family(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesFamilyView> {
    return this.money.familyOf(parseOrThrow(salesFamilyQuerySchema, query).phone, user);
  }

  /** The images / PDFs her student's family sent in its chat (last 30 days, metadata only). */
  @Get('chat-receipts')
  chatReceipts(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesChatReceipt[]> {
    return this.receipts.list(parseOrThrow(salesChatReceiptsQuerySchema, query).studentId, user);
  }

  /** One of those files as a short-lived signed URL (a thumbnail). */
  @Get('chat-receipts/:messageId')
  chatReceipt(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query() query: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesChatReceiptFile> {
    const { studentId } = parseOrThrow(salesChatReceiptsQuerySchema, query);
    return this.receipts.file({ studentId, messageId }, user);
  }
}

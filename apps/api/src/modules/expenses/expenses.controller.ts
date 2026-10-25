import {
  expenseCreateSchema,
  expenseListQuery,
  expenseReceiptUploadSchema,
  expenseUpdateSchema,
  monthStart,
  type ExpenseView,
  type ExpenseYearView,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow, sentOnly } from '../../common/http/http';
import { ExpenseYearService } from './expense-year.service';
import { ExpensesQueries, toExpenseView } from './expenses.queries';
import { ExpensesService } from './expenses.service';

const yearQuery = z.object({ year: z.string().regex(/^\d{4}$/, 'invalid_year') });

/** Expenses (X1–X4, R-RPT-02, issue E4; owner 2026-10-05): list, year table, CRUD, receipts. Admin only, audited. */
@ApiTags('expenses')
@ApiBearerAuth()
@Permissions('expenses.write')
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly service: ExpensesService,
    private readonly years: ExpenseYearService,
  ) {}

  /** `?month=YYYY-MM` or `?year=YYYY`; drafts included (flagged). */
  @Get()
  @Permissions('expenses.read')
  async list(@Query() query: unknown): Promise<ExpenseView[]> {
    const q = parseOrThrow(expenseListQuery, query);
    const [first, last] = 'month' in q ? [monthStart(q.month), monthStart(q.month)] : [`${q.year}-01-01`, `${q.year}-12-01`];
    return (await this.expenses.between(first, last)).map(toExpenseView);
  }

  /** The 12-month table in the reporting currency. Static segment, before `:id`. */
  @Get('year')
  @Permissions('expenses.read')
  year(@Query() query: unknown): Promise<ExpenseYearView> {
    return this.years.year(parseOrThrow(yearQuery, query).year);
  }

  @Post('receipt-upload-url')
  @HttpCode(200)
  receiptUploadUrl(@Body() body: unknown): Promise<SignedUpload> {
    return this.service.receipts.uploadUrl(parseOrThrow(expenseReceiptUploadSchema, body).mime);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ExpenseView> {
    return this.service.create(parseOrThrow(expenseCreateSchema, body), user.id);
  }

  @Get(':id/receipt')
  @Permissions('expenses.read')
  receipt(@Param('id', ParseUUIDPipe) id: string): Promise<SignedDownload> {
    return this.service.receipt(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ExpenseView> {
    return this.service.update(id, sentOnly(parseOrThrow(expenseUpdateSchema, body), body), user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.service.remove(id, user.id);
  }
}

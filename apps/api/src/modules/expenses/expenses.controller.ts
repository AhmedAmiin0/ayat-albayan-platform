import type { TablesUpdate } from '@ab/db';
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  monthQuery,
  monthStart,
  type ExpenseView,
} from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { parseOrThrow, sentOnly } from '../teachers/http';
import { ExpensesQueries, toExpenseView } from './expenses.queries';

/** Ads / content / tools spend per month (X1–X4, R-RPT-02, issue E4). Admin only, audited. */
@ApiTags('expenses')
@ApiBearerAuth()
@Roles('admin')
@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: unknown): Promise<ExpenseView[]> {
    const { month } = parseOrThrow(monthQuery, query);
    return (await this.expenses.forMonth(monthStart(month))).map(toExpenseView);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ExpenseView> {
    const input = parseOrThrow(expenseCreateSchema, body);
    const row = await this.expenses.insert({
      month: monthStart(input.month),
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      note: input.note ?? null,
      created_by: user.id,
    });
    await this.audit.record({ actorId: user.id, entity: 'expenses', entityId: row.id, action: 'create', after: row });
    return toExpenseView(row);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpenseView> {
    const patch = sentOnly(parseOrThrow(expenseUpdateSchema, body), body);
    const before = await this.row(id);
    const write: TablesUpdate<'expenses'> = {};
    if (patch.month !== undefined) write.month = monthStart(patch.month);
    if (patch.category !== undefined) write.category = patch.category;
    if (patch.amount !== undefined) write.amount = patch.amount;
    if (patch.currency !== undefined) write.currency = patch.currency;
    if (patch.note !== undefined) write.note = patch.note;
    const after = Object.keys(write).length > 0 ? await this.expenses.update(id, write) : before;
    await this.audit.record({ actorId: user.id, entity: 'expenses', entityId: id, action: 'update', before, after });
    return toExpenseView(after);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    const before = await this.row(id);
    await this.expenses.remove(id);
    await this.audit.record({ actorId: user.id, entity: 'expenses', entityId: id, action: 'delete', before });
  }

  private async row(id: string) {
    const row = await this.expenses.get(id);
    if (!row) throw notFound('expense_not_found');
    return row;
  }
}

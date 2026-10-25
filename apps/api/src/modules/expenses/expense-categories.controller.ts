import { expenseCategoryCreateSchema, type ExpenseCategoryView } from '@ab/shared';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { conflict } from '../../common/http/errors';
import { parseOrThrow } from '../../common/http/http';
import { ExpensesQueries } from './expenses.queries';

/** Expense categories (migration 20261005000204): the seeded nine plus any the admin adds. */
@ApiTags('expenses')
@ApiBearerAuth()
@Permissions('expenses.read')
@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<ExpenseCategoryView[]> {
    return this.expenses.categories();
  }

  /** 409 category_exists for a key already there. Audited. */
  @Post()
  @Permissions('expenses.write')
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ExpenseCategoryView> {
    const input = parseOrThrow(expenseCategoryCreateSchema, body);
    const row = await this.expenses.addCategory({
      key: input.key,
      label_ar: input.labelAr,
      label_en: input.labelEn ?? null,
      created_by: user.id,
    });
    if (!row) throw conflict('category_exists');
    await this.audit.record({ actorId: user.id, entity: 'expense_categories', entityId: user.id, action: 'create', after: { ...row } });
    return row;
  }
}

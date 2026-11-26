import type { ExpenseCategoryView } from '@ab/money';
import { expenseRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ExpensesRepo } from './expenses.repo';

/** Expense categories (migration 20261005000204): the seeded nine plus any the admin adds. */
@ApiTags('expenses')
@ApiBearerAuth()
@Permissions('expenses.read')
@Controller()
export class ExpenseCategoriesController {
  constructor(
    private readonly expenses: ExpensesRepo,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.categories)
  list(): Promise<ExpenseCategoryView[]> {
    return this.expenses.categories();
  }

  /** 409 category_exists for a key already there. Audited. */
  @Route(routes.addCategory)
  @Permissions('expenses.write')
  async create(
    @RouteInput() { body: input }: RouteInputOf<typeof routes.addCategory>,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpenseCategoryView> {
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

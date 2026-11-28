import { monthStart, type ExpenseView, type ExpenseYearView } from '@ab/money';
import { expenseRoutes as routes, type SignedDownload, type SignedUpload } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ExpenseYearService } from './expense-year.service';
import { ExpensesRepo, toExpenseView } from './expenses.repo';
import { ExpensesService } from './expenses.service';

type ListQuery = RouteInputOf<typeof routes.list>['query'];

const monthsOf = (q: ListQuery): [string, string] =>
  'month' in q ? [monthStart(q.month), monthStart(q.month)] : [`${q.year}-01-01`, `${q.year}-12-01`];

/** Expenses (X1–X4, R-RPT-02, issue E4): list, year table, CRUD, receipts. Admin only, audited. */
@ApiBearerAuth()
@Controller()
export class ExpensesController {
  constructor(
    private readonly expenses: ExpensesRepo,
    private readonly service: ExpensesService,
    private readonly years: ExpenseYearService,
  ) {}

  /** `?month=YYYY-MM` or `?year=YYYY`; drafts included (flagged). */
  @Route(routes.list)
  async list(@RouteInput() { query }: RouteInputOf<typeof routes.list>): Promise<ExpenseView[]> {
    const [first, last] = monthsOf(query);
    return (await this.expenses.between(first, last)).map(toExpenseView);
  }

  /** The 12-month table in the reporting currency. Static segment, before `:id`. */
  @Route(routes.year)
  year(@RouteInput() { query }: RouteInputOf<typeof routes.year>): Promise<ExpenseYearView> {
    return this.years.year(query.year);
  }

  @Route(routes.receiptUploadUrl)
  @HttpCode(200)
  receiptUploadUrl(
    @RouteInput() { body }: RouteInputOf<typeof routes.receiptUploadUrl>,
  ): Promise<SignedUpload> {
    return this.service.receipts.uploadUrl(body);
  }

  @Route(routes.create)
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpenseView> {
    return this.service.create(body, user.id);
  }

  @Route(routes.receipt)
  receipt(@RouteInput() { params }: RouteInputOf<typeof routes.receipt>): Promise<SignedDownload> {
    return this.service.receipt(params.id);
  }

  @Route(routes.update)
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ): Promise<ExpenseView> {
    return this.service.update(params.id, body, user.id);
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.service.remove(params.id, user.id);
  }
}

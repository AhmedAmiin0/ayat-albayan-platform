import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseReceipts } from './expense-receipts';
import { ExpenseYearService } from './expense-year.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesJob } from './expenses.job';
import { ExpensesQueries } from './expenses.queries';
import { ExpensesService } from './expenses.service';
import { ExpensesSettings } from './expenses.settings';

/**
 * Expenses (R-RPT-02, issue E4; owner 2026-10-05): CRUD with date, vendor, method and receipt,
 * categories the admin can extend, the 12-month table in the reporting currency, and the
 * «تكرار شهري» job. Routes X1–X4 (docs/11 §9) + docs/11 §13.
 */
@Module({
  imports: [DashboardModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [ExpensesQueries, ExpensesService, ExpensesSettings, ExpenseReceipts, ExpenseYearService, ExpensesJob],
  exports: [ExpensesQueries],
})
export class ExpensesModule {}

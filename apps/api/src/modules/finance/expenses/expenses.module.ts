import { Module } from '@nestjs/common';
import { DashboardModule } from '@/modules/reporting/dashboard/dashboard.module';
import { ExpenseCategoriesController } from './expense-categories.controller';
import { ExpenseReceipts } from './expense-receipts';
import { ExpenseYearService } from './expense-year.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesJob } from './expenses.job';
import { ExpensesRepo } from './expenses.repo';
import { ExpensesService } from './expenses.service';
import { ExpensesSettings } from './expenses.settings';

/** Expenses (R-RPT-02, issue E4): routes X1-X4 (docs/11 §9) and docs/11 §13. */
@Module({
  imports: [DashboardModule],
  controllers: [ExpensesController, ExpenseCategoriesController],
  providers: [
    ExpensesRepo,
    ExpensesService,
    ExpensesSettings,
    ExpenseReceipts,
    ExpenseYearService,
    ExpensesJob,
  ],
  exports: [ExpensesRepo],
})
export class ExpensesModule {}

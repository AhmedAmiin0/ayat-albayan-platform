import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesQueries } from './expenses.queries';

/**
 * Expenses CRUD (ads/content/tools spend per month). R-RPT-02, issue E4. Routes X1–X4
 * (docs/11 §9). ExpensesQueries is exported for the dashboard's finance totals.
 */
@Module({
  controllers: [ExpensesController],
  providers: [ExpensesQueries],
  exports: [ExpensesQueries],
})
export class ExpensesModule {}

import type { ExpenseYearView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { currenciesOf } from '../../reporting/dashboard/finance/finance.mapper';
import { FxConverter } from '../../reporting/dashboard/finance/fx-converter';
import { expenseYear } from './expense-year';
import { ExpensesQueries } from './expenses.queries';
import { ExpensesSettings } from './expenses.settings';

/** GET /expenses/year?year: the 12 months in settings.reporting_currency (existing fx, fx_missing listed). */
@Injectable()
export class ExpenseYearService {
  constructor(
    private readonly expenses: ExpensesQueries,
    private readonly fx: FxConverter,
    private readonly settings: ExpensesSettings,
  ) {}

  async year(year: string): Promise<ExpenseYearView> {
    const rows = await this.expenses.between(`${year}-01-01`, `${year}-12-01`);
    const reporting = (await this.settings.read()).reporting_currency;
    const conversion = await this.fx.conversion(reporting, currenciesOf(rows));
    return expenseYear({ year, rows, conversion });
  }
}

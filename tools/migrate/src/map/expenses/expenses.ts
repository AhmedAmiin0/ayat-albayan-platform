// expenses ← FIN income statement summary rows (one per category per month, EGP). One source on
// purpose: the August «Expenses Tracker» and column G «ADS» itemise the same money (the summary
// «Ads» row is their sum), so reading them too would double count. «Staff Expenses» are teacher
// payouts, not expenses; zero rows are skipped (expenses.amount > 0). Pure.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { num, text } from '../../sources/sheets/cells.ts';
import { accepted } from '../../sources/sheets/issues.ts';
import type { Mapped, SourceRow } from '../../types.ts';

/** Keys of expense_categories (seeded by migration 20261005000204). */
const CATEGORY: Record<string, string> = {
  Ads: 'ads',
  Followers: 'ads', // bought followers: marketing spend
  Content: 'content',
  Website: 'tools',
  'other Expenses': 'other',
};

/** Statement tab → its month (`general` is August). */
const STATEMENT_MONTHS: Record<string, string> = {
  fin_aug: '2026-08-01',
  fin_sept: '2026-09-01',
};

const EXPENSE_CURRENCY = 'EGP';

/** «other Expenses» descriptions sit in columns H/I of the same tab («zoom»). */
function otherNote(rows: readonly SourceRow[]): string {
  const descs = rows
    .filter((r) => (num(r.fields['other_amount']) ?? 0) > 0)
    .map((r) => text(r.fields['other_desc']))
    .filter((d): d is string => d !== null);
  return ['other Expenses', ...descs].join(': ');
}

function sheetExpenses(rows: readonly SourceRow[], month: string): Mapped[] {
  return rows.flatMap((r) => {
    const label = text(r.fields['summary_label']);
    const amount = num(r.fields['summary_value']);
    const category = label ? CATEGORY[label] : undefined;
    if (!label || !category || amount === null || amount <= 0) return [];
    const note = category === 'other' ? otherNote(rows) : label;
    return [
      accepted({
        key: keys.expense({ month, category, note, amount }),
        ref: r.ref,
        columns: { month, category, amount, currency: EXPENSE_CURRENCY, note },
      }),
    ];
  });
}

export function mapExpenses(bundle: SourceBundle): Mapped[] {
  return Object.entries(STATEMENT_MONTHS).flatMap(([id, month]) =>
    sheetExpenses(bundle.sheets[id] ?? [], month),
  );
}

export const expensesModule: EntityModule = {
  entity: 'expenses',
  table: 'expenses',
  map: mapExpenses,
};

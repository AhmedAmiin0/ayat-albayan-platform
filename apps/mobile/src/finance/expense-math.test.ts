import { EXPENSE } from './fixtures';
import { totalsByCurrency } from './expense-math';

test('totals per currency, categories biggest first, cents rounded', () => {
  const rows = [
    EXPENSE(1, { amount: 100.1 }),
    EXPENSE(2, { amount: 250.2, category: 'rent' }),
    EXPENSE(3, { amount: 0.2 }),
    EXPENSE(4, { amount: 20, currency: 'SAR', category: 'tools' }),
  ];
  expect(totalsByCurrency(rows)).toEqual([
    { currency: 'EGP', total: 350.5, categories: [{ category: 'rent', amount: 250.2 }, { category: 'ads', amount: 100.3 }] },
    { currency: 'SAR', total: 20, categories: [{ category: 'tools', amount: 20 }] },
  ]);
});

test('a recurring draft is not counted, and no rows means no totals', () => {
  expect(totalsByCurrency([EXPENSE(1, { is_draft: true })])).toEqual([]);
  expect(totalsByCurrency([])).toEqual([]);
});

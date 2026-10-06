import type { ReceivablesView, TeacherEarningsSummaryView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { summaryCards } from './summary-cards';
import type { FinanceSummary } from './summary-types';

const finance = { currency: 'EGP', revenue: 5000, teacher_cost: 2000.4, expenses: 500, gross_margin: -1500 } as FinanceSummary['finance'];
const dues = { totals: { owed: 750 } } as TeacherEarningsSummaryView;
const owed = { total: 20, currency: 'SAR' } as ReceivablesView;

test('before anything loads every card is a dash; a loss is marked', () => {
  expect(summaryCards(undefined, undefined, undefined).map((c) => c.value)).toEqual(Array(6).fill('—'));
  const cards = summaryCards(finance, dues, owed);
  expect(cards.map((c) => c.value)).toEqual(['⁦5,000⁩ ج.م', '⁦2,000⁩ ج.م', '⁦500⁩ ج.م', '⁦-1,500⁩ ج.م', '⁦750⁩ ج.م', '⁦20⁩ ر.س']);
  expect(cards.map((c) => c.tone)).toEqual(['ink', 'ink', 'ink', 'bad', 'ink', 'ink']);
  expect(cards[3]?.label).toBe(t.dashboard.grossMargin);
});

test('the totals use the API reporting currency, not a hard-coded one; receivables carry their own', () => {
  const sar = { ...finance, currency: 'SAR' } as FinanceSummary['finance'];
  expect(summaryCards(sar, undefined, undefined).slice(0, 4).every((c) => c.value.endsWith('ر.س'))).toBe(true);
  expect(summaryCards(undefined, undefined, owed).map((c) => c.value)).toEqual([...Array(5).fill('—'), '⁦20⁩ ر.س']);
});

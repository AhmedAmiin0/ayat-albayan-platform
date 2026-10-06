import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { SummaryScreen } from './SummaryScreen';
import { summaryYears } from './month';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

const finance = {
  currency: 'EGP', revenue: 5000, teacher_cost: 2000, expenses: 500, gross_margin: 2500, by_source: [], fx_date: null,
  fx_missing: ['KWD'], unrated_lessons: 2,
  by_month: [
    { month: '2026-01', revenue: 0, teacher_cost: 0, expenses: 0, gross_margin: 0 },
    { month: '2026-09', revenue: 3000, teacher_cost: 1200, expenses: 300, gross_margin: 1500 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation((p: string) =>
    Promise.resolve(
      p.startsWith('/dashboard/summary') ? { finance }
        : p.startsWith('/teacher-earnings/summary') ? { totals: { owed: 750 } }
        : { total: 20, currency: 'SAR', fx_missing: [] },
    ),
  );
});

test('the cards show the totals, what teachers are owed and what students owe; months with money list below', async () => {
  await renderWithQuery(<SummaryScreen />);
  expect(await screen.findByLabelText(`${t.dashboard.revenue}: ⁦5,000⁩ ج.م`)).toBeTruthy();
  expect(screen.getByLabelText(`${t.dashboard.grossMargin}: ⁦2,500⁩ ج.م`)).toBeTruthy();
  expect(await screen.findByLabelText(`${t.finance.teachersOwedKpi}: ⁦750⁩ ج.م`)).toBeTruthy();
  expect(await screen.findByLabelText(`${t.finance.receivablesKpi}: ⁦20⁩ ر.س`)).toBeTruthy();
  expect(screen.getByText('سبتمبر 2026')).toBeTruthy();
  expect(screen.queryByText('يناير 2026')).toBeNull();
  expect(screen.getByText(t.finance.fxMissing.replace('{currencies}', 'KWD'))).toBeTruthy();
  expect(screen.getByText(t.mobileFinance.summary.noRates.replace('{count}', '2'))).toBeTruthy();
});

test('the year pills re-read the summary for that year', async () => {
  await renderWithQuery(<SummaryScreen />);
  await screen.findByLabelText(`${t.dashboard.revenue}: ⁦5,000⁩ ج.م`);
  const last = summaryYears()[1] ?? '';
  await fireEvent.press(screen.getByRole('tab', { name: last }));
  expect(mockApiFetch).toHaveBeenCalledWith(`/dashboard/summary?from=${last}-01-01&to=${last}-12-31`);
});

test('a failed load with nothing cached offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<SummaryScreen />);
  expect(await screen.findByText(t.mobileFinance.loadFailed)).toBeTruthy();
});

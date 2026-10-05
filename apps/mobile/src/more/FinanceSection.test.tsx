import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { FinanceSection } from './FinanceSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('«الحسابات» has a titled section with the four money screens, each opening its route', async () => {
  await render(<FinanceSection />);
  expect(screen.getByRole('header', { name: t.mobileFinance.section })).toBeTruthy();
  const rows = [
    [t.mobileFinance.rows.summary, '/more/finance/summary'],
    [t.mobileFinance.rows.payouts, '/more/finance/payouts'],
    [t.mobileFinance.rows.expenses, '/more/finance/expenses'],
    [t.mobileFinance.rows.invoices, '/more/finance/invoices'],
  ] as const;
  for (const [name, href] of rows) {
    await fireEvent.press(screen.getByRole('button', { name }));
    expect(router.push).toHaveBeenLastCalledWith(href);
  }
});

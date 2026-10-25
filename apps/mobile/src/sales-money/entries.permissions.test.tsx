import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { FinanceSection } from '@/more/FinanceSection';
import { MoreScreen } from '@/more/MoreScreen';
import { SalesSection } from '@/sales/components/SalesSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const only = (...keys: string[]) => (p: string) => keys.includes(p);
const row = (name: string) => screen.queryByRole('button', { name });
const SALES = ['self.sales', 'self.sales_students', 'self.sales_payments', 'self.sales_earnings', 'self.sales_academy'];

test('«أرباحي» follows self.sales_earnings (web SalesNav) and opens /more/sales/earnings', async () => {
  await render(<SalesSection can={only(...SALES)} />);
  const earnings = row(t.assistantPortal.nav.earnings);
  expect(earnings).toBeTruthy();
  if (earnings) await fireEvent.press(earnings);
  expect(router.push).toHaveBeenLastCalledWith('/more/sales/earnings');
});

test('a salesperson without self.sales_earnings sees no «أرباحي»', async () => {
  await render(<SalesSection can={only('self.sales', 'self.sales_academy')} />);
  expect(row(t.assistantPortal.nav.earnings)).toBeNull();
  expect(row(t.sales.nav.subscriptions)).toBeTruthy();
});

test('an admin with assistantpay.read sees «فريق المبيعات» next to the payouts and it opens the list', async () => {
  await render(<FinanceSection can={only('assistantpay.read', 'payouts.read')} />);
  const assistants = row(t.assistants.nav);
  expect(assistants).toBeTruthy();
  if (assistants) await fireEvent.press(assistants);
  expect(router.push).toHaveBeenLastCalledWith('/more/finance/assistants');
});

test('a non-admin (no assistantpay.read) never sees «فريق المبيعات»; a salesperson sees no admin money', async () => {
  await render(<MoreScreen can={only('payouts.read', 'students.read')} />);
  expect(row(t.assistants.nav)).toBeNull();
  await render(<MoreScreen can={only(...SALES)} />);
  expect(row(t.assistants.nav)).toBeNull();
  expect(row(t.assistantPortal.nav.earnings)).toBeTruthy();
});

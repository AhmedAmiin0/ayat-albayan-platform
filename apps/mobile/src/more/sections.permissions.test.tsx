import { render, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { AdminOpsSection } from './AdminOpsSection';
import { FinanceSection } from './FinanceSection';
import { MoneySection } from './MoneySection';
import { MoreScreen } from './MoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('./sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const only = (...keys: string[]) => (p: string) => keys.includes(p);
const row = (name: string) => screen.queryByRole('button', { name });

test('«المالية» keeps only the rows whose permission is held', async () => {
  await render(<MoneySection can={only('payments.read')} />);
  expect(row(t.mobileMoney.paymentsTitle)).toBeTruthy();
  expect(row(t.mobileMoney.receivablesTitle)).toBeNull();
  expect(row(t.mobileMoney.subscriptionsTitle)).toBeNull();
});

test('«الحسابات» keeps only the rows whose permission is held (summary needs dashboard.read)', async () => {
  await render(<FinanceSection can={only('payouts.read', 'dashboard.read')} />);
  expect(row(t.mobileFinance.rows.payouts)).toBeTruthy();
  expect(row(t.mobileFinance.rows.summary)).toBeTruthy();
  expect(row(t.mobileFinance.rows.expenses)).toBeNull();
  expect(row(t.mobileFinance.rows.invoices)).toBeNull();
});

test('«الإدارة» keeps only the rows whose permission is held', async () => {
  await render(<AdminOpsSection can={only('settings.read')} />);
  expect(row(t.mobileAdmin.rows.settings)).toBeTruthy();
  expect(row(t.mobileAdmin.rows.dashboard)).toBeNull();
  expect(row(t.mobileAdmin.rows.activity)).toBeNull();
});

test('a section with no rows left is not drawn, heading included', async () => {
  await render(<MoreScreen can={only('students.read')} />);
  for (const title of [t.mobileMoney.section, t.mobileFinance.section, t.mobileAdmin.section]) {
    expect(screen.queryByRole('header', { name: title })).toBeNull();
  }
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(row(t.auth.logout)).toBeTruthy();
});

test('an accountant sees «المالية» and «الحسابات» only', async () => {
  await render(<MoreScreen can={only('payments.read', 'payouts.read')} />);
  expect(screen.getByRole('header', { name: t.mobileMoney.section })).toBeTruthy();
  expect(screen.getByRole('header', { name: t.mobileFinance.section })).toBeTruthy();
  expect(screen.queryByRole('header', { name: t.mobileAdmin.section })).toBeNull();
});

test('with every permission (or while /auth/me loads) all three sections show', async () => {
  await render(<MoreScreen />);
  for (const title of [t.mobileMoney.section, t.mobileFinance.section, t.mobileAdmin.section]) {
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
  }
});

import type { Permission } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { signOutDevice } from '@/more/sign-out';
import { SalesMoreScreen } from './SalesMoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const SALES: Permission[] = ['inbox.read', 'self.sales', 'self.sales_academy', 'self.sales_earnings'];
const holds = (keys: Permission[]) => (p: Permission) => keys.includes(p);
const rows = () => [t.sales.nav.teachers, t.sales.nav.live, t.sales.nav.subscriptions, t.assistantPortal.nav.earnings];

beforeEach(() => jest.clearAllMocks());

test('the full sales role: teachers, live lessons, subscriptions, earnings, each in the sales tree', async () => {
  await render(<SalesMoreScreen can={holds(SALES)} />);
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(screen.getByText(t.mobileRoles.salesRole)).toBeTruthy();
  const hrefs = ['/sales/more/teachers', '/sales/more/live', '/sales/more/subscriptions', '/sales/more/earnings'];
  for (const [i, title] of rows().entries()) {
    await fireEvent.press(screen.getByRole('button', { name: title }));
    expect(router.push).toHaveBeenLastCalledWith(hrefs[i]);
  }
});

test('without self.sales_earnings no «أرباحي»; without self.sales_academy no teachers or live lessons', async () => {
  await render(<SalesMoreScreen can={holds(['self.sales'])} />);
  expect(screen.getByRole('button', { name: t.sales.nav.subscriptions })).toBeTruthy();
  for (const gone of [t.assistantPortal.nav.earnings, t.sales.nav.teachers, t.sales.nav.live]) {
    expect(screen.queryByRole('button', { name: gone })).toBeNull();
  }
});

test('never the admin rows or internal meetings (docs/16 row 12b); sign-out is there', async () => {
  await render(<SalesMoreScreen can={holds(SALES)} />);
  for (const gone of [t.mobileClassroom.meetingsRow, t.users.nav, t.pricing.title, t.nav.jobApplicants]) {
    expect(screen.queryByRole('button', { name: gone })).toBeNull();
  }
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalled();
});

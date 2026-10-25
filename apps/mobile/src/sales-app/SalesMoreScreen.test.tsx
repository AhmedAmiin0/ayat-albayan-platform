import type { Permission } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PROFILE_KEY } from '@/account/queries';
import { t } from '@/core/lib/i18n/i18n';
import { profileFixture } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { signOutDevice } from '@/more/sign-out';
import { SalesMoreScreen } from './SalesMoreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/more/sign-out', () => ({ signOutDevice: jest.fn(async () => undefined) }));

const seeded = () => {
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, profileFixture);
  return client;
};

const SALES: Permission[] = ['inbox.read', 'self.sales', 'self.sales_academy', 'self.sales_earnings', 'meetings.read'];
const holds = (keys: Permission[]) => (p: Permission) => keys.includes(p);
const rows = () => [t.sales.nav.teachers, t.sales.nav.live, t.sales.nav.subscriptions, t.assistantPortal.nav.earnings, t.mobileClassroom.meetingsRow];

beforeEach(() => jest.clearAllMocks());

test('the full sales role: teachers, live lessons, subscriptions, earnings, meetings, each in the sales tree', async () => {
  await renderWithQuery(<SalesMoreScreen can={holds(SALES)} />, seeded());
  expect(screen.getByRole('header', { name: t.mobile.more })).toBeTruthy();
  expect(screen.getByText(t.mobileRoles.salesRole)).toBeTruthy();
  const hrefs = ['/sales/more/teachers', '/sales/more/live', '/sales/more/subscriptions', '/sales/more/earnings', '/sales/more/meetings'];
  for (const [i, title] of rows().entries()) {
    await fireEvent.press(screen.getByRole('button', { name: title }));
    expect(router.push).toHaveBeenLastCalledWith(hrefs[i]);
  }
});

test('without self.sales_earnings no «أرباحي»; without self.sales_academy no teachers or live lessons', async () => {
  await renderWithQuery(<SalesMoreScreen can={holds(['self.sales'])} />, seeded());
  expect(screen.getByRole('button', { name: t.sales.nav.subscriptions })).toBeTruthy();
  for (const gone of [t.assistantPortal.nav.earnings, t.sales.nav.teachers, t.sales.nav.live, t.mobileClassroom.meetingsRow]) {
    expect(screen.queryByRole('button', { name: gone })).toBeNull();
  }
});

test('never the admin rows; sign-out is there', async () => {
  await renderWithQuery(<SalesMoreScreen can={holds(SALES)} />, seeded());
  for (const gone of [t.users.nav, t.pricing.title, t.nav.jobApplicants]) {
    expect(screen.queryByRole('button', { name: gone })).toBeNull();
  }
  await fireEvent.press(screen.getByRole('button', { name: t.auth.logout }));
  expect(signOutDevice).toHaveBeenCalled();
});

test('R-ACC-01: «حسابي» with no permission, inside the sales tree (row and header avatar)', async () => {
  await renderWithQuery(<SalesMoreScreen can={() => false} />, seeded());
  await fireEvent.press(screen.getByText(t.account.nav));
  expect(router.push).toHaveBeenLastCalledWith('/sales/more/account');
  await fireEvent.press(screen.getByRole('button', { name: t.account.mobile.open }));
  expect(router.push).toHaveBeenLastCalledWith('/sales/more/account');
});

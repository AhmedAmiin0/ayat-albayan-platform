import type { Permission } from '@ab/catalog';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { PROFILE_KEY, t } from '@ab/mobile-kit';
import { AdminOpsSection } from '@/more/sections/AdminOpsSection';
import { SalesMoreScreen } from '@/sales/app';
import { profileFixture } from '@/test/account';
import { createTestQueryClient, renderWithQuery } from '@/test/query';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const holds = (keys: Permission[]) => (p: Permission) => keys.includes(p);
const row = () => ({ name: t.nav.shortLinks });

beforeEach(() => jest.clearAllMocks());

test('the admin «المزيد»: «الروابط المختصرة» with short_links.manage', async () => {
  await render(<AdminOpsSection can={holds(['short_links.manage', 'short_links.all'])} />);
  await fireEvent.press(screen.getByRole('button', row()));
  expect(router.push).toHaveBeenCalledWith('/more/short-links');
});

test('the sales «المزيد»: the row in the sales tree; none without short_links.manage', async () => {
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, profileFixture);
  await renderWithQuery(
    <SalesMoreScreen can={holds(['self.sales', 'short_links.manage'])} />,
    client,
  );
  await fireEvent.press(screen.getByRole('button', row()));
  expect(router.push).toHaveBeenCalledWith('/sales/more/short-links');
  await render(<AdminOpsSection can={holds(['dashboard.read'])} />);
  expect(screen.queryByRole('button', row())).toBeNull();
});

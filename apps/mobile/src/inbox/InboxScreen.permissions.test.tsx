import { systemPermissionsOf } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { InboxScreen } from './InboxScreen';

let mockHeld: string[] = [];
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: async (path: string) => (path === '/auth/me' ? { role: 'admin', permissions: mockHeld } : { items: [], total: 0, page: 1, pageSize: 25 }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

async function show(held: string[]) {
  mockHeld = held;
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: held });
  await renderWithQuery(<InboxScreen />, client);
}

test('leads.read without inbox.read: the leads list opens, no switcher', async () => {
  await show(['leads.read']);
  expect(await screen.findByRole('header', { name: t.leads.title })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: t.nav.leads })).toBeNull();
});

test('inbox.read without leads.read: threads only, no switcher', async () => {
  await show(['inbox.read']);
  expect(await screen.findByRole('header', { name: t.nav.conversations })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: t.nav.leads })).toBeNull();
});

test('both: the switcher is there', async () => {
  await show(['inbox.read', 'leads.read']);
  expect(await screen.findByRole('tab', { name: t.nav.leads })).toBeTruthy();
});

test('the salesperson («المبيعات», docs/16): the threads list (every chat, the API widens the scope), no leads switcher', async () => {
  await show(systemPermissionsOf('sales'));
  expect(await screen.findByRole('header', { name: t.nav.conversations })).toBeTruthy();
  expect(screen.queryByRole('tab', { name: t.nav.leads })).toBeNull();
});

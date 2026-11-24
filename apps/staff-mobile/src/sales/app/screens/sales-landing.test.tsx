import type { Permission } from '@ab/catalog';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { SalesTabs } from './SalesTabs';

// She lands on today with self.sales_academy, else the inbox; a pushed chat opens the chat.
let mockHeld: Permission[] = [];
jest.mock('@ab/mobile-kit/auth/use-permissions', () => ({
  ...jest.requireActual('@ab/mobile-kit/auth/use-permissions'),
  usePermissions: () => (p: Permission) => mockHeld.includes(p),
}));
jest.mock('@/core/push/usePushRegistration/usePushRegistration', () => ({ usePushRegistration: () => undefined }));
jest.mock('@/core/nav/use-inbox-badge', () => ({ useInboxBadge: () => undefined }));
jest.mock('@/inbox', () => ({ useInboxRealtime: () => undefined }));

const tree = {
  'sales/_layout': SalesTabs,
  'sales/today': () => <Text>today</Text>,
  'sales/inbox/index': () => <Text>inbox</Text>,
  'sales/inbox/thread/[phone]': () => <Text>thread</Text>,
  'sales/students/index': () => <Text>students</Text>,
  'sales/schedule': () => <Text>schedule</Text>,
  'sales/more/index': () => <Text>more</Text>,
};

test('with the academy schedule she lands on «اليوم»', async () => {
  mockHeld = ['inbox.read', 'self.sales', 'self.sales_academy'];
  await renderRouter(tree, { initialUrl: '/sales' });
  expect(screen.getByText('today')).toBeTruthy();
});

test('without it (the gate off) she lands on «المحادثات», as before', async () => {
  mockHeld = ['inbox.read', 'self.sales'];
  await renderRouter(tree, { initialUrl: '/sales' });
  expect(screen.getByText('inbox')).toBeTruthy();
  expect(screen.queryByText('today')).toBeNull();
});

test('a pushed chat still opens the chat, not «اليوم»', async () => {
  mockHeld = ['inbox.read', 'self.sales', 'self.sales_academy'];
  await renderRouter(tree, { initialUrl: '/sales/inbox/thread/%2B10000000000' });
  expect(screen.getByText('thread')).toBeTruthy();
});

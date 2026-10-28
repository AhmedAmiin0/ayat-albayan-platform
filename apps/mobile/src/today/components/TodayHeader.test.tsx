import type { Permission } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { PROFILE_KEY } from '@/account/hooks/queries';
import { t } from '@/core/lib/i18n/i18n';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { TodayHeader } from './TodayHeader';

// The header's bell: the admin's always; the salesperson's only with notifications.push (as «المحادثات»).
let mockHeld: Permission[] = [];
jest.mock('@/auth', () => ({ ...jest.requireActual('@/auth'), useHolds: (p: Permission) => mockHeld.includes(p) }));
jest.mock('@/notifications/BellButton', () => {
  const { Text: MockText } = jest.requireActual<typeof import('react-native')>('react-native');
  return { BellButton: ({ tree }: { tree: string }) => <MockText>{`bell:${tree}`}</MockText> };
});

const now = new Date('2026-10-12T15:10:00.000Z');

test.each([
  ['admin', [], 'bell:admin'],
  ['sales', ['notifications.push'], 'bell:sales'],
] as const)('%s with %j: the bell of its own tree', async (tree, held, bell) => {
  mockHeld = [...held];
  await renderWithQuery(<TodayHeader now={now} tree={tree} />);
  expect(screen.getByText(bell)).toBeTruthy();
});

test('sales without notifications.push: no bell', async () => {
  mockHeld = [];
  await renderWithQuery(<TodayHeader now={now} tree="sales" />);
  expect(screen.queryByText(/^bell:/)).toBeNull();
});

// 15:10Z is 18:10 in Riyadh: the evening, with the first name once the profile is there.
test('the greeting carries the first name from the profile', async () => {
  mockHeld = [];
  const client = createTestQueryClient();
  client.setQueryData(PROFILE_KEY, { full_name: 'أحمد أمين' });
  await renderWithQuery(<TodayHeader now={now} tree="sales" />, client);
  const named = t.today.greetingNamed.replace('{greeting}', t.today.greeting.evening).replace('{name}', 'أحمد');
  expect(screen.getByRole('header', { name: named })).toBeTruthy();
  // Owner 2026-10-28: the tab is already «اليوم», so the screen has no «اليوم» title of its own.
  expect(screen.queryByText(t.today.title)).toBeNull();
  expect(screen.getAllByRole('header')).toHaveLength(1);
});

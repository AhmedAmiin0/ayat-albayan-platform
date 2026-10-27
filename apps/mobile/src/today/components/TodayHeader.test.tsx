import type { Permission } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderWithQuery } from '@/test/query';
import { TodayHeader } from './TodayHeader';

// The header's bell: the admin's always; the salesperson's only with notifications.push (as «المحادثات»).
let mockHeld: Permission[] = [];
jest.mock('@/auth', () => ({ ...jest.requireActual('@/auth'), useHolds: (p: Permission) => mockHeld.includes(p) }));
jest.mock('@/notifications/BellButton', () => ({ BellButton: ({ tree }: { tree: string }) => <Text>{`bell:${tree}`}</Text> }));

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

import { fireEvent, screen } from '@testing-library/react-native';
import { pathKey } from '@/lib/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import type { PendingReportRow, UnpaidRow } from './dashboard-types';
import { PendingRow, UnpaidListRow } from './WorkRows';

let mockHeld: string[] = [];
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: async () => ({ permissions: mockHeld }) }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

const student = { id: 's1', code: 'AB-0183', name: 'هدى' };
const pending: PendingReportRow = {
  lesson_id: 'l1',
  starts_at: '2026-10-05T10:00:00Z',
  status: 'completed',
  teacher: { id: 't1', display_name_ar: 'أبرار' },
  student,
};
const unpaid: UnpaidRow = { id: 'u1', student, package: null, lessons_total: 8, owed: 100, reason: 'owes', currency: 'SAR' };

async function show(ui: React.ReactElement, held: string[]) {
  mockHeld = held;
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: held });
  await renderWithQuery(ui, client);
}

beforeEach(() => mockPush.mockReset());

test.each([
  ['pending report', <PendingRow key="p" row={pending} />, '/students/reports/s1'],
  ['unpaid package', <UnpaidListRow key="u" row={unpaid} />, '/students/s1'],
])('%s row: no tap without students.read', async (_name, row) => {
  await show(row, ['dashboard.read']);
  await fireEvent.press(screen.getByText('هدى'));
  expect(mockPush).not.toHaveBeenCalled();
});

test.each([
  ['pending report', <PendingRow key="p" row={pending} />, '/students/reports/s1'],
  ['unpaid package', <UnpaidListRow key="u" row={unpaid} />, '/students/s1'],
])('%s row: pushes into Students with students.read', async (_name, row, href) => {
  await show(row, ['students.read']);
  await fireEvent.press(screen.getByText('هدى'));
  expect(mockPush).toHaveBeenCalledWith(href);
});

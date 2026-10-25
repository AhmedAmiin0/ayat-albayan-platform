import { fireEvent, screen } from '@testing-library/react-native';
import { pathKey } from '@/core/lib/query/query-keys';
import { t } from '@/core/lib/i18n/i18n';
import { STUDENT, subscription } from '@/payments/fixtures';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { adminTask, receivable } from './fixtures';
import { ReceivableItem } from './ReceivableItem';
import { SubscriptionItem } from './SubscriptionItem';
import { TaskItem } from './TaskItem';

// A hidden Students tab is a protected route: rows that push into it must not offer the tap.
let mockHeld: string[] = [];
const mockApiFetch = jest.fn(async () => ({ permissions: mockHeld }));
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: () => mockApiFetch() }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref), back: jest.fn() } }));

async function show(ui: React.ReactElement, held: string[]) {
  mockHeld = held;
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { role: 'admin', permissions: held });
  await renderWithQuery(ui, client);
}
const owing = subscription({ id: 'a', status: 'active', paid: 50 });

beforeEach(() => mockPush.mockReset());

test('without students.read a receivable row is not a button', async () => {
  await show(<ReceivableItem row={receivable()} />, ['receivables.read']);
  expect(screen.queryByRole('button', { name: new RegExp(STUDENT.name) })).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

test('with students.read it opens the payment form', async () => {
  await show(<ReceivableItem row={receivable()} />, ['students.read']);
  await fireEvent.press(screen.getByText('هدى'));
  expect(mockPush).toHaveBeenCalledWith(`/students/payment/${receivable().student.id}`);
});

test('without students.read a package row has neither the tap nor «سجّل دفعة»', async () => {
  await show(<SubscriptionItem sub={owing} />, ['subscriptions.read']);
  expect(screen.queryByRole('button', { name: new RegExp(t.mobileMoney.recordPayment) })).toBeNull();
  await fireEvent.press(screen.getByText(STUDENT.name));
  expect(mockPush).not.toHaveBeenCalled();
});

test('with students.read the package row and its payment button push', async () => {
  await show(<SubscriptionItem sub={owing} />, ['students.read']);
  await fireEvent.press(screen.getByRole('button', { name: `${t.mobileMoney.recordPayment} · ${STUDENT.name}` }));
  expect(mockPush).toHaveBeenCalledWith(`/students/payment/${STUDENT.id}`);
});

test('a task row opens its student only with students.read', async () => {
  const task = adminTask();
  await show(<TaskItem task={task} />, ['dashboard.read']);
  await fireEvent.press(screen.getByText(task.student?.name ?? ''));
  expect(mockPush).not.toHaveBeenCalled();
});


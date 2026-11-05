import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { thread } from '@/inbox/shared/thread-fixtures';
import { renderWithQuery } from '@/test/query';
import { ChatPickList } from './ChatPickList';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const rows: ThreadView[] = [
  { ...thread, phone_e164: '+201000000001', display_name: 'Umm Sara' },
  { ...thread, phone_e164: '+201000000002', display_name: 'Abu Khalid' },
];
const page = (items: ThreadView[]) => ({ items, total: items.length, page: 1, pageSize: 25 });
const renderItem = ({ item }: { item: ThreadView }) => <AppText>{item.display_name ?? ''}</AppText>;

beforeEach(() => mockApiFetch.mockReset());

test('the newest chats from GET /threads, without the excluded one', async () => {
  mockApiFetch.mockResolvedValue(page(rows));
  await renderWithQuery(
    <ChatPickList renderItem={renderItem} exclude={(th) => th.phone_e164 === '+201000000002'} />,
  );
  expect(await screen.findByText('Umm Sara')).toBeTruthy();
  expect(screen.queryByText('Abu Khalid')).toBeNull();
  expect(mockApiFetch).toHaveBeenCalledWith('/threads?page=1&pageSize=25');
});

test('searching asks the server by name or number', async () => {
  mockApiFetch.mockResolvedValue(page(rows));
  await renderWithQuery(<ChatPickList renderItem={renderItem} exclude={() => false} />);
  await screen.findByText('Umm Sara');
  const field = screen.getByLabelText(t.inbox.forward.search);
  await fireEvent.changeText(field, 'خالد');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(mockApiFetch.mock.calls.some(([p]) => String(p).includes('search='))).toBe(true),
  );
});

test('no chat matches: the empty note', async () => {
  mockApiFetch.mockResolvedValue(page([]));
  await renderWithQuery(<ChatPickList renderItem={renderItem} exclude={() => false} />);
  expect(await screen.findByText(t.inbox.forward.empty)).toBeTruthy();
});

test('a failed read offers a retry', async () => {
  mockApiFetch.mockRejectedValue(new Error('offline'));
  await renderWithQuery(<ChatPickList renderItem={renderItem} exclude={() => false} />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

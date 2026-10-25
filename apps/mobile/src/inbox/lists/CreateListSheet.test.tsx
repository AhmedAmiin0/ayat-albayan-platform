import { fireEvent, screen, within } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { ThreadsList } from '../ThreadsList';
import { answer, page, PAID, withLists } from './list-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const NEW = { id: 'l-new', name: 'متابعة', count: 0, auto_rule: null };
let mockLists = [PAID];
const createButton = () => screen.getByRole('button', { name: t.inbox.lists.create });

async function openSheet() {
  await renderWithQuery(<ThreadsList />);
  await screen.findByRole('tab', { name: PAID.name });
  await fireEvent.press(screen.getByRole('button', { name: `＋ ${t.inbox.lists.new}` }));
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockLists = [PAID];
  const threads = (p: string) => (p.includes('list=') ? page([]) : page());
  mockApiFetch.mockImplementation((p: string) => answer({ me: withLists, lists: mockLists, threads })(p));
});

test('«إنشاء» stays off until the name has a character; spaces alone do not count', async () => {
  await openSheet();
  expect(createButton().props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), '   ');
  expect(createButton().props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(createButton());
  expect(mockApiSend).not.toHaveBeenCalled();
});

test('a taken name and the 30-list limit show inline, the sheet stays open', async () => {
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'list_name_taken' }));
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'list_limit' }));
  await openSheet();
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), ' بانتظار الدفع ');
  await fireEvent.press(createButton());
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/chat-lists', { name: 'بانتظار الدفع' });
  expect((await screen.findByRole('alert')).props.children).toBe(t.inbox.lists.nameTaken);
  await fireEvent.press(createButton());
  expect(await screen.findByText(t.inbox.lists.limit)).toBeTruthy();
  expect(screen.getByLabelText(t.inbox.lists.name)).toBeTruthy();
});

test('created: the sheet closes and the new list is the active chip, filtering the chats', async () => {
  mockApiSend.mockResolvedValueOnce(NEW);
  await openSheet();
  mockLists = [PAID, NEW];
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), NEW.name);
  await fireEvent.press(createButton());
  const chips = within(screen.getByLabelText(t.inbox.lists.rowLabel));
  expect(await chips.findByRole('tab', { name: NEW.name, selected: true })).toBeTruthy();
  expect(screen.queryByLabelText(t.inbox.lists.name)).toBeNull();
  expect(await screen.findByText(t.inbox.lists.empty)).toBeTruthy();
  expect(mockApiFetch).toHaveBeenCalledWith(`/threads?list=${NEW.id}&page=1&pageSize=25`);
});

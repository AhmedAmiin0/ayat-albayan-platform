import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { detail, inbound } from '../thread-fixtures';
import { ThreadScreen } from '../ThreadScreen';
import { answer, PAID, TRIAL, withLists } from './list-fixtures';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  router: { back: jest.fn(), canGoBack: () => true, push: jest.fn() },
  useLocalSearchParams: () => ({ phone: '+966552147730' }),
}));

const MEMBERS = '/threads/%2B966552147730';
let mockLists = [PAID, TRIAL];
const box = (name: string) => screen.getByRole('checkbox', { name });

async function openSheet() {
  // The chat is in «بانتظار الدفع» (the first page's `lists`), not in «تجريبية».
  const threads = () => detail([inbound], { lists: [{ id: PAID.id, name: PAID.name }] });
  mockApiFetch.mockImplementation((p: string) => answer({ me: withLists, lists: mockLists, threads })(p));
  await renderWithQuery(<ThreadScreen />);
  await screen.findByText(inbound.body ?? '');
  await fireEvent.press(await screen.findByRole('button', { name: t.inbox.lists.title }));
  await screen.findByRole('checkbox', { name: TRIAL.name });
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockLists = [PAID, TRIAL];
});

test('the checklist: every list, checked where the chat already is, with its count', async () => {
  await openSheet();
  expect(screen.getByText(t.inbox.lists.chatLists)).toBeTruthy();
  expect(box(PAID.name).props.accessibilityState).toEqual({ checked: true });
  expect(box(TRIAL.name).props.accessibilityState).toEqual({ checked: false });
  expect(screen.getByText(t.inbox.lists.count.replace('{n}', '1'))).toBeTruthy();
});

test('a tap saves at once (optimistic) with PUT / DELETE on the chat’s number', async () => {
  await openSheet();
  mockApiSend.mockReturnValueOnce(new Promise(() => undefined));
  await fireEvent.press(box(TRIAL.name));
  // The optimistic cache write lands a tick after the press (TanStack runs onMutate asynchronously).
  await waitFor(() => expect(box(TRIAL.name).props.accessibilityState).toEqual({ checked: true }));
  expect(mockApiSend).toHaveBeenCalledWith('PUT', `/chat-lists/${TRIAL.id}${MEMBERS}`);
  mockApiSend.mockResolvedValueOnce(undefined);
  await fireEvent.press(box(PAID.name));
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('DELETE', `/chat-lists/${PAID.id}${MEMBERS}`));
});

test('a refused toggle rolls back with «تعذر حفظ التغيير»', async () => {
  await openSheet();
  mockApiSend.mockRejectedValueOnce(new ApiError(500));
  await fireEvent.press(box(TRIAL.name));
  expect(await screen.findByText(t.inbox.lists.saveError)).toBeTruthy();
  await waitFor(() => expect(box(TRIAL.name).props.accessibilityState).toEqual({ checked: false }));
  expect(box(PAID.name).props.accessibilityState).toEqual({ checked: true });
});

test('«قائمة جديدة» creates the list and adds this chat in one go; a taken name shows inline', async () => {
  await openSheet();
  await fireEvent.press(screen.getByRole('button', { name: `＋ ${t.inbox.lists.new}` }));
  mockApiSend.mockRejectedValueOnce(new ApiError(409, { code: 'list_name_taken' }));
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), PAID.name);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.create }));
  expect(await screen.findByText(t.inbox.lists.nameTaken)).toBeTruthy();
  const made = { id: 'l-new', name: 'متابعة', count: 0 };
  mockApiSend.mockResolvedValueOnce(made).mockReturnValueOnce(new Promise(() => undefined));
  mockLists = [PAID, TRIAL, made];
  await fireEvent.changeText(screen.getByLabelText(t.inbox.lists.name), made.name);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.lists.create }));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/chat-lists', { name: made.name });
  await waitFor(() => expect(mockApiSend).toHaveBeenLastCalledWith('PUT', `/chat-lists/${made.id}${MEMBERS}`));
  await waitFor(async () =>
    expect((await screen.findByRole('checkbox', { name: made.name })).props.accessibilityState).toEqual({ checked: true }),
  );
});

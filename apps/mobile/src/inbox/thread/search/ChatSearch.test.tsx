import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { BackHandler, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { chat, found, page, stub } from './search.fixture';
import { MID, NEW, OLD } from './search.data';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (path: string) => mockApiFetch(path),
}));

// docs/37: a hit outside the shown rows re-anchors (`?msg=`, one request); a close leaves it.
const mockAnchorAt = jest.fn();
const mockLeave = jest.fn();
const mockMsg = jest.fn((): string | undefined => undefined);
jest.mock('@/inbox/thread/anchor', () => ({
  ...jest.requireActual('@/inbox/thread/anchor'),
  anchorAt: (id: string) => mockAnchorAt(id),
  leaveAnchor: () => mockLeave(),
  useAnchorParam: () => mockMsg(),
}));

const words = t.inbox.chatSearch;
const centred = (index: number) => ({ index, animated: true, viewPosition: 0.5 });
const counter = (n: number, m: number) =>
  words.counter.replace('{n}', String(n)).replace('{m}', String(m));
const answer = (hits: unknown) => (path: string) =>
  Promise.resolve(path.includes('/search?') ? hits : { id: 'u1', role: 'admin', permissions: [] });

async function openAndType(fetchNextPage: jest.Mock, text: string) {
  const view = await renderWithQuery(chat(stub([[MID, NEW]], fetchNextPage)));
  await act(async () => undefined);
  await fireEvent.press(screen.getByRole('button', { name: words.open }));
  await fireEvent.changeText(screen.getByLabelText(words.label), text);
  return view;
}

beforeEach(() => jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined));
afterEach(() => jest.restoreAllMocks());

test('«بحث» turns the header into the field; typing asks once settled and jumps to the newest hit', async () => {
  mockApiFetch.mockImplementation(answer(found([NEW, OLD])));
  await openAndType(jest.fn(), 'اسلام');
  expect(screen.getByTestId('chat-search-bar')).toBeTruthy();
  expect(screen.queryByTestId('chat-title')).toBeNull();
  expect(await screen.findByText(counter(1, 2), {}, { timeout: 5000 })).toBeTruthy();
  const asked = mockApiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('/search?'));
  expect(asked).toEqual([`/threads/%2B966552147730/search?q=${encodeURIComponent('اسلام')}`]);
  // Newest first: NEW is index 1 (MID is newer), centred.
  expect(FlatList.prototype.scrollToIndex).toHaveBeenCalledWith(centred(1));
  const marks = screen.getAllByTestId('search-mark').map((m) => m.props.children);
  expect(marks).toEqual(['إسلام']);
});

test('↑ to an older hit not loaded: the window around it, one request, no page-by-page seek', async () => {
  mockApiFetch.mockImplementation(answer(found([NEW, OLD])));
  const more = jest.fn();
  await openAndType(more, 'اسلام');
  await screen.findByText(counter(1, 2), {}, { timeout: 5000 });
  await fireEvent.press(screen.getByRole('button', { name: words.older }));
  expect(screen.getByText(counter(2, 2))).toBeTruthy();
  expect(mockAnchorAt).toHaveBeenCalledWith(OLD.id);
  expect(more).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: words.newer }));
  expect(screen.getByText(counter(1, 2))).toBeTruthy();
  expect(FlatList.prototype.scrollToIndex).toHaveBeenLastCalledWith(centred(1));
});

test('Android back closes it: the header returns, the list goes to the newest message', async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  mockApiFetch.mockImplementation(answer(found([NEW])));
  await openAndType(jest.fn(), 'اسلام');
  await screen.findByText(counter(1, 1), {}, { timeout: 5000 });
  const onBack = listen.mock.calls.at(-1)?.[1];
  await act(async () => {
    expect(onBack?.(undefined as never)).toBe(true);
  });
  expect(screen.queryByTestId('chat-search-bar')).toBeNull();
  expect(within(screen.getByTestId('chat-header')).getByTestId('chat-title')).toBeTruthy();
  expect(toOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  expect(screen.queryAllByTestId('search-mark')).toHaveLength(0);
});

test('no hit: «لا توجد نتائج», both arrows off', async () => {
  mockApiFetch.mockImplementation(answer(found([])));
  await openAndType(jest.fn(), 'وداعا');
  expect(await screen.findByText(words.empty, {}, { timeout: 5000 })).toBeTruthy();
  for (const name of [words.older, words.newer]) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
});

test('closing while the chat shows the window around a hit: back to the live chat', async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  mockApiFetch.mockImplementation(answer(found([NEW, OLD])));
  mockMsg.mockReturnValue(OLD.id);
  await openAndType(jest.fn(), 'اسلام');
  await screen.findByText(counter(1, 2), {}, { timeout: 5000 });
  await act(async () => {
    listen.mock.calls.at(-1)?.[1]?.(undefined as never);
  });
  expect(mockLeave).toHaveBeenCalledTimes(1);
  mockMsg.mockReturnValue(undefined);
});

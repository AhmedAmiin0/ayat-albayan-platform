import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { BackHandler, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { chat, found, MID, NEW, OLD, page, stub } from './search.fixture';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (path: string) => mockApiFetch(path),
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
  expect(await screen.findByText(counter(1, 2), {}, { timeout: 2000 })).toBeTruthy();
  const asked = mockApiFetch.mock.calls.map(([p]) => String(p)).filter((p) => p.includes('/search?'));
  expect(asked).toEqual([`/threads/%2B966552147730/search?q=${encodeURIComponent('اسلام')}`]);
  // Newest first: NEW is index 1 (MID is newer), centred.
  expect(FlatList.prototype.scrollToIndex).toHaveBeenCalledWith(centred(1));
  const marks = screen.getAllByTestId('search-mark').map((m) => m.props.children);
  expect(marks).toEqual(['إسلام']);
});

test('↑ goes to an older hit: older pages load, the list goes to it once it renders; ↓ back', async () => {
  mockApiFetch.mockImplementation(answer(found([NEW, OLD])));
  const more = jest.fn().mockResolvedValue(page([[MID, NEW], [OLD]], false));
  const view = await openAndType(more, 'اسلام');
  await screen.findByText(counter(1, 2), {}, { timeout: 2000 });
  await fireEvent.press(screen.getByRole('button', { name: words.older }));
  expect(screen.getByText(counter(2, 2))).toBeTruthy();
  expect(more).toHaveBeenCalledWith({ cancelRefetch: false });
  await view.rerender(chat(stub([[MID, NEW], [OLD]], more, false)));
  expect(FlatList.prototype.scrollToIndex).toHaveBeenLastCalledWith(centred(2));
  expect(screen.getByRole('button', { name: words.older })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: words.newer }));
  expect(screen.getByText(counter(1, 2))).toBeTruthy();
});

test('Android back closes it: the header returns, the list goes to the newest message', async () => {
  const listen = jest.spyOn(BackHandler, 'addEventListener');
  const toOffset = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => undefined);
  mockApiFetch.mockImplementation(answer(found([NEW])));
  await openAndType(jest.fn(), 'اسلام');
  await screen.findByText(counter(1, 1), {}, { timeout: 2000 });
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
  expect(await screen.findByText(words.empty, {}, { timeout: 2000 })).toBeTruthy();
  for (const name of [words.older, words.newer]) {
    expect(screen.getByRole('button', { name })).toBeDisabled();
  }
});

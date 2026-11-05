import type { MessageSearchHit } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { hitHref, MessageHits } from './MessageHits';
import type { MessageHitsState } from './use-message-hits';

// docs/37 NEW 1: «الرسائل» under the chats, a hit opens its chat at the message (`?msg=`).

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const HIT: MessageSearchHit = {
  id: 'b2222222-2222-4222-8222-222222222222',
  created_at: '2026-03-01T08:00:00Z',
  snippet: 'موعد درس الغد',
  phone_e164: '+966500000123',
  display_name: 'أم سلمى',
};
const ADMIN = { kind: 'admin' } as const;

const state = (patch: Partial<MessageHitsState> = {}): MessageHitsState => ({
  asked: true,
  hits: [HIT],
  searching: false,
  failed: false,
  more: false,
  loadMore: jest.fn(),
  ...patch,
});

const show = (q: string, found: MessageHitsState) =>
  render(
    <MessageHits q={q} found={found} mode={ADMIN} base="" now={new Date('2026-03-02T09:00:00Z')} />,
  );

beforeEach(() => jest.clearAllMocks());

test('the section, the chat name, the marked words and «عرض مزيد» while a cursor remains', async () => {
  const found = state({ more: true });
  await show('درس', found);
  expect(screen.getByText(t.inbox.messageSearch.section)).toBeTruthy();
  expect(screen.getByText('أم سلمى')).toBeTruthy();
  expect(screen.getAllByTestId('search-mark').map((m) => m.props.children)).toEqual(['درس']);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.messageSearch.more }));
  expect(found.loadMore).toHaveBeenCalled();
});

test('a tap opens that chat at the message', async () => {
  await show('درس', state());
  await fireEvent.press(screen.getByTestId('message-hit'));
  expect(router.push).toHaveBeenCalledWith(
    `/inbox/thread/${encodeURIComponent(HIT.phone_e164)}?msg=${HIT.id}`,
  );
});

test('the href per tree: admin, sales and teacher', () => {
  const phone = encodeURIComponent(HIT.phone_e164);
  expect(hitHref(HIT, { mode: ADMIN, base: '' })).toBe(`/inbox/thread/${phone}?msg=${HIT.id}`);
  expect(hitHref(HIT, { mode: ADMIN, base: '/sales' })).toBe(
    `/sales/inbox/thread/${phone}?msg=${HIT.id}`,
  );
  const teacher = { kind: 'teacher', teacherId: 't1' } as const;
  expect(hitHref(HIT, { mode: teacher, base: '' })).toBe(`/teacher/chats/${phone}?msg=${HIT.id}`);
});

test('1–2 characters: the hint only; empty box: nothing', async () => {
  await show('در', state({ asked: false, hits: [] }));
  expect(screen.getByText(t.inbox.messageSearch.hint)).toBeTruthy();
  expect(screen.queryByText(t.inbox.messageSearch.section)).toBeNull();
  await show('', state({ asked: false, hits: [] }));
  expect(screen.queryAllByText(t.inbox.messageSearch.hint)).toHaveLength(0);
});

test('searching, empty and failed lines; no «عرض مزيد» at the end', async () => {
  await show('درس', state({ searching: true, hits: [] }));
  expect(screen.getByText(t.inbox.chatSearch.searching)).toBeTruthy();
  await show('درس', state({ hits: [] }));
  expect(screen.getByText(t.inbox.messageSearch.empty)).toBeTruthy();
  await show('درس', state({ failed: true, hits: [] }));
  expect(screen.getByText(t.inbox.messageSearch.failed)).toBeTruthy();
  expect(screen.queryByText(t.inbox.messageSearch.more)).toBeNull();
});

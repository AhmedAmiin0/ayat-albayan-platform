import { formatPhone, type MessageSearchHit } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { hitHref, MessageHits } from './MessageHits';
import type { ThreadMode } from '@/inbox/thread/hooks/thread-mode';
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

const TEACHER = { kind: 'teacher', teacherId: 't1' } as const;

const show = (q: string, found: MessageHitsState, mode: ThreadMode = ADMIN) =>
  render(
    <MessageHits q={q} found={found} mode={mode} base="" now={new Date('2026-03-02T09:00:00Z')} />,
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
  expect(hitHref(HIT, { mode: TEACHER, base: '' })).toBe(`/teacher/chats/${phone}?msg=${HIT.id}`);
});

test('1–2 characters: no section under the chats (the hint is the list header)', async () => {
  await show('در', state({ asked: false, hits: [] }));
  expect(screen.queryByText(t.inbox.messageSearch.section)).toBeNull();
  expect(screen.queryByText(t.inbox.messageSearch.hint)).toBeNull();
});

test('the hits sit in one inset card; a row reads its name, date and snippet', async () => {
  await show('درس', state());
  expect(screen.getByTestId('message-hits-card')).toBeTruthy();
  const label = screen.getByTestId('message-hit').props.accessibilityLabel as string;
  expect(label.split(' · ')).toHaveLength(3);
  expect(label).toContain('أم سلمى');
  expect(label).toContain(HIT.snippet);
});

test('a teacher never sees the family number: an unnamed chat reads «رقم غير مسجل»', async () => {
  await show('درس', state({ hits: [{ ...HIT, display_name: null }] }), TEACHER);
  expect(screen.getByText(t.inbox.unknownNumber)).toBeTruthy();
  expect(screen.queryByText(formatPhone(HIT.phone_e164), { exact: false })).toBeNull();
  await show('درس', state({ hits: [{ ...HIT, display_name: null }] }));
  expect(screen.getByText(formatPhone(HIT.phone_e164), { exact: false })).toBeTruthy();
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

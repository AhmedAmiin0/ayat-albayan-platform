import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ChatListsBar } from './ChatListsBar';
import { DeleteListDialog } from './DeleteListDialog';
import { EditListDialog } from './EditListDialog';
import { ThreadListsDialog } from './ThreadListsDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const L = t.inbox.lists;
const SUBSCRIBED = { id: '0c000000-0000-4000-8000-000000000011', name: 'مشترك', count: 4, auto_rule: 'subscribed' as const };
const TEACHERS = { id: '0c000000-0000-4000-8000-000000000012', name: 'معلم', count: 2, auto_rule: 'teachers' as const };
const HAND = { id: '0c000000-0000-4000-8000-000000000013', name: 'بانتظار الدفع', count: 1, auto_rule: null };
const LISTS = [SUBSCRIBED, TEACHERS, HAND];

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('automatic lists «تُحدَّث تلقائيًا» (docs/22 «القوائم التلقائية»)', () => {
  it.each([
    [SUBSCRIBED.id, L.autoRule.subscribed],
    [TEACHERS.id, L.autoRule.teachers],
  ])('the chip row explains the shown automatic list %s', async (id, line) => {
    routeFetch(apiFetch, [['/chat-lists', LISTS]]);
    renderWithClient(<ChatListsBar active={id} onPick={vi.fn()} />);
    expect(await screen.findByText(line)).toBeTruthy();
    expect(screen.getByText(L.auto)).toBeTruthy();
  });

  it.each([
    ['a hand-kept list', HAND.id],
    ['«الكل»', undefined],
  ])('%s shows no note', async (_what, active) => {
    routeFetch(apiFetch, [['/chat-lists', LISTS]]);
    renderWithClient(<ChatListsBar active={active} onPick={vi.fn()} />);
    await screen.findByText(HAND.name);
    expect(screen.queryByTestId('auto-list-chip')).toBeNull();
  });

  it('the thread checklist marks automatic lists, keeps the name as the checkbox name, and still toggles by hand', async () => {
    routeFetch(apiFetch, [['/chat-lists', LISTS]]);
    apiSend.mockResolvedValue(undefined);
    renderWithClient(<ThreadListsDialog phone="+966501234567" lists={[{ id: SUBSCRIBED.id, name: SUBSCRIBED.name }]} onClose={vi.fn()} />);
    const box = await screen.findByRole<HTMLInputElement>('checkbox', { name: SUBSCRIBED.name });
    expect(box.checked).toBe(true);
    expect(box.getAttribute('aria-describedby')).toBe(`auto-chip-${SUBSCRIBED.id} auto-${SUBSCRIBED.id}`);
    expect(document.getElementById(`auto-${SUBSCRIBED.id}`)?.textContent).toBe(L.autoRule.subscribed);
    expect(screen.getAllByTestId('auto-list-chip')).toHaveLength(2);
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: HAND.name }).getAttribute('aria-describedby')).toBeNull();
    fireEvent.click(box);
    expect(apiSend).toHaveBeenCalledWith('DELETE', expect.stringContaining(SUBSCRIBED.id));
  });

  it('«تعديل القائمة» of an automatic list says who is added; rename and delete stay', () => {
    renderWithClient(<EditListDialog list={TEACHERS} onClose={vi.fn()} onDeleted={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(L.autoRule.teachers)).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: L.delete })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: L.save })).toBeTruthy();
  });

  it.each([
    ['an automatic list warns', TEACHERS, true],
    ['a hand-kept list does not warn', HAND, false],
  ])('the delete confirmation: %s that automatic adding stops', (_what, list, warns) => {
    renderWithClient(<DeleteListDialog list={list} onClose={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.getByText(L.deleteNote)).toBeTruthy();
    expect(screen.queryByText(L.autoDeleteNote) !== null).toBe(warns);
  });
});

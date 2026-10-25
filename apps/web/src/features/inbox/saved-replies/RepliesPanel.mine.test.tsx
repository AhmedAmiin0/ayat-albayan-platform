import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearDraft } from '../composer/lib/draft-store';
import { PHONE, thread } from '../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { MINE, PROFILE, REPLIES } from './fixture';
import { ReplyComposer } from './ReplyComposer';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearDraft(PHONE);
});

async function openMine(replies = REPLIES) {
  routeFetch(apiFetch, [
    ['/saved-replies', replies],
    ['/me/profile', PROFILE],
  ]);
  renderWithClient(<ReplyComposer thread={thread({ session_open: true })} context={{}} leading={null} />);
  fireEvent.click(screen.getByRole('button', { name: S.open }));
  await screen.findByRole('listbox');
  fireEvent.click(screen.getByRole('tab', { name: S.tabMine }));
}

describe('«ردودي» in the picker', () => {
  it('adds a personal reply (scope mine)', async () => {
    apiSend.mockResolvedValue(MINE);
    await openMine();
    fireEvent.click(screen.getByRole('button', { name: S.add }));
    const dialog = await screen.findByRole('dialog', { name: S.addTitle });
    fireEvent.change(within(dialog).getByRole('textbox', { name: new RegExp(S.fieldTitle) }), { target: { value: 'شكر' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: new RegExp(S.fieldBody) }), { target: { value: 'شكرًا لكم' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/saved-replies', { scope: 'mine', title: 'شكر', body: 'شكرًا لكم' }));
  });

  it('each row edits and deletes its own reply, whatever row is highlighted', async () => {
    const other = { ...MINE, id: 'r-4', title: 'تذكير', body: 'موعد الحلقة غدًا', position: 1 };
    await openMine([...REPLIES, other]);
    const second = await screen.findByRole('option', { name: /تذكير/ });
    // The pointer crosses row 2 on its way to row 1's buttons: the highlight moves, the target does not.
    fireEvent.mouseEnter(second);
    expect(second.getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: S.editReply.replace('{title}', 'متابعة') }));
    const dialog = await screen.findByRole('dialog', { name: S.editTitle });
    expect(within(dialog).getByRole<HTMLInputElement>('textbox', { name: new RegExp(S.fieldTitle) }).value).toBe('متابعة');
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    fireEvent.click(screen.getByRole('button', { name: S.deleteReply.replace('{title}', 'متابعة') }));
    expect(await screen.findByRole('dialog', { name: S.deleteTitle.replace('{title}', 'متابعة') })).toBeTruthy();
  });

  it('the row buttons sit outside the options, and only under «ردودي»', async () => {
    await openMine();
    const option = await screen.findByRole('option', { name: /متابعة/ });
    expect(within(option).queryByRole('button')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: S.tabShared }));
    await screen.findByRole('option', { name: /الترحيب/ });
    expect(screen.queryByRole('button', { name: S.editReply.replace('{title}', 'الترحيب') })).toBeNull();
  });

  it('says so when there is none yet', async () => {
    await openMine(REPLIES.filter((r) => r.scope === 'shared'));
    expect(await screen.findByText(S.emptyMine)).toBeTruthy();
  });
});

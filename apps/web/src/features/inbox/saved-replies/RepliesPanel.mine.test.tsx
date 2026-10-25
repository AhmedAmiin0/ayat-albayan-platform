import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { clearDraft } from '../draft-store';
import { PHONE, thread } from '../inbox-fixture';
import { renderWithClient, routeFetch } from '../test-utils';
import { MINE, PROFILE, REPLIES } from './fixture';
import { ReplyComposer } from './ReplyComposer';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

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

  it('edits and deletes the highlighted reply', async () => {
    await openMine();
    await screen.findByRole('option', { name: /متابعة/ });
    fireEvent.click(screen.getByRole('button', { name: S.editReply.replace('{title}', 'متابعة') }));
    expect(await screen.findByRole('dialog', { name: S.editTitle })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    fireEvent.click(screen.getByRole('button', { name: S.deleteReply.replace('{title}', 'متابعة') }));
    expect(await screen.findByRole('dialog', { name: S.deleteTitle.replace('{title}', 'متابعة') })).toBeTruthy();
  });

  it('says so when there is none yet', async () => {
    await openMine(REPLIES.filter((r) => r.scope === 'shared'));
    expect(await screen.findByText(S.emptyMine)).toBeTruthy();
  });
});

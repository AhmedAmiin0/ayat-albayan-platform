import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRICES, REPLIES, savedReply } from '@/features/messaging/inbox/saved-replies/fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { SavedRepliesTab } from './SavedRepliesTab';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'x' } } }) } },
}));

const S = t.savedReplies;

function show(permissions: string[]) {
  routeFetch(apiFetch, [
    ['/auth/me', { id: 'u1', email: null, role: 'admin', permissions }],
    ['/saved-replies', REPLIES],
  ]);
  renderWithClient(<SavedRepliesTab />);
}
const rows = async () => (await screen.findAllByRole('row')).slice(1);
/** /auth/me answered: the manage buttons are in. */
const managed = () => screen.findByRole('button', { name: S.add });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«التواصل» → «الردود السريعة»', () => {
  it('lists the shared replies only, in order, with the file (no scope column)', async () => {
    show(['saved_replies.manage']);
    const list = await rows();
    expect(list.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['الترحيب', 'الأسعار']);
    expect(within(list[1] as HTMLElement).getByText(S.hasAttachment)).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).not.toContain('مشترك');
    expect(screen.queryByText('متابعة')).toBeNull();
  });

  it('reorders with the up / down buttons (the ends are disabled)', async () => {
    apiSend.mockResolvedValue([PRICES, savedReply()]);
    show(['saved_replies.manage']);
    await rows();
    await managed();
    const up = (title: string) => screen.getByRole<HTMLButtonElement>('button', { name: S.moveUp.replace('{title}', title) });
    expect(up('الترحيب').disabled).toBe(true);
    fireEvent.click(up('الأسعار'));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `/saved-replies/${PRICES.id}/move`, { direction: 'up' }));
    await waitFor(async () => expect((await rows()).map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['الأسعار', 'الترحيب']));
  });

  it('«رد جديد» opens the editor for a shared reply; edit opens it filled', async () => {
    show(['saved_replies.manage']);
    await rows();
    await managed();
    fireEvent.click(screen.getByRole('button', { name: S.add }));
    expect(await screen.findByRole('dialog', { name: S.addTitle })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    fireEvent.click(screen.getByRole('button', { name: S.editReply.replace('{title}', 'الأسعار') }));
    const dialog = await screen.findByRole('dialog', { name: S.editTitle });
    expect(within(dialog).getByDisplayValue('الأسعار')).toBeTruthy();
  });

  it('delete asks first, then deletes', async () => {
    apiSend.mockResolvedValue(undefined);
    show(['saved_replies.manage']);
    await rows();
    await managed();
    fireEvent.click(screen.getByRole('button', { name: S.deleteReply.replace('{title}', 'الأسعار') }));
    const dialog = await screen.findByRole('dialog', { name: S.deleteTitle.replace('{title}', 'الأسعار') });
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: S.deleteYes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', `/saved-replies/${PRICES.id}`));
  });

  it('without saved_replies.manage: read-only (no add, reorder, edit or delete)', async () => {
    show([]);
    await rows();
    await screen.findByText(S.readOnly);
    expect(screen.queryByRole('button', { name: S.add })).toBeNull();
    expect(screen.queryByRole('button', { name: S.moveUp.replace('{title}', 'الأسعار') })).toBeNull();
    expect(screen.queryByRole('button', { name: S.deleteReply.replace('{title}', 'الأسعار') })).toBeNull();
  });

  it('a failed load says so and «أعد المحاولة» loads it again', async () => {
    routeFetch(apiFetch, [['/auth/me', { id: 'u1', email: null, role: 'admin', permissions: [] }]]);
    renderWithClient(<SavedRepliesTab />);
    const retry = await screen.findByRole('button', { name: S.retry });
    expect(screen.getByText(S.loadError)).toBeTruthy();
    routeFetch(apiFetch, [
      ['/auth/me', { id: 'u1', email: null, role: 'admin', permissions: [] }],
      ['/saved-replies', REPLIES],
    ]);
    fireEvent.click(retry);
    expect((await rows()).length).toBeGreaterThan(0);
  });
});

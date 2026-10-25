import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { clearDraft } from '../draft-store';
import { PHONE, thread } from '../inbox-fixture';
import { renderWithClient, routeFetch } from '../test-utils';
import { PROFILE, REPLIES } from './fixture';
import { ReplyComposer } from './ReplyComposer';
import { setStaged } from './staged-store';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;
const OPEN = { session_open: true, last_inbound_at: new Date().toISOString(), display_name: 'أم أحمد' };

function show() {
  routeFetch(apiFetch, [
    ['/saved-replies', REPLIES],
    ['/me/profile', PROFILE],
  ]);
  renderWithClient(<ReplyComposer thread={thread(OPEN)} context={{ firstStudentName: 'أحمد' }} leading={null} />);
}
const box = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
const type = (text: string) => fireEvent.change(box(), { target: { value: text } });
const options = async () => within(await screen.findByRole('listbox', { name: S.listLabel })).getAllByRole('option');

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearDraft(PHONE);
  setStaged(PHONE, null);
});

describe('ReplyComposer: «/» opens the picker', () => {
  it('opens on «/» at the start or after a newline, not inside a sentence', async () => {
    show();
    type('نعم/لا');
    expect(screen.queryByRole('listbox')).toBeNull();
    type('سطر\n/');
    expect(await options()).toHaveLength(2);
    type('/');
    expect(await options()).toHaveLength(2);
  });

  it('the text after «/» searches title and text; the tabs switch to «ردودي»', async () => {
    show();
    type('/قائمة');
    expect((await options()).map((o) => o.textContent)).toEqual([expect.stringContaining('الأسعار')]);
    type('/');
    await options();
    fireEvent.click(screen.getByRole('tab', { name: S.tabMine }));
    expect((await options()).map((o) => o.textContent)).toEqual([expect.stringContaining('متابعة')]);
  });

  it('Enter fills the box with the placeholders resolved and sends nothing; ↓ moves', async () => {
    show();
    type('/');
    await options();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/me/profile'));
    fireEvent.keyDown(box(), { key: 'Enter' });
    await waitFor(() => expect(box().value).toBe('السلام عليكم أم أحمد، معك سارة.'));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
    type('/');
    await options();
    fireEvent.keyDown(box(), { key: 'ArrowDown' });
    fireEvent.keyDown(box(), { key: 'Enter' });
    expect(box().value).toBe('تجد قائمة أسعار أحمد مرفقة.');
    expect(screen.getByText('الأسعار.pdf')).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('Esc closes it, and more typing after the same «/» does not reopen it', async () => {
    show();
    type('/');
    await options();
    fireEvent.keyDown(box(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    type('/ت');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('ReplyComposer: the button', () => {
  it('opens the picker with its own search; a click fills the box', async () => {
    show();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/me/profile'));
    fireEvent.click(screen.getByRole('button', { name: S.open }));
    const search = await screen.findByRole('combobox', { name: S.search });
    fireEvent.change(search, { target: { value: 'معك' } });
    const [first] = await options();
    expect(first?.textContent).toContain('الترحيب');
    if (first) fireEvent.mouseDown(first);
    await waitFor(() => expect(box().value).toBe('السلام عليكم أم أحمد، معك سارة.'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Esc in its search closes it and puts the focus back in the message box', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: S.open }));
    const search = await screen.findByRole('combobox', { name: S.search });
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('combobox')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(box()));
  });

  it('a failed load says so, with «أعد المحاولة»', async () => {
    routeFetch(apiFetch, [['/me/profile', PROFILE]]);
    renderWithClient(<ReplyComposer thread={thread(OPEN)} context={{}} leading={null} />);
    fireEvent.click(screen.getByRole('button', { name: S.open }));
    expect(await screen.findByText(S.loadError)).toBeTruthy();
    routeFetch(apiFetch, [['/saved-replies', REPLIES], ['/me/profile', PROFILE]]);
    fireEvent.click(screen.getByRole('button', { name: S.retry }));
    expect(await options()).toHaveLength(2);
  });
});

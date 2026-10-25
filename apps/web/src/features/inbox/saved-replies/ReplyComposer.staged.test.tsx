import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearDraft } from '../draft-store';
import { message, PHONE, thread } from '../inbox-fixture';
import { renderWithClient, routeFetch } from '../test-utils';
import { PROFILE, REPLIES } from './fixture';
import { ReplyComposer } from './ReplyComposer';
import { getStaged, setStaged } from './staged-store';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const S = t.savedReplies;
const OPEN = { session_open: true, last_inbound_at: new Date().toISOString() };

function show() {
  routeFetch(apiFetch, [
    ['/saved-replies', REPLIES],
    ['/me/profile', PROFILE],
  ]);
  renderWithClient(<ReplyComposer thread={thread(OPEN)} context={{}} leading={null} />);
}
const box = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: t.inbox.composer.messageLabel });
async function pick(search: string) {
  fireEvent.change(box(), { target: { value: `/${search}` } });
  const [option] = within(await screen.findByRole('listbox')).getAllByRole('option');
  if (option) fireEvent.mouseDown(option);
}
const stageCalls = () => apiSend.mock.calls.filter((c) => String(c[1]).endsWith('/stage'));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
  clearDraft(PHONE);
  setStaged(PHONE, null);
});

describe('ReplyComposer: which file is staged', () => {
  it('a pick that replaces the box without a file drops the earlier reply\'s file', async () => {
    show();
    await pick('الأسعار');
    expect(screen.getByText('الأسعار.pdf')).toBeTruthy();
    await pick('الترحيب');
    expect(screen.queryByText('الأسعار.pdf')).toBeNull();
    expect(getStaged(PHONE)).toBeNull();
  });

  it('a reply added after typed text keeps the staged file', async () => {
    show();
    await pick('الأسعار');
    fireEvent.click(screen.getByRole('button', { name: S.open }));
    const [first] = within(await screen.findByRole('listbox')).getAllByRole('option');
    if (first) fireEvent.mouseDown(first);
    expect(screen.getByText('الأسعار.pdf')).toBeTruthy();
  });

  it('a file staged while a text is in flight waits for its own send', async () => {
    let finish: (v: unknown) => void = () => undefined;
    apiSend.mockImplementation((_m: string, path: string) => new Promise((resolve) => (finish = resolve)).then(() => message({ id: path })));
    show();
    await pick('الأسعار');
    fireEvent.click(screen.getByRole('button', { name: t.inbox.composer.send }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
    const before = getStaged(PHONE)?.requestId;
    await pick('الأسعار');
    expect(getStaged(PHONE)?.requestId).not.toBe(before);
    await act(async () => finish(null));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(stageCalls()).toHaveLength(0);
    expect(screen.getByText('الأسعار.pdf')).toBeTruthy();
  });
});

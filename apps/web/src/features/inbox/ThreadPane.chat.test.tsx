import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, message, PHONE, template } from './testing/inbox-fixture';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const PATH = '/threads/%2B966501234567';
const PHONE_QUERIES = ['(max-width: 39.99rem)', '(max-width: 56.24rem)'];

function renderThread(open: boolean, gate: 'switch_off' | null = null) {
  routeFetch(apiFetch, [
    [PATH, detail([message()], { session_open: open })],
    ['/messaging/templates', [template()]],
    ['/messages/gate', { open: gate === null, reason: gate, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

describe('the open thread on phones (< 640px): a full-screen chat', () => {
  beforeEach(() => {
    // A phone is also below the shell breakpoint (900px), where the chat goes full-screen.
    const query = (media: string) => ({ matches: PHONE_QUERIES.includes(media), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(query));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('fills the screen: one compact header (back, name, number, client sheet icon), the log, the composer', async () => {
    renderThread(true);
    const chat = await screen.findByTestId('phone-chat');
    expect(chat.className).toMatch(/fixed/);
    expect(chat.className).toMatch(/h-dvh/);
    const header = within(chat.querySelector('header') ?? chat);
    expect(header.getByRole('link', { name: t.common.back }).getAttribute('href')).toContain('/admin/inbox');
    expect(header.getByRole('heading', { level: 2, name: 'أم سهيلة' })).toBeTruthy();
    expect(header.getByText('+966 50 123 4567')).toBeTruthy();
    const opener = header.getByRole('button', { name: t.inbox.leadSheet });
    expect(opener.textContent).toBe(''); // an icon button, named by aria-label
    expect(header.getByTestId('window-banner')).toBeTruthy();
    expect(within(chat).getByRole('log', { name: t.messages.log })).toBeTruthy();
    expect(screen.queryByText(t.inbox.composer.modeText)).toBeNull(); // no segmented control
  });

  it('a one-line message box with the round «أرسل» and the template toggle in its row', async () => {
    renderThread(true);
    const box = await screen.findByRole('textbox', { name: t.inbox.composer.messageLabel });
    expect(box.getAttribute('rows')).toBe('1');
    const send = screen.getByRole('button', { name: t.inbox.composer.send });
    const toggle = screen.getByRole('button', { name: t.inbox.composer.modeTemplate });
    expect(send.parentElement).toBe(box.parentElement);
    expect(toggle.parentElement).toBe(box.parentElement);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    apiSend.mockResolvedValue(message({ id: 'm-out', direction: 'outbound', status: 'queued', body: 'أهلًا' }));
    fireEvent.change(box, { target: { value: 'أهلًا' } });
    fireEvent.click(send);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `${PATH}/text`, expect.objectContaining({ text: 'أهلًا' })));
  });

  it('the toggle switches to the templates and back', async () => {
    renderThread(true);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.composer.modeTemplate }));
    expect(await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
    const toggle = screen.getByRole('button', { name: t.inbox.composer.modeTemplate });
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.getByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeTruthy();
  });

  it('the notices are one short line; a tap shows them all', async () => {
    renderThread(true, 'switch_off');
    const line = (await screen.findByText(t.inbox.messagingOff)).closest('button');
    if (!line) throw new Error('no notice line');
    expect(line.getAttribute('aria-expanded')).toBe('false');
    expect(line.className).toMatch(/max-h-/);
    fireEvent.click(line);
    expect(line.getAttribute('aria-expanded')).toBe('true');
    expect(line.className).not.toMatch(/max-h-/);
  });

  it('after the 24 h window: the closed notice first, templates only', async () => {
    renderThread(false);
    expect(await screen.findByText(t.inbox.sessionClosed)).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel })).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.modeTemplate })).toBeNull();
    expect(await screen.findByRole('combobox', { name: t.inbox.composer.chooseTemplate })).toBeTruthy();
  });
});

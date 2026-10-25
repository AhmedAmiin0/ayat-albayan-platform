import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { ComposerPhone } from './composer/components/ComposerPhone';
import { InboxPage } from './InboxPage';
import { detail, message, PHONE, thread } from './testing/inbox-fixture';
import { renderWithClient, routeFetch } from './testing/test-utils';
import { ThreadPane } from './ThreadPane';
import { windowText } from './window-state';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./testing/test-utils')).MockLink }));

const CHAT = thread({ last_inbound_line: 'chat' });
const OLD = thread({ phone_e164: '+201001234567', display_name: 'أم عمر', lead_name: 'أم عمر', last_inbound_line: null });
const replyFrom = t.inbox.line.replyFrom.replace('{line}', t.enums.waLine.chat);
const fresh = new Date(Date.now() - 3_600_000).toISOString();

afterEach(() => apiFetch.mockReset());

describe('two WhatsApp lines in the inbox (docs/12 §13.10, R-LEAD-02 / R-MSG-05)', () => {
  it('a thread row shows the line of the newest inbound; a null line shows nothing', async () => {
    routeFetch(apiFetch, [['/threads?', { items: [CHAT, OLD], total: 2, page: 1, pageSize: 30 }]]);
    renderWithClient(<InboxPage search={{ page: 1 }} onSearch={vi.fn()} />);
    const chat = await screen.findByRole('link', { name: new RegExp(t.inbox.openThread.replace('{name}', 'أم سهيلة')) });
    const badge = within(chat).getByTestId('line-badge');
    expect(badge.textContent).toBe(t.enums.waLine.chat);
    expect(badge.getAttribute('data-line')).toBe('chat');
    // The badge sits after the lead source, in the same tag line.
    expect(within(chat).getByText(t.enums.leadSource.facebook_ad).nextElementSibling).toBe(badge);
    const old = screen.getByRole('link', { name: new RegExp(t.inbox.openThread.replace('{name}', 'أم عمر')) });
    expect(within(old).queryByTestId('line-badge')).toBeNull();
    // Screen readers hear the line too (review W6): appended, the «open thread» prefix unchanged.
    const label = chat.getAttribute('aria-label') ?? '';
    expect(label.startsWith(t.inbox.openThread.replace('{name}', 'أم سهيلة'))).toBe(true);
    expect(label.endsWith(` — ${t.enums.waLine.chat}`)).toBe(true);
    expect(old.getAttribute('aria-label')).not.toContain(' — ');
  });

  it('bubbles carry their own line, the composer names the reply line, the window banner is unchanged', async () => {
    const messages = [
      message({ id: 'm-chat', body: 'من خط المحادثات', line: 'chat', created_at: fresh }),
      message({ id: 'm-old', body: 'رسالة قديمة', line: null, created_at: '2026-10-01T09:00:00Z' }),
    ];
    routeFetch(apiFetch, [
      [`/threads/${encodeURIComponent(PHONE)}`, detail(messages, { last_inbound_line: 'chat', reply_line: 'chat', last_inbound_at: fresh, session_open: true })],
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
      ['/settings', SETTINGS],
      ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ]);
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    const log = await screen.findByRole('log', { name: t.messages.log });
    const chatBubble = within(log).getByText('من خط المحادثات').closest('article');
    const oldBubble = within(log).getByText('رسالة قديمة').closest('article');
    if (!chatBubble || !oldBubble) throw new Error('no bubbles');
    const badge = within(chatBubble).getByTestId('line-badge');
    expect(badge.getAttribute('data-line')).toBe('chat');
    expect(badge.nextElementSibling?.tagName).toBe('TIME');
    expect(within(oldBubble).queryByTestId('line-badge')).toBeNull();
    expect(await screen.findByText(replyFrom)).toBeTruthy();
    const banner = screen.getByTestId('window-banner');
    expect(banner.getAttribute('data-open')).toBe('true');
    expect(banner.textContent).toBe(windowText(fresh, new Date()).text);
    expect(banner.textContent).not.toContain(t.enums.waLine.chat);
  });

  it('a single-line thread (no line anywhere) renders no badge and no reply note', async () => {
    routeFetch(apiFetch, [
      [`/threads/${encodeURIComponent(PHONE)}`, detail([message({ created_at: fresh })], { last_inbound_at: fresh, session_open: true })],
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
      ['/settings', SETTINGS],
      ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ]);
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    await screen.findByRole('log', { name: t.messages.log });
    expect(screen.queryByTestId('line-badge')).toBeNull();
    expect(screen.queryByText(new RegExp(t.inbox.line.replyFrom.replace('{line}', '')))).toBeNull();
  });

  it('phones: the reply line joins the composer notices', () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    const props = { context: {} as never, gateNote: null, mode: 'text' as const, onMode: vi.fn(), teacher: false };
    renderWithClient(<ComposerPhone thread={thread({ last_inbound_line: 'chat', reply_line: 'chat', last_inbound_at: fresh })} {...props} />);
    const notices = screen.getByRole('button', { name: new RegExp(replyFrom) });
    fireEvent.click(notices);
    expect(within(notices).getByText(replyFrom)).toBeTruthy();
  });
});

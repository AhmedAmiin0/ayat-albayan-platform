import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS } from '@/features/messaging/settings-fixture';
import { t } from '@/lib/i18n';
import { ComposerPhone } from './ComposerPhone';
import { detail, message, PHONE, thread } from './inbox-fixture';
import { renderWithClient, routeFetch } from './test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const replyFrom = t.inbox.line.replyFrom.replace('{line}', t.enums.waLine.chat);
const fresh = new Date(Date.now() - 3_600_000).toISOString();
const CHAT = { last_inbound_line: 'chat' as const, last_inbound_at: fresh, session_open: true };
const phoneProps = { context: {} as never, mode: 'text' as const, onMode: vi.fn(), teacher: false };

afterEach(() => apiFetch.mockReset());

describe('the reply line in the composer (review W1, W8)', () => {
  it('W1 desktop: the note shows in text mode only; templates leave from the notifications line', async () => {
    routeFetch(apiFetch, [
      [`/threads/${encodeURIComponent(PHONE)}`, detail([message({ created_at: fresh })], CHAT)],
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
      ['/settings', SETTINGS],
      ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ]);
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    expect(await screen.findByText(replyFrom)).toBeTruthy();
    const modes = screen.getByRole('group', { name: t.inbox.composer.sendTemplate });
    fireEvent.click(within(modes).getByRole('button', { name: t.inbox.composer.modeTemplate }));
    expect(screen.queryByText(replyFrom)).toBeNull();
    fireEvent.click(within(modes).getByRole('button', { name: t.inbox.composer.modeText }));
    expect(screen.getByText(replyFrom)).toBeTruthy();
  });

  it('W1 phone: no reply line among the notices in template mode', () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    renderWithClient(<ComposerPhone thread={thread(CHAT)} {...phoneProps} gateNote={null} mode="template" />);
    expect(screen.queryByText(replyFrom)).toBeNull();
  });

  it('W8 phone: the reply line comes before the window note (collapsed, the first one shows)', () => {
    routeFetch(apiFetch, [['/messaging/templates', []]]);
    renderWithClient(<ComposerPhone thread={thread(CHAT)} {...phoneProps} gateNote={null} />);
    const notices = screen.getByRole('button', { name: new RegExp(replyFrom) });
    expect(notices.firstElementChild?.textContent).toBe(replyFrom);
    expect(notices.children).toHaveLength(2);
  });
});

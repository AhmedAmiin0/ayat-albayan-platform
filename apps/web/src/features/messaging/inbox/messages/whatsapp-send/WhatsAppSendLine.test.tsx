import type { MessageView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { MessageBubble } from '@/features/messaging/inbox/messages/components/MessageBubble';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const NOW = new Date('2026-11-06T12:00:00Z');
const held: Partial<MessageView> = {
  id: 'm-held',
  direction: 'outbound',
  status: 'queued',
  error_code: 'awaiting_reply',
  body: 'السلام عليكم',
  phone_e164: '+966500000001',
};

function renderBubble(patch: Partial<MessageView>, mode: InboxMode = 'admin') {
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <ul>
        <MessageBubble message={message({ ...held, ...patch })} waitingTemplate={false} now={NOW} />
      </ul>
    </InboxModeContext.Provider>,
  );
}

const action = () => screen.queryByRole('button', { name: t.messages.whatsappSend.action });

describe('«أرسل عبر واتساب» in the web bubble: where it shows', () => {
  it('a held text: the hint and the action; no old «أرسلها بنفسك»', () => {
    renderBubble({ click_to_chat: 'https://wa.me/966500000001?text=x' });
    expect(screen.getByText(t.messages.whatsappSend.hint)).toBeTruthy();
    expect(action()).toBeTruthy();
    expect(screen.queryByText(t.messages.clickToChat)).toBeNull();
  });

  it.each(['reopen_failed', 'hold_expired', '131047'])('failed %s: shown', (code) => {
    renderBubble({ status: 'failed', error_code: code });
    expect(action()).toBeTruthy();
  });

  it.each<[string, Partial<MessageView>]>([
    ['a file', { media_mime: 'image/jpeg' }],
    ['another failure', { status: 'failed', error_code: 'network' }],
    ['an inbound message', { direction: 'inbound' }],
    ['a sent text', { status: 'sent', error_code: null }],
  ])('%s: not shown', (_name, patch) => {
    renderBubble(patch);
    expect(action()).toBeNull();
  });

  it('teacher mode: never shown', () => {
    renderBubble({}, 'teacher');
    expect(action()).toBeNull();
  });
});

describe('«أرسل عبر واتساب» in the web bubble: mark, then open', () => {
  const tab = { opener: {} as unknown, location: { replace: vi.fn() }, close: vi.fn() };
  let open: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(apiSend).mockReset();
    tab.location.replace.mockReset();
    tab.close.mockReset();
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  });
  afterEach(() => open.mockRestore());

  it('marks sent-manually first, then sends the tab to WhatsApp Web with the text', async () => {
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, status: 'sent_manually' }));
    renderBubble({});
    fireEvent.click(action() as HTMLElement);
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually');
    const marked = vi.mocked(apiSend).mock.invocationCallOrder[0] ?? Infinity;
    expect(marked).toBeLessThan(tab.location.replace.mock.invocationCallOrder[0] ?? 0);
    const url = new URL(String(tab.location.replace.mock.calls[0]?.[0]));
    expect(url.origin).toBe('https://web.whatsapp.com');
    expect(url.searchParams.get('phone')).toBe('966500000001');
    expect(url.searchParams.get('text')).toBe('السلام عليكم');
    expect(tab.opener).toBeNull();
  });

  it('a refused mark: the tab is closed, WhatsApp never opens', async () => {
    vi.mocked(apiSend).mockRejectedValue(new Error('not_manual'));
    renderBubble({});
    fireEvent.click(action() as HTMLElement);
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

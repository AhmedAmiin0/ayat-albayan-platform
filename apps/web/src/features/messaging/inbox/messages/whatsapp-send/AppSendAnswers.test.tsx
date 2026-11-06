import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { action, button, fakeTab, held, renderBubble } from './whatsapp-send.test-util';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

// Staff's answers about a «أرسل عبر واتساب» (docs/19): the platform never sends such a row itself.

const PENDING = '2026-11-06T12:08:00Z';
const unconfirmed = { status: 'failed' as const, error_code: 'app_send_unconfirmed' };

describe('«أرسلتها» while pending', () => {
  beforeEach(() => vi.mocked(apiSend).mockReset());

  it('shown beside «افتح واتساب مجددًا»; it records the manual send', async () => {
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, status: 'sent_manually' }));
    renderBubble({ app_send_until: PENDING });
    fireEvent.click(button(t.messages.whatsappSend.sentIt) as HTMLElement);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
  });

  it('not on the plain offer', () => {
    renderBubble({});
    expect(button(t.messages.whatsappSend.sentIt)).toBeNull();
  });
});

describe('unconfirmed: «هل أرسلتها من واتساب؟»', () => {
  beforeEach(() => vi.mocked(apiSend).mockReset());

  it('asks, with «نعم، أرسلتها» and «أرسل عبر واتساب» only: never put back (no «لا», no retry)', () => {
    renderBubble(unconfirmed);
    expect(screen.getByText(t.messages.whatsappSend.askSent)).toBeTruthy();
    expect(button(t.messages.whatsappSend.yes)).toBeTruthy();
    expect(action()).toBeTruthy();
    expect(button(t.messages.retry)).toBeNull();
  });

  it('«نعم، أرسلتها»: sent-manually', async () => {
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, status: 'sent_manually' }));
    renderBubble(unconfirmed);
    fireEvent.click(button(t.messages.whatsappSend.yes) as HTMLElement);
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/sent-manually'));
    expect(apiSend).not.toHaveBeenCalledWith('POST', '/messages/m-held/retry');
  });

  it('tapped again (pending): «جارٍ الإرسال من واتساب…» with «أرسلتها», no question', () => {
    renderBubble({ ...unconfirmed, app_send_until: PENDING });
    expect(screen.queryByText(t.messages.whatsappSend.askSent)).toBeNull();
    expect(button(t.messages.whatsappSend.sentIt)).toBeTruthy();
  });

  it('a row on the notifications line: no line at all', () => {
    renderBubble({ line: 'notifications' });
    expect(action()).toBeNull();
  });
});

describe('a stale tap error after a later answer (docs/19)', () => {
  it('«نعم، أرسلتها» succeeded: the earlier tap error under the line goes', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window);
    vi.mocked(apiSend).mockReset().mockRejectedValueOnce(new Error('offline'));
    renderBubble(unconfirmed);
    fireEvent.click(action() as HTMLElement);
    expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, status: 'sent_manually' }));
    fireEvent.click(button(t.messages.whatsappSend.yes) as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    open.mockRestore();
  });
});

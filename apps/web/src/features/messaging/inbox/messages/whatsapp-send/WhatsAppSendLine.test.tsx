import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { action, button, fakeTab, held, renderBubble } from './whatsapp-send.test-util';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const PENDING = '2026-11-06T12:08:00Z';

describe('«أرسل عبر واتساب» in the web bubble: where it shows', () => {
  it('a held text: the hint and the action; no old «أرسلها بنفسك», no «تراجع»', () => {
    renderBubble({ click_to_chat: 'https://wa.me/966500000001?text=x' });
    expect(screen.getByText(t.messages.whatsappSend.hint)).toBeTruthy();
    expect(action()).toBeTruthy();
    expect(screen.queryByText(t.messages.clickToChat)).toBeNull();
    expect(screen.queryByText('تراجع')).toBeNull();
  });

  it.each(['reopen_failed', 'hold_expired', '131047'])('failed %s: shown', (code) => {
    renderBubble({ status: 'failed', error_code: code });
    expect(action()).toBeTruthy();
  });

  it.each<[string, object]>([
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

describe('«أرسل عبر واتساب»: the pending window', () => {
  const tab = fakeTab();
  let open: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.mocked(apiSend).mockReset();
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  });
  afterEach(() => open.mockRestore());

  it('while pending: «جارٍ الإرسال من واتساب…» and «افتح واتساب مجددًا», never «تراجع»', () => {
    renderBubble({ app_send_until: PENDING });
    expect(screen.getByText(new RegExp(t.messages.whatsappSend.pending))).toBeTruthy();
    expect(button(t.messages.whatsappSend.openAgain)).toBeTruthy();
    expect(action()).toBeNull();
    expect(screen.queryByText('تراجع')).toBeNull();
  });

  it('the window passed with no echo: the offer again, as before the tap', () => {
    renderBubble({ app_send_until: '2026-11-06T11:59:00Z' });
    expect(action()).toBeTruthy();
    expect(button(t.messages.whatsappSend.openAgain)).toBeNull();
  });

  it('«افتح واتساب مجددًا» calls app-send again (extends it), then opens WhatsApp Web', async () => {
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, app_send_until: PENDING }));
    renderBubble({ app_send_until: PENDING });
    fireEvent.click(button(t.messages.whatsappSend.openAgain) as HTMLElement);
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', '/messages/m-held/app-send');
  });
});

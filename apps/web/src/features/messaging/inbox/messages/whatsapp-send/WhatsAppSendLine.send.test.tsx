import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchoredThreadPrefix } from '@ab/client-core';
import { ApiError, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { action, fakeTab, held, renderBubble } from './whatsapp-send.test-util';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const refused = (status: string, error_code: string | null = null) =>
  new ApiError(409, { code: 'not_app_send', message: 'not_app_send', status, error_code });

describe('«أرسل عبر واتساب» in the web bubble: app-send, then open', () => {
  const tab = fakeTab();
  let open: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.mocked(apiSend).mockReset();
    tab.location.replace.mockReset();
    tab.close.mockReset();
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
  });
  afterEach(() => open.mockRestore());

  it('app-send first (nothing marked sent), then the tab goes to WhatsApp Web with the text', async () => {
    vi.mocked(apiSend).mockResolvedValue(message({ ...held, app_send_until: '2026-11-06T12:10:00Z' }));
    renderBubble({});
    fireEvent.click(action() as HTMLElement);
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledExactlyOnceWith('POST', '/messages/m-held/app-send');
    const started = vi.mocked(apiSend).mock.invocationCallOrder[0] ?? Infinity;
    expect(started).toBeLessThan(tab.location.replace.mock.invocationCallOrder[0] ?? 0);
    const url = new URL(String(tab.location.replace.mock.calls[0]?.[0]));
    expect(url.origin).toBe('https://web.whatsapp.com');
    expect(url.searchParams.get('phone')).toBe('966500000001');
    expect(url.searchParams.get('text')).toBe('السلام عليكم');
    expect(tab.opener).toBeNull();
  });

  it('settled: the chat and its anchored windows are read again', async () => {
    vi.mocked(apiSend).mockResolvedValue(message(held));
    const client = renderBubble({});
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(action() as HTMLElement);
    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['threads'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: anchoredThreadPrefix('+966500000001') });
  });

  it.each<[string, Error, string]>([
    ['claimed by the platform', refused('queued', 'sending'), t.messages.alreadySending],
    ['sent already', refused('sent'), t.messages.whatsappSend.alreadySent],
    ['marked by hand', refused('sent_manually'), t.messages.whatsappSend.alreadySent],
    ['no longer held', refused('failed', 'network'), t.messages.whatsappSend.notNow],
    ['a network error', new Error('offline'), t.common.error],
  ])('refused (%s): the tab is closed, WhatsApp never opens, the copy fits', async (_n, e, copy) => {
    vi.mocked(apiSend).mockRejectedValue(e);
    renderBubble({});
    fireEvent.click(action() as HTMLElement);
    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect((await screen.findByRole('alert')).textContent).toBe(copy);
  });
});

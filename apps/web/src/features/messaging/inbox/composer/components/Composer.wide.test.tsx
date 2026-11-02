import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Composer } from './Composer';
import { message, PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const OPEN = thread({
  session_open: true,
  last_inbound_at: new Date(Date.now() - 3_600_000).toISOString(),
});

// W2: a 1280px laptop gets the compact composer too (the #112 pass mobile already had).
describe('Composer on a desktop width', () => {
  beforeEach(() => {
    // 1280px wide: no phone or narrow query matches.
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    routeFetch(apiFetch, [
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ]);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the round send icon button, the «قالب» toggle, no «رسالة عادية | قالب» control, one short box', () => {
    renderWithClient(<Composer thread={OPEN} context={{}} />);
    const send = screen.getByRole('button', { name: t.inbox.composer.send });
    expect(send.className).toContain('rounded-full');
    expect(send.textContent).toBe(''); // an icon, not the word
    expect(screen.queryByRole('group', { name: t.inbox.composer.sendTemplate })).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.modeText })).toBeNull();
    expect(
      screen
        .getByRole('button', { name: t.inbox.composer.modeTemplate })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    const box = screen.getByRole('textbox', { name: t.inbox.composer.messageLabel });
    expect(box.className).not.toContain('min-h-[88px]');
    expect(box.getAttribute('rows')).toBe('1');
    expect(box.getAttribute('placeholder')).toBe(t.inbox.composer.placeholderDesktop);
  });

  it('Enter sends; Shift+Enter does not', async () => {
    apiSend.mockResolvedValue(message({ id: 'm-1', direction: 'outbound', status: 'queued' }));
    renderWithClient(<Composer thread={OPEN} context={{}} />);
    const box = screen.getByRole('textbox', { name: t.inbox.composer.messageLabel });
    fireEvent.change(box, { target: { value: 'السلام عليكم' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        'POST',
        `/threads/${encodeURIComponent(PHONE)}/text`,
        expect.objectContaining({ text: 'السلام عليكم' }),
      ),
    );
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { ADMIN, SALES, showLog } from './hide.testing';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const h = t.inbox.hide;
const hidden = message({
  id: 'm1',
  body: null,
  hidden: { by_name: 'سارة', at: '2026-10-30T11:00:00Z' },
});

describe('a message hidden from the platform', () => {
  afterEach(() => apiSend.mockReset());

  it('is a muted placeholder saying it is still on the customer’s phone, with who; no menu', () => {
    showLog(hidden, SALES);
    expect(screen.getByText(h.placeholder)).toBeTruthy();
    expect(screen.getByText(/سارة/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.inbox.reply.menu })).toBeNull();
    expect(screen.queryByRole('button', { name: h.unhide })).toBeNull();
  });

  it('a login that is gone: «أُخفيت · time» without a name', () => {
    showLog({ ...hidden, hidden: { by_name: null, at: '2026-10-30T11:00:00Z' } }, SALES);
    const prefix = h.byUnknown.replace('{time}', '');
    expect(screen.getByText((text) => text.startsWith(prefix))).toBeTruthy();
    expect(screen.queryByText(/سارة/)).toBeNull();
  });

  it('only the admin gets «إظهار», which DELETEs the hide', async () => {
    apiSend.mockResolvedValue({});
    showLog(hidden, ADMIN);
    fireEvent.click(screen.getByRole('button', { name: h.unhide }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('DELETE', '/threads/%2B966501234567/messages/m1/hide'),
    );
  });
});

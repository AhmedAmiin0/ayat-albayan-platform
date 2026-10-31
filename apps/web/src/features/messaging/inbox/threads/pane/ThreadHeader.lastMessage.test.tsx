import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InboxModeContext } from '@/features/messaging/inbox/shared/mode';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { ThreadHeader } from './ThreadHeader';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const show = (lastInboundAt: string | null) => {
  routeFetch(apiFetch, []);
  renderWithClient(
    <InboxModeContext.Provider value="admin">
      <ThreadHeader
        thread={thread({ last_inbound_at: lastInboundAt })}
        listSearch={{ page: 1 }}
        headingId="h"
        badge={null}
      />
    </InboxModeContext.Provider>,
  );
};
const p = t.presence;

describe('ThreadHeader: «آخر رسالة …» for a WhatsApp contact (docs/33 §4)', () => {
  afterEach(() => apiFetch.mockReset());

  it('the time since their last inbound message', () => {
    show(new Date(Date.now() - 3 * 60_000).toISOString());
    const when = p.minutes.few.replace('{n}', '3');
    expect(screen.getByText(p.lastMessage.replace('{when}', when))).toBeTruthy();
  });

  it('they never wrote: no line', () => {
    show(null);
    expect(screen.queryByText(p.lastMessage.replace('{when}', ''), { exact: false })).toBeNull();
  });
});

import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { timesInText } from '../../format';
import { detail, PHONE } from '../../testing/inbox-fixture';
import { InboxModeContext } from '../../shared/mode';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

describe('ThreadHeaderPhone at 375px, a sales lead (W3)', () => {
  beforeEach(() => {
    // Every max-width query matches: a 375px window, whatever breakpoint the chat switches at.
    const query = (media: string) => ({ matches: media.startsWith('(max-width'), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('matchMedia', vi.fn(query));
    routeFetch(apiFetch, [
      ['/threads/%2B966501234567', detail([])],
      ['/messaging/templates', []],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>,
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
  });

  it('the action is an icon plus «المزيد» only: no visible text beside the name', async () => {
    const h2 = await screen.findByRole('heading', { level: 2 });
    const header = h2.closest('header');
    if (!header) throw new Error('no header');
    const register = within(header).getByRole('button', { name: t.inbox.registerNew });
    const more = within(header).getByRole('button', { name: t.common.more });
    expect(register.textContent).toBe('');
    expect(more.textContent).toBe('');
    expect(within(header).queryByText(t.inbox.registerNew)).toBeNull();
    fireEvent.click(more);
    expect(within(header).getByRole('button', { name: t.registrationCheck.action })).toBeTruthy();
  });

  it('the h2 is not covered: its box takes the free space, truncates, and the actions keep their size', async () => {
    const h2 = await screen.findByRole('heading', { level: 2 });
    expect(h2.className).toContain('truncate');
    expect(h2.parentElement?.className).toContain('flex-1');
    expect(h2.parentElement?.className).toContain('min-w-0');
    const actions = screen.getByRole('button', { name: t.inbox.registerNew }).closest('span');
    expect(actions?.className).toContain('shrink-0');
    expect(screen.getByTestId('phone-chat')).toBeTruthy();
  });

  it('the chip row ends with the times’ city, like the wide header (principle 7)', async () => {
    const h2 = await screen.findByRole('heading', { level: 2 });
    const chips = h2.closest('header')?.lastElementChild;
    expect(chips?.lastElementChild?.textContent).toBe(timesInText());
  });
});

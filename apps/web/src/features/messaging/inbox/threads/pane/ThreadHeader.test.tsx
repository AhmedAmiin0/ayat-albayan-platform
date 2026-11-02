import type { ThreadView } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { SalesChatActions } from '@/features/sales/sales-money/SalesChatActions';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadHeader } from './ThreadHeader';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

function renderHeader(opts: { mode: InboxMode; th?: ThreadView; line?: ReactNode }) {
  const th = opts.th ?? thread();
  routeFetch(apiFetch, []);
  renderWithClient(
    <InboxModeContext.Provider value={opts.mode}>
      <ThreadHeader thread={th} listSearch={{ page: 1 }} headingId="h" badge={null} action={<SalesChatActions thread={th} />} line={opts.line} />
    </InboxModeContext.Provider>,
  );
  const header = document.querySelector('header');
  if (!header) throw new Error('no header');
  return header;
}

const visibleButtons = (el: HTMLElement) => within(el).queryAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);

describe('ThreadHeader: one row of name and actions, one row of chips (W3)', () => {
  afterEach(() => apiFetch.mockReset());

  it('a sales lead: «نسخ الرقم», then exactly one visible action «تسجيل طالب جديد», and «المزيد» holding «تحقق من التسجيل»', () => {
    const header = renderHeader({ mode: 'sales' });
    expect(visibleButtons(header)).toEqual([t.inbox.copy.phone, t.inbox.registerNew, t.common.more]);
    expect(within(header).getByRole('button', { name: t.inbox.registerNew }).className).toContain('bg-secondary');
    expect(within(header).queryByRole('button', { name: t.registrationCheck.action })).toBeNull();
    fireEvent.click(within(header).getByRole('button', { name: t.common.more }));
    expect(within(header).getByRole('button', { name: t.registrationCheck.action })).toBeTruthy();
  });

  it('never wraps: no flex-wrap anywhere in the header; the name truncates at text-base', () => {
    const header = renderHeader({ mode: 'sales' });
    expect([header, ...header.querySelectorAll('*')].some((el) => el.classList.contains('flex-wrap'))).toBe(false);
    const h2 = within(header).getByRole('heading', { level: 2 });
    expect(h2.className).toContain('truncate');
    expect(h2.className).toContain('text-base');
    expect(h2.className).not.toContain('text-h3');
  });

  it('the second row scrolls sideways and keeps the times’ city at its end, after the sales line', () => {
    const header = renderHeader({ mode: 'sales', line: <span>سطر الأبناء</span> });
    const row = screen.getByText('سطر الأبناء').parentElement;
    expect(row?.className).toContain('overflow-x-auto');
    expect(row?.className).toContain('whitespace-nowrap');
    expect(row?.lastElementChild?.textContent).toMatch(/\S/);
    expect(row?.lastElementChild?.previousElementSibling?.textContent).toBe('سطر الأبناء');
    expect(header.className).toContain('pb-2');
  });

  it('admin: the source shows and there is no sales action', () => {
    const header = renderHeader({ mode: 'admin' });
    expect(header.textContent).toContain(t.enums.leadSource.facebook_ad);
    expect(visibleButtons(header)).toEqual([t.inbox.copy.phone]);
  });
});

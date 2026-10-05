import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { InboxPage } from './InboxPage';
import { thread } from './inbox-fixture';
import type { InboxSearch } from './search';
import { renderWithClient, routeFetch } from './test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./test-utils')).MockLink }));

const LEAD = thread({ unread_count: 2 });
const GUARDIAN = thread({
  phone_e164: '+201001234567',
  display_name: null,
  last_direction: 'outbound',
  last_body: 'أهلًا',
  lead_id: null,
  lead_status: null,
  lead_source: null,
  guardian_id: 'g-1',
  subscribed: true,
});

function renderInbox(search: InboxSearch, items = [LEAD, GUARDIAN]) {
  routeFetch(apiFetch, [['/threads?', { items, total: items.length, page: 1, pageSize: 30 }]]);
  const onSearch = vi.fn();
  renderWithClient(<InboxPage search={search} onSearch={onSearch} />);
  return onSearch;
}

afterEach(() => apiFetch.mockReset());

describe('InboxPage thread list (R-LEAD-02)', () => {
  it('lists threads: unread lead first with its chip, a guardian by phone with «أنت:»', async () => {
    renderInbox({ q: 'سهيلة', page: 1 });
    const lead = await screen.findByRole('link', { name: new RegExp(t.inbox.openThread.replace('{name}', 'أم سهيلة')) });
    expect(lead.getAttribute('aria-label')).toContain(t.inbox.unread.two);
    expect(lead.getAttribute('href')).toContain('phone=%2B966501234567');
    expect(lead.getAttribute('href')).toContain('q=');
    const row = within(lead);
    expect(row.getByText('السلام عليكم')).toBeTruthy();
    expect(row.getByText(t.enums.leadStatus.new).closest('[data-tone]')?.getAttribute('data-tone')).toBe('act');
    expect(row.getByText(t.enums.leadSource.facebook_ad)).toBeTruthy();

    const guardian = within(screen.getByRole('link', { name: /\+20 10 0123 4567/ }));
    expect(guardian.getByText(`${t.inbox.you} أهلًا`)).toBeTruthy();
    expect(guardian.getByText(t.inbox.kind.guardian)).toBeTruthy();
    // «مشترك» (R-SUB-01): the family's tag next to who the number is, on that row only.
    expect(guardian.getByText(t.inbox.subscription.badge.subscribed).closest('[data-tone]')?.getAttribute('data-tone')).toBe('ok');
    expect(row.queryByText(t.inbox.subscription.badge.subscribed)).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/threads\?page=1&pageSize=30&search=/));
    expect(screen.getByText(t.leads.count.replace('{n}', '2'))).toBeTruthy();
  });

  it('no open thread: the list beside «اختار محادثة»', async () => {
    renderInbox({ page: 1 });
    await screen.findAllByRole('link');
    expect(screen.getByRole('heading', { name: t.inbox.pickThread })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.inbox.title })).toBeTruthy();
  });

  it('the unread filter and the search go back to page 1 and keep the open thread', async () => {
    const onSearch = renderInbox({ phone: '+966501234567', page: 3 }, []);
    routeFetch(apiFetch, [['/threads?', { items: [], total: 0, page: 3, pageSize: 30 }]]);
    fireEvent.click(await screen.findByRole('button', { name: t.inbox.filterUnread }));
    expect(onSearch).toHaveBeenLastCalledWith({ phone: '+966501234567', unread: true, page: 1 });
    const box = screen.getByRole('searchbox', { name: t.common.search });
    fireEvent.change(box, { target: { value: ' 0501 ' } });
    fireEvent.submit(box);
    expect(onSearch).toHaveBeenLastCalledWith({ phone: '+966501234567', q: '0501', page: 1 });
  });

  it('an empty unread list says there is nothing new', async () => {
    renderInbox({ unread: true, page: 1 }, []);
    expect(await screen.findByRole('heading', { name: t.inbox.emptyUnread })).toBeTruthy();
  });

  it('a thread whose last send failed says so on the row (the admin’s turn), with the phone’s end', async () => {
    const failed = thread({ display_name: 'أم نور', last_direction: 'outbound', last_status: 'failed', last_body: 'تذكير' });
    renderInbox({ page: 1 }, [failed]);
    const row = await screen.findByRole('link', { name: new RegExp(t.inbox.failedLast) });
    expect(within(row).getByText(t.enums.messageStatus.failed)).toBeTruthy();
    expect(within(row).getByText('…4567')).toBeTruthy();
  });
});

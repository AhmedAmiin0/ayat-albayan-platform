import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { clearAllFilters, findFilters } from '@/test/open-filters';
import { InboxPage } from './InboxPage';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import type { InboxSearch } from '@/features/messaging/inbox/shared/search';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

function renderInbox(search: InboxSearch, mode: InboxMode = 'admin') {
  routeFetch(apiFetch, [['/threads?', { items: [thread()], total: 1, page: 1, pageSize: 30 }]]);
  const onSearch = vi.fn();
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <InboxPage search={search} onSearch={onSearch} />
    </InboxModeContext.Provider>,
  );
  return onSearch;
}

afterEach(() => apiFetch.mockReset());

describe('InboxPage list order and status (R-NFR-08), in the shared «تصفية» panel', () => {
  it('sends the order and status to the server: unread first is most-unread (desc)', async () => {
    renderInbox({ sort: 'unread', f_status: 'trial_booked', page: 2 });
    await screen.findAllByRole('link');
    expect(apiFetch).toHaveBeenCalledWith('/threads?page=2&pageSize=30&sort=unread&dir=desc&status=trial_booked');
  });

  it('no select sits above the list any more: the order and the status wait in the panel', async () => {
    renderInbox({ page: 1 });
    await screen.findAllByRole('link');
    expect(screen.queryByRole('combobox')).toBeNull();
    await findFilters();
    expect(screen.getByRole('combobox', { name: t.inbox.sort.label })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: t.inbox.statusFilter })).toBeTruthy();
  });

  it('picking an order or a status goes back to page 1 and keeps the open thread', async () => {
    const onSearch = renderInbox({ phone: '+966501234567', page: 3 });
    await findFilters();
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.sort.label }), { target: { value: 'name' } });
    expect(onSearch).toHaveBeenLastCalledWith({ phone: '+966501234567', sort: 'name', page: 1 });
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.statusFilter }), { target: { value: 'new' } });
    expect(onSearch).toHaveBeenLastCalledWith({ phone: '+966501234567', f_status: 'new', page: 1 });
  });

  it('«الأحدث رسالةً» clears the order', async () => {
    const onSearch = renderInbox({ sort: 'name', page: 1 });
    await findFilters();
    fireEvent.change(screen.getByRole('combobox', { name: t.inbox.sort.label }), { target: { value: '' } });
    expect(onSearch).toHaveBeenLastCalledWith({ page: 1 });
  });

  it('a set order and status are chips; «مسح الكل» drops both but keeps the unread tab and the search', async () => {
    const onSearch = renderInbox({ unread: true, q: '0501', sort: 'name', f_status: 'new', page: 3 });
    const chips = await screen.findByRole('list', { name: t.table.activeFilters });
    expect(chips.textContent).toContain(`${t.inbox.sort.label}: ${t.inbox.sort.name}`);
    expect(chips.textContent).toContain(`${t.inbox.statusFilter}: ${t.enums.leadStatus.new}`);
    clearAllFilters();
    expect(onSearch).toHaveBeenLastCalledWith({ unread: true, q: '0501', page: 1 });
  });

  it('the panel\'s primary button names the conversations the filters leave', async () => {
    renderInbox({ sort: 'name', page: 1 });
    await findFilters();
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '1') })).toBeTruthy();
  });

  it('teacher mode: no unread order and no lead status', async () => {
    renderInbox({ page: 1 }, 'teacher');
    await findFilters();
    const sort = screen.getByRole('combobox', { name: t.inbox.sort.label });
    expect([...sort.querySelectorAll('option')].map((o) => o.value)).toEqual(['', 'name']);
    expect(screen.queryByRole('combobox', { name: t.inbox.statusFilter })).toBeNull();
  });
});

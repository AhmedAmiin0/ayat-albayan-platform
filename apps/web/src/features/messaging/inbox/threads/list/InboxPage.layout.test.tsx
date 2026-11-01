import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { InboxPage } from './InboxPage';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '@/features/messaging/inbox/shared/mode';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

function renderInbox(mode: InboxMode = 'sales') {
  routeFetch(apiFetch, [['/threads?', { items: [thread()], total: 1, page: 1, pageSize: 30 }]]);
  const onSearch = vi.fn();
  renderWithClient(
    <InboxModeContext.Provider value={mode}>
      <InboxPage search={{ page: 1 }} onSearch={onSearch} head={<a href="/sales/live">live-chip</a>} />
    </InboxModeContext.Provider>,
  );
  return onSearch;
}

const layout = () => screen.getByTestId('inbox-layout');
const listColumn = () => {
  const column = layout().firstElementChild;
  if (!(column instanceof HTMLElement)) throw new Error('no list column');
  return column;
};

afterEach(() => apiFetch.mockReset());

describe('InboxPage layout (sales)', () => {
  it('the grid: 400px floor, a clamped list column, a 16px gap', async () => {
    renderInbox();
    await screen.findAllByRole('link', { name: /أم سهيلة/ });
    const classes = layout().className.split(' ');
    expect(classes).toContain('shell:min-h-[400px]');
    expect(classes).toContain('shell:grid-cols-[clamp(300px,30%,400px)_minmax(0,1fr)]');
    expect(classes).toContain('gap-4');
    expect(classes).not.toContain('shell:min-h-[600px]');
  });

  it('exactly one cartouche, a real heading inside the list column, with the count and the `head` node', async () => {
    renderInbox();
    await screen.findByText(t.leads.count.replace('{n}', '1'));
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]?.textContent).toBe(t.nav.conversations);
    expect(headings[0]?.className).not.toContain('sr-only');
    const column = within(listColumn());
    expect(column.getByRole('heading', { level: 1 })).toBe(headings[0]);
    expect(column.getByText(t.leads.count.replace('{n}', '1'))).toBeTruthy();
    expect(column.getByRole('link', { name: 'live-chip' })).toBeTruthy();
  });

  it('«محادثة جديدة» is an icon-only disclosure in the head row; the form unfolds below it', async () => {
    const onSearch = renderInbox();
    const toggle = screen.getByRole('button', { name: t.inbox.newChat.title });
    expect(toggle.textContent).toBe('');
    expect(toggle.closest('[data-page-head]')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByLabelText(t.inbox.newChat.phone)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const box = screen.getByLabelText(t.inbox.newChat.phone);
    expect(document.activeElement).toBe(box);
    expect(box.closest('[data-page-head]')).toBeNull();
    fireEvent.change(box, { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('button', { name: t.inbox.newChat.open }));
    expect(onSearch).toHaveBeenCalledWith({ page: 1, phone: '+966501234567' });
    expect(screen.queryByLabelText(t.inbox.newChat.phone)).toBeNull();
  });

  it('the الكل | غير مقروءة tabs share the toolbar row with the search box', async () => {
    renderInbox();
    const tabs = await screen.findByRole('group', { name: t.inbox.title });
    const search = screen.getByRole('searchbox', { name: t.common.search });
    const row = tabs.parentElement?.parentElement;
    expect(row?.contains(search)).toBe(true);
  });

  it('the teacher gets no «محادثة جديدة»', async () => {
    renderInbox('teacher');
    await screen.findAllByRole('heading', { level: 1 });
    expect(screen.queryByRole('button', { name: t.inbox.newChat.title })).toBeNull();
  });
});

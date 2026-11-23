import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderWithClient } from '@ab/web-kit/testing/query-render';
import { linkRow } from '@/features/platform/short-links/shared/short-links.fixtures';
import { ShortLinksPage } from './ShortLinksPage';

const apiFetch = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({
  usePermissions: () => ({ can: (k: string) => granted.keys.includes(k), loaded: true }),
}));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
  useNavigate: () => vi.fn(),
}));

const L = t.shortLinks.list;
const ROWS = [
  linkRow(),
  linkRow({
    code: 'R4tX8bWe', title: 'نموذج التسجيل', audience: 'anyone', maxUsers: null, visitors: 23,
  }),
];

function serve(rows = ROWS) {
  apiFetch.mockResolvedValue({ rows, total: rows.length });
}

function open(keys: string[], search = {}) {
  granted.keys = keys;
  const onSearch = vi.fn();
  renderWithClient(<ShortLinksPage section="sales" search={search} onSearch={onSearch} />);
  return onSearch;
}

afterEach(() => vi.clearAllMocks());

describe('ShortLinksPage', () => {
  it('lists the links: title to the detail, short path, users, usage and state', async () => {
    serve();
    open(['short_links.manage']);
    const title = await screen.findByRole('link', { name: /لقاء أولياء الأمور/ });
    expect(title.getAttribute('href')).toBe('/sales/short-links/K7q2M9xT');
    expect(screen.getByText('/l/K7q2M9xT')).toBeTruthy();
    expect(screen.getByText('1 من 12')).toBeTruthy();
    expect(screen.getByText('23 · بلا حد')).toBeTruthy();
    expect(screen.getAllByText(t.shortLinks.audience.anyone).length).toBeGreaterThan(0);
    // two rows and the status chip
    expect(screen.getAllByText(t.shortLinks.state.active)).toHaveLength(3);
    expect(screen.queryByRole('columnheader', { name: L.columns.owner })).toBeNull();
    expect(screen.queryByLabelText(L.owner)).toBeNull();
  });

  it('short_links.all: the owner column and filter', async () => {
    serve();
    const onSearch = open(['short_links.manage', 'short_links.all']);
    await screen.findByRole('columnheader', { name: L.columns.owner });
    expect(screen.getAllByText('هالة منصور').length).toBeGreaterThan(0);
    const owner = screen.getByLabelText(L.owner);
    fireEvent.change(owner, { target: { value: ROWS[0]?.createdBy?.id } });
    expect(onSearch).toHaveBeenCalledWith({ owner: ROWS[0]?.createdBy?.id, page: 1 });
  });

  it('the status chips carry counts and filter from page 1', async () => {
    serve();
    const onSearch = open(['short_links.manage'], { page: 2 });
    const chips = screen.getByRole('group', { name: L.status });
    fireEvent.click(await within(chips).findByRole('button', { name: /فعّال/ }));
    expect(onSearch).toHaveBeenCalledWith({ status: 'active', page: 1 });
    const paths = apiFetch.mock.calls.map(([p]) => String(p));
    const statuses = paths.filter((p) => p.includes('status='));
    expect(statuses.length).toBe(3);
  });

  it('nothing yet: the invitation to make the first link', async () => {
    serve([]);
    open(['short_links.manage']);
    expect(await screen.findByText(L.empty)).toBeTruthy();
  });

  it('nothing under a filter: «مسح التصفية» clears it', async () => {
    serve([]);
    const onSearch = open(['short_links.manage'], { q: 'zzz' });
    expect(await screen.findByText(L.emptyFiltered)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: L.clearFilters })[0] as HTMLElement);
    expect(onSearch).toHaveBeenCalledWith({});
  });

  it('a failed read says so and offers a retry', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    open(['short_links.manage']);
    expect(await screen.findByText(L.loadError)).toBeTruthy();
    expect(screen.getByRole('button', { name: L.retry })).toBeTruthy();
  });
});

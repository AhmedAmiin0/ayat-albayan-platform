import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SUMMARY, WORK } from './dashboard-fixture';
import { DashboardPage } from './DashboardPage';

// Overflow guard (owner, 2026-10-05: "fix the overflow in the dashboard"). jsdom has no layout, so this
// pins the class contract that fixes it: a single-column grid is `grid-cols-1` (minmax(0, 1fr)), never
// the implicit `auto` track that grows to a wide table's min-content; wide tables scroll in their own
// box; row headers wrap instead of forcing the table wider. Measured for real by the responsive e2e.

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./link-mock')).Link }));

const answer = (path: string): unknown => {
  if (path === '/dashboard/work') return WORK;
  if (path === '/teacher-earnings/summary') return { currency: 'EGP', rows: [], totals: { earned: 0, paid: 0, owed: 0, teachers_owed: 0 } };
  if (path === '/receivables') return { rows: [], totals: [], total: 0, currency: 'SAR', fx_missing: [] };
  if (path.startsWith('/lessons')) return [];
  if (path.startsWith('/threads')) return { items: [], total: 0, page: 1, pageSize: 30 };
  return SUMMARY;
};

const hasBaseColumns = (el: Element) => [...el.classList].some((c) => c.startsWith('grid-cols-'));

async function renderPage(): Promise<HTMLElement> {
  const { container } = render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DashboardPage search={{}} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
  await screen.findByRole('table', { name: t.dashboard.bySource });
  return container;
}

describe('dashboard layout never grows past the page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T09:00:00.000Z'));
    apiFetch.mockImplementation((path: string) => Promise.resolve(answer(path)));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('every grid above a table has explicit tracks (no auto track that a 640px table can stretch)', async () => {
    const page = await renderPage();
    const tables = page.querySelectorAll('table');
    expect(tables.length).toBeGreaterThanOrEqual(5);
    const loose = new Set<string>();
    for (const table of tables) {
      for (let el = table.parentElement; el && el !== page; el = el.parentElement) {
        if (el.classList.contains('grid') && !hasBaseColumns(el)) loose.add(el.className);
      }
    }
    expect([...loose]).toEqual([]);
  });

  it('the wide tables (by month, by source, teacher load) scroll inside their own box', async () => {
    await renderPage();
    const names = [`${t.dashboard.byMonth} (${SUMMARY.finance.currency})`, t.dashboard.bySource, t.dashboard.teacherLoad];
    for (const name of names) {
      const box = screen.getByRole('table', { name }).closest('.ab-scroll-x');
      expect(box, name).not.toBeNull();
      // Reachable by keyboard and named (axe scrollable-region-focusable): Tab lands on it, arrows scroll it.
      expect(box?.getAttribute('tabindex'), name).toBe('0');
      expect(box?.getAttribute('role'), name).toBe('region');
      expect(box?.getAttribute('aria-label'), name).toBe(name);
    }
  });

  it('row headers wrap (expense category, teacher): a long name cannot widen the table', async () => {
    await renderPage();
    for (const name of [t.dashboard.expensesByCategory, t.dashboard.teacherLoad]) {
      const header = screen.getByRole('table', { name }).querySelector('tbody th');
      expect(header?.className, name).not.toContain('whitespace-nowrap');
      expect(header?.className, name).toContain('[overflow-wrap:anywhere]');
    }
  });

  it('the period totals go one column on a narrow page, then two, then four', async () => {
    const page = await renderPage();
    const totals = page.querySelector('dl');
    for (const c of ['grid-cols-1', '@sm:grid-cols-2', '@2xl:grid-cols-4']) expect(totals?.className).toContain(c);
    expect(totals?.querySelector('dd')?.className).not.toContain('whitespace-nowrap');
  });

  it('the last column head stays flush: its sort button does not stick out of the scroll box', async () => {
    await renderPage();
    const last = screen.getByRole('table', { name: t.dashboard.bySource }).querySelector('thead th:last-child button');
    expect(last?.className).toContain('[th:last-child>&]:pe-0');
    expect(last?.className).toContain('[th:last-child>&]:me-0');
  });
});

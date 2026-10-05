import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { SUMMARY, WORK } from './dashboard-fixture';
import { DashboardPage, previousMonth } from './DashboardPage';
import type { DashboardSearch } from './search';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('./link-mock')).Link }));

const DUES = { currency: 'EGP', rows: [], totals: { earned: 900, paid: 300, owed: 600, teachers_owed: 2 } };
const OWED = { rows: [], totals: [], total: 450, currency: 'SAR', fx_missing: [] };
/** The dashboard's reads: work queue, today's lessons, the latest threads, money, else a summary. */
function answer(path: string): unknown {
  if (path === '/dashboard/work') return WORK;
  if (path === '/teacher-earnings/summary') return DUES;
  if (path === '/receivables') return OWED;
  if (path.startsWith('/lessons')) return [];
  if (path.startsWith('/threads')) return { items: [], total: 0, page: 1, pageSize: 30 };
  return SUMMARY;
}

function renderPage(search: DashboardSearch = {}) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DashboardPage search={search} onSearch={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('DashboardPage (/admin, R-RPT-01/02/03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T09:00:00.000Z'));
    apiFetch.mockImplementation((path: string) => Promise.resolve(answer(path)));
  });
  afterEach(() => {
    vi.useRealTimers();
    apiFetch.mockReset();
  });

  it('reads this Riyadh week and the default six-month period, plus the queue', async () => {
    renderPage();
    await screen.findByRole('table', { name: t.dashboard.funnel });
    const paths = apiFetch.mock.calls.map((c) => c[0]);
    expect(paths).toContain('/dashboard/summary?from=2026-09-26&to=2026-10-02');
    expect(paths).toContain('/dashboard/summary?from=2026-05-01&to=2026-10-02');
    expect(paths).toContain('/dashboard/work');
  });

  it('money KPIs: owed to teachers (ledger) and owed by students, each linking to its page', async () => {
    renderPage();
    const kpis = await screen.findByRole('list', { name: t.finance.moneyKpis });
    expect(within(kpis).getByRole('link', { name: new RegExp(t.finance.teachersOwedKpi) }).getAttribute('href')).toBe('/admin/payouts');
    expect(within(kpis).getByRole('link', { name: new RegExp(t.finance.receivablesKpi) }).getAttribute('href')).toBe('/admin/receivables');
    expect(await within(kpis).findByText('600')).toBeTruthy();
  });

  it('KPI strip: Amiri numerals, saffron only where there is work, each a filter link', async () => {
    renderPage();
    const strip = await screen.findByRole('navigation', { name: t.dashboard.kpiStrip });
    const confirm = await within(strip).findByRole('link', { name: `3 ${t.enums.lessonStatus.scheduled}` });
    expect(confirm.getAttribute('href')).toBe('/admin/schedule?status=scheduled');
    expect(confirm.querySelector('[data-act]')?.className).toContain('text-act');
    const reports = within(strip).getByRole('link', { name: `0 ${t.dashboard.pendingReports}` });
    expect(reports.querySelector('.font-display')?.className).not.toContain('text-act');
    expect(reports.getAttribute('aria-current')).toBe('true');
    expect(within(strip).getByRole('link', { name: `2 ${t.dashboard.unpaidSubscriptions}` }).getAttribute('href')).toBe('/admin?work=unpaid');
  });

  it('the queue follows ?work: reports by default, tasks when picked', async () => {
    renderPage({ work: 'tasks' });
    expect(await screen.findByRole('heading', { level: 2, name: t.dashboard.tasks })).toBeTruthy();
    expect(await screen.findByRole('button', { name: t.dashboard.taskDone })).toBeTruthy();
    const strip = screen.getByRole('navigation', { name: t.dashboard.kpiStrip });
    expect(within(strip).getByRole('link', { name: `1 ${t.dashboard.tasks}` }).getAttribute('aria-current')).toBe('true');
  });

  it('the pending reports queue says how many more there are', async () => {
    renderPage();
    expect(await screen.findByText(t.dashboard.more.replace('{n}', '22'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t.reports.open }).getAttribute('href')).toBe('/admin/students/s1/reports/l1');
  });

  it('a failed read says so instead of showing zeros', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', t.dashboard.loadFailed);
  });

  it('opens with today: four numbers, today\'s lessons, the work queue and the latest messages', async () => {
    renderPage();
    const today = await screen.findByRole('region', { name: t.dashboard.home.today });
    expect(await within(today).findByRole('link', { name: `${t.dashboard.home.lessonsToday} 0` })).toBeTruthy();
    expect(within(today).getByRole('link', { name: `${t.dashboard.unpaidSubscriptions} 2` }).getAttribute('href')).toBe('/admin?work=unpaid');
    expect(screen.getByRole('heading', { name: t.dashboard.home.todayList })).toBeTruthy();
    expect(await screen.findByText(t.dashboard.home.todayEmpty)).toBeTruthy();
    expect(await screen.findByText(t.dashboard.home.inboxEmpty)).toBeTruthy();
    expect(screen.getByRole('group', { name: t.dashboard.home.quick })).toBeTruthy();
  });

  it('payouts export defaults to the month that just ended', () => {
    expect(previousMonth('2026-10-02')).toBe('2026-09');
    expect(previousMonth('2026-01-15')).toBe('2025-12');
  });
});

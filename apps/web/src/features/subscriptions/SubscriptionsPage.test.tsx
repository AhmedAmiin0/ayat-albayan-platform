import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { WEEKLY } from './money-fixture';
import { parseSubscriptionsSearch, type SubscriptionsUrlSearch } from './search';
import { SubscriptionsPage } from './SubscriptionsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const TASK = {
  id: 'k1', kind: 'renewal_due', subject_type: 'subscription', subject_id: 'sub-1', student: WEEKLY.student,
  title: 'بقيت حلقتان', due_at: null, done_at: null, created_at: '2026-10-02T09:00:00Z',
};
const page = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20 });

function route(path: string) {
  if (path.startsWith('/admin-tasks')) return page([TASK]);
  if (path.startsWith('/students?')) return page([{ ...WEEKLY.student, guardian_name: 'أم سهيلة', status: 'active' }]);
  return page([WEEKLY]);
}

/** The route: the URL search in state, each patch re-validated. */
function Harness({ onChange }: { onChange: (patch: Record<string, unknown>) => void }) {
  const [search, setSearch] = useState<SubscriptionsUrlSearch>({ page: 2 });
  const onSearch = (patch: Record<string, unknown>) => (onChange(patch), setSearch((s) => parseSubscriptionsSearch({ ...s, ...patch })));
  return <SubscriptionsPage search={search} onSearch={onSearch} onOpenStudent={vi.fn()} />;
}

function renderPage() {
  apiFetch.mockImplementation(async (path: string) => route(path));
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness onChange={onChange} />
    </QueryClientProvider>,
  );
  return { onChange };
}

describe('SubscriptionsPage (R-SUB-01/02)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('rows: student, package, price + paid, the package line, status; the open tasks', async () => {
    renderPage();
    const row = (await screen.findByRole('button', { name: 'سهيلة' })).closest('tr');
    if (!row) throw new Error('row missing');
    const cells = within(row);
    expect(cells.getByText(t.enums.packageSize['4'])).toBeTruthy();
    expect(cells.getByText('بقيت حلقتان')).toBeTruthy();
    expect(cells.getByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
    // The task never repeats the balance it was raised with (it can be stale); the row above has it live.
    expect(await screen.findByText('باقة سهيلة قاربت على الانتهاء')).toBeTruthy();
  });

  it('filters by status from the first page', async () => {
    const { onChange } = renderPage();
    fireEvent.change(await screen.findByRole('combobox', { name: t.subscriptions.status }), { target: { value: 'unpaid' } });
    expect(onChange).toHaveBeenCalledWith({ status: 'unpaid', page: undefined });
  });

  it('sorts by price and filters by the student name server-side (R-NFR-08)', async () => {
    const { onChange } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: t.subscriptions.price }));
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/subscriptions?sort=price&page=1&pageSize=20'));
    const by = t.table.filterBy.replace('{col}', t.subscriptions.package);
    fireEvent.change(screen.getByRole('combobox', { name: by }), { target: { value: '8' } });
    expect(onChange).toHaveBeenLastCalledWith({ f_package: '8', page: undefined });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/subscriptions?sort=price&package=8&page=1&pageSize=20'));
  });

  it('a task is marked done', async () => {
    renderPage();
    apiSend.mockResolvedValue({});
    fireEvent.click(await screen.findByRole('button', { name: t.dashboard.taskDone }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/admin-tasks/k1/done'));
  });

  it('new package: pick the student, the API quote is shown, saved with calculator inputs only', async () => {
    renderPage();
    apiSend.mockImplementation(async (_m: string, path: string) => (path === '/subscriptions/quote' ? WEEKLY.price_source : WEEKLY));
    fireEvent.click(await screen.findByRole('button', { name: t.subscriptions.new }));
    const dialog = await screen.findByRole('dialog', { name: t.subscriptions.new });
    fireEvent.change(within(dialog).getByRole('searchbox'), { target: { value: 'سهي' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /سهيلة/ }));
    expect(await within(dialog).findByText('145')).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/subscriptions/quote', {
      studentId: 'stu-1',
      pricing: { tier: 'standard', duration: 45, discount: 0 },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.save }));
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('POST', '/subscriptions', expect.objectContaining({ studentId: 'stu-1', notes: null })),
    );
    const body = apiSend.mock.calls.find((c) => c[1] === '/subscriptions')?.[2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('price');
  });
});

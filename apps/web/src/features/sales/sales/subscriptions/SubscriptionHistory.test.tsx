import { fireEvent, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { history, HISTORY_ID } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesSubscriptions } from './SalesSubscriptions';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const CONFIRMED = [{ id: HISTORY_ID, student: { id: 's1', code: 'AB-0183', name: 'سهيلة' }, package: '8', status: 'active', starts_on: '2026-09-01', lessons_total: 8 }];

/** The route's `kind` and `history` as local state, like /sales/subscriptions?kind=confirmed&history=. */
function Harness({ kind = 'confirmed' as const }: { kind?: 'confirmed' | 'pending' }) {
  const [open, setOpen] = useState<string | null>(null);
  return <SalesSubscriptions kind={kind} onKind={() => undefined} history={open ?? undefined} onHistory={setOpen} />;
}

afterEach(() => apiFetch.mockReset());

describe('a confirmed subscription’s history («السجل»)', () => {
  it('opens from the row: every subscription of the student, lessons, status changes and payments with their amount', async () => {
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('/history') ? history() : CONFIRMED));
    renderWithQuery(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: t.sales.history.openFor.replace('{name}', 'سهيلة') }));
    const section = await screen.findByRole('region', { name: t.sales.history.title.replace('{name}', 'سهيلة') });
    expect(apiFetch).toHaveBeenCalledWith(`/sales/subscriptions/${HISTORY_ID}/history`);
    expect(await within(section).findByText(t.sales.history.current)).toBeTruthy();
    expect(within(section).getAllByRole('listitem').filter((li) => li.className.includes('rounded-md'))).toHaveLength(2);
    expect(within(section).getByText(/3/, { selector: 'p' }).textContent).toContain(t.sales.history.remaining.replace('{n}', '5'));
    expect(within(section).getByText(t.sales.history.changed.replace('{from}', t.enums.subscriptionStatus.unpaid).replace('{to}', t.enums.subscriptionStatus.active), { exact: false })).toBeTruthy();
    expect(within(section).getByText(t.enums.paymentKind.payment, { exact: false })).toBeTruthy();
    expect(within(section).getByText('1,290').closest('li')?.textContent).toMatch(/1,290\s+ر\.س/);
    expect(section.textContent).not.toMatch(/SAR|١/);
    fireEvent.click(within(section).getByRole('button', { name: t.sales.history.close }));
    expect(screen.queryByRole('region', { name: t.sales.history.title.replace('{name}', 'سهيلة') })).toBeNull();
  });

  it('only on «مؤكدة»: the pending list has no history button', async () => {
    apiFetch.mockResolvedValue(CONFIRMED.map((s) => ({ ...s, status: 'unpaid' })));
    renderWithQuery(<Harness kind="pending" />);
    expect(await screen.findByText('سهيلة')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.sales.history.open })).toBeNull();
  });
});

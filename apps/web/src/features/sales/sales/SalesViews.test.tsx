import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithQuery } from './academy.test-utils';
import { SalesMoney } from './money/SalesMoney';
import { SalesStudents } from './students/SalesStudents';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => apiFetch.mockReset());

const views = (label: string) => screen.getByRole('group', { name: label });

describe('«الطلاب» and «محفظتي»: one page each, the old pages are view filters (owner 2026-10-12)', () => {
  it('«الطلاب» shows every student; «طلابي» is the filter beside the title', async () => {
    apiFetch.mockResolvedValue({ items: [], total: 0 });
    const onView = vi.fn();
    renderWithQuery(<SalesStudents view="all" onView={onView} />);
    expect(screen.getByRole('heading', { level: 1, name: t.sales.nav.allStudents })).toBeTruthy();
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/sales/students/all?page=1&pageSize=25'));
    expect(views(t.sales.views.students)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.assistantPortal.nav.students }));
    expect(onView).toHaveBeenCalledWith('mine');
  });

  it('the «طلابي» view lists the students I brought', async () => {
    apiFetch.mockResolvedValue([]);
    renderWithQuery(<SalesStudents view="mine" onView={vi.fn()} />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/sales/me/students'));
    expect(screen.getByRole('button', { name: t.assistantPortal.nav.students }).getAttribute('aria-pressed')).toBe('true');
  });

  it('«محفظتي» shows my commissions; «الكشوف» and «مدفوعاتي» are its filters', async () => {
    apiFetch.mockReturnValue(new Promise(() => {})); // the earnings stay loading: only the head is under test
    const onView = vi.fn();
    const { unmount } = renderWithQuery(<SalesMoney view="earnings" onView={onView} />);
    expect(screen.getByRole('heading', { level: 1, name: t.assistantPortal.nav.earnings })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.assistantPortal.nav.payments }));
    expect(onView).toHaveBeenCalledWith('payments');
    fireEvent.click(screen.getByRole('button', { name: t.assistantPortal.wallet.views.statements }));
    expect(onView).toHaveBeenCalledWith('statements');
    unmount();
    apiFetch.mockResolvedValue([]);
    renderWithQuery(<SalesMoney view="payments" onView={vi.fn()} />);
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/sales/me/payments'));
  });
});

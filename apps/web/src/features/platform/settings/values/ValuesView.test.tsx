import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { findRow, hasRow, renderValues } from './values-test-utils';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const v = t.settingsValues;
const table = () => screen.getByRole('table');

afterEach(() => apiFetch.mockReset());

describe('«القيم» — one group per view', () => {
  it('a missing group opens the first one; the caption names it with its count', async () => {
    renderValues(apiFetch);
    expect(await screen.findByRole('heading', { name: v.title })).toBeTruthy();
    await waitFor(() => expect(table().getAttribute('aria-busy')).toBeNull());
    const caption = table().querySelector('caption');
    expect(caption?.textContent).toContain(t.settings.sections.schedule);
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(Object.values(v.cols));
    expect(await findRow(t.settings.bookingHorizonWeeks)).toBeTruthy();
    expect(hasRow(t.settings.reportingCurrency)).toBe(false);
  });

  it('the group list switches the view and puts the group in the search', async () => {
    const { searches } = renderValues(apiFetch);
    const nav = await screen.findByRole('navigation', { name: v.groupsNav });
    fireEvent.click(within(nav).getByRole('button', { name: new RegExp(t.settings.sections.accounts) }));
    expect(searches.at(-1)).toEqual({ group: 'accounts' });
    expect(await findRow(t.settings.reportingCurrency)).toBeTruthy();
    expect(within(nav).getByText(v.ownedHeading)).toBeTruthy();
  });

  it('search lists «الكل» with the group name under each label; «امسح البحث» returns to the group', async () => {
    const { searches } = renderValues(apiFetch, { search: { group: 'reports' } });
    await findRow(t.settings.reportTeacherEditHours);
    fireEvent.change(screen.getByLabelText(v.searchLabel), { target: { value: 'fx_fresh' } });
    expect(await findRow(t.settings.fxFreshHours)).toBeTruthy();
    expect(table().querySelector('caption')?.textContent).toContain(v.all);
    expect(within(table()).getByText(t.settings.sections.accounts)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: v.clearSearch }));
    expect(searches.at(-1)).toEqual({ group: 'reports' });
  });

  it('a search with no match says so and offers «امسح البحث»', async () => {
    renderValues(apiFetch, { search: { q: 'zzzz-nothing' } });
    expect(await screen.findByText(v.empty)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('button', { name: v.clearSearch })).toBeTruthy();
  });

  it('the filter «المعدَّلة فقط» lists the changed values from every group', async () => {
    renderValues(apiFetch, { search: { filter: 'modified' }, settings: { fx_fresh_hours: 6, upload_max_mb: 3 } });
    await waitFor(() => expect(within(table()).getAllByRole('rowheader')).toHaveLength(2));
    expect(screen.getByRole('button', { name: new RegExp(v.filterModified) }).getAttribute('aria-pressed')).toBe('true');
  });

  it('loading: skeleton rows and aria-busy on the table (no role=status)', () => {
    renderValues(apiFetch, { settingsState: 'pending' });
    expect(table().getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a load error shows «تعذّر تحميل القيم» and «أعد المحاولة» refetches', async () => {
    renderValues(apiFetch, { settingsState: 'error' });
    expect(await screen.findByText(v.loadError)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    const before = apiFetch.mock.calls.filter(([p]) => p === '/settings').length;
    fireEvent.click(screen.getByRole('button', { name: v.retry }));
    await waitFor(() => expect(apiFetch.mock.calls.filter(([p]) => p === '/settings').length).toBeGreaterThan(before));
  });
});

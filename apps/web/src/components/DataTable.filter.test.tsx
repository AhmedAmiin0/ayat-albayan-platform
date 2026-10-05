import { createColumnHelper } from '@tanstack/react-table';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { closeFilters, openFilters } from '@/test/open-filters';
import { FILTER_DEBOUNCE_MS } from './ColumnFilterText';
import { DataTable, type DataTableFeatures } from './DataTable';

type Row = { id: string; name: string; status: string };

const col = createColumnHelper<DataTableFeatures, Row>();
const options = [
  { value: 'active', label: 'مشترك' },
  { value: 'paused', label: 'موقوف' },
];
const columns = col.columns([
  col.accessor('name', { header: () => t.students.name, meta: { filter: { kind: 'text' } } }),
  col.accessor('status', { header: 'الحالة', meta: { filter: { kind: 'select', options }, filterKey: 'st' } }),
]);
const DATA: Row[] = [
  { id: 'a', name: 'فاطمة', status: 'active' },
  { id: 'b', name: 'أحمد', status: 'paused' },
  { id: 'c', name: 'فاطمه علي', status: 'paused' },
];
const by = (col: string) => t.table.filterBy.replace('{col}', col);
const names = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);

describe('DataTable filters', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no filter props → no toolbar', () => {
    render(<DataTable columns={columns} data={DATA} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('button', { name: new RegExp(`^${t.table.filter}`) })).toBeNull();
  });

  it('the text filter is the search box; the select waits in the «تصفية» panel', () => {
    render(<DataTable clientFilter columns={columns} data={DATA} getRowId={(r) => r.id} />);
    const search = screen.getByRole('searchbox', { name: by(t.students.name) });
    expect(search.getAttribute('placeholder')).toBe(t.table.searchIn.replace('{col}', t.students.name));
    expect(screen.queryByRole('combobox')).toBeNull();
    const panel = openFilters();
    expect(panel.querySelector('select')?.getAttribute('aria-label')).toBe(by('الحالة'));
  });

  it('clientFilter: text contains (Arabic-normalised), select exact, clear restores', () => {
    render(<DataTable clientFilter columns={columns} data={DATA} getRowId={(r) => r.id} />);
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.students.name) }), { target: { value: 'فاطمة' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(names()).toEqual(['فاطمة', 'فاطمه علي']);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by('الحالة') }), { target: { value: 'paused' } });
    expect(names()).toEqual(['فاطمه علي']);
    // «مسح الكل» clears the panel's filters; the search box keeps its text.
    closeFilters();
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(names()).toEqual(['فاطمة', 'فاطمه علي']);
  });

  it('server filters: values by filterKey (default column id); onChange reports, rows untouched', () => {
    const onChange = vi.fn();
    render(<DataTable columns={columns} data={DATA} filters={{ values: { st: 'active' }, onChange }} />);
    openFilters();
    expect((screen.getByRole('combobox', { name: by('الحالة') }) as HTMLSelectElement).value).toBe('active');
    expect(names()).toHaveLength(3);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'أحمد' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(onChange).toHaveBeenCalledWith('name', 'أحمد');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'paused' } });
    expect(onChange).toHaveBeenLastCalledWith('st', 'paused');
  });

  it('the panel names the rows left: a client table counts its own, a server list brings `toolbar.total`', () => {
    const { unmount } = render(<DataTable clientFilter columns={columns} data={DATA} getRowId={(r) => r.id} />);
    openFilters();
    fireEvent.change(screen.getByRole('combobox', { name: by('الحالة') }), { target: { value: 'paused' } });
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '2') })).toBeTruthy();
    unmount();
    render(<DataTable columns={columns} data={DATA} filters={{ values: {}, onChange: vi.fn() }} toolbar={{ total: 41 }} />);
    openFilters();
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '41') })).toBeTruthy();
  });

  it('a server list without a total says only «عرض النتائج» (the page is not the result)', () => {
    render(<DataTable columns={columns} data={DATA} filters={{ values: { st: 'active' }, onChange: vi.fn() }} />);
    openFilters();
    expect(screen.getByRole('button', { name: t.table.showResults })).toBeTruthy();
  });

  it('server «مسح الكل» calls onClear once with the panel keys', () => {
    const onClear = vi.fn();
    render(<DataTable columns={columns} data={DATA} filters={{ values: { st: 'active' }, onChange: vi.fn(), onClear }} />);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(onClear).toHaveBeenCalledWith(['st']);
  });
});

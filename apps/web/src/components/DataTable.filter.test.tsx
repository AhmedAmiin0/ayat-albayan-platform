import { createColumnHelper } from '@tanstack/react-table';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
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

  it('no filter props → no filter row', () => {
    render(<DataTable columns={columns} data={DATA} />);
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('clientFilter: text contains (Arabic-normalised), select exact, clear restores', () => {
    render(<DataTable clientFilter columns={columns} data={DATA} getRowId={(r) => r.id} />);
    fireEvent.change(screen.getByRole('searchbox', { name: by(t.students.name) }), { target: { value: 'فاطمة' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(names()).toEqual(['فاطمة', 'فاطمه علي']);
    fireEvent.change(screen.getByRole('combobox', { name: by('الحالة') }), { target: { value: 'paused' } });
    expect(names()).toEqual(['فاطمه علي']);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearFilters }));
    expect(names()).toEqual(['فاطمة', 'أحمد', 'فاطمه علي']);
  });

  it('server filters: values by filterKey (default column id); onChange reports, rows untouched', () => {
    const onChange = vi.fn();
    render(<DataTable columns={columns} data={DATA} filters={{ values: { st: 'active' }, onChange }} />);
    expect((screen.getByRole('combobox', { name: by('الحالة') }) as HTMLSelectElement).value).toBe('active');
    expect(names()).toHaveLength(3);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'أحمد' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS));
    expect(onChange).toHaveBeenCalledWith('name', 'أحمد');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'paused' } });
    expect(onChange).toHaveBeenLastCalledWith('st', 'paused');
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ColumnFilters, type ColumnFilterControl } from './ColumnFilters';
import { FILTER_DEBOUNCE_MS } from './ColumnFilterText';

const by = (col: string) => t.table.filterBy.replace('{col}', col);

function controls(values: { name?: string; status?: string }, onChange = vi.fn()): ColumnFilterControl[] {
  return [
    { id: 'name', label: 'الاسم', filter: { kind: 'text' }, value: values.name ?? '', onChange: (v) => onChange('name', v) },
    {
      id: 'status',
      label: 'الحالة',
      filter: { kind: 'select', options: [{ value: 'active', label: 'مشترك' }] },
      value: values.status ?? '',
      onChange: (v) => onChange('status', v),
    },
  ];
}

describe('ColumnFilters', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing without filterable columns', () => {
    const { container } = render(<ColumnFilters controls={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('text: reports the trimmed value once typing pauses for 300ms', () => {
    const onChange = vi.fn();
    render(<ColumnFilters controls={controls({}, onChange)} />);
    const box = screen.getByRole('searchbox', { name: by('الاسم') });
    expect(box.getAttribute('placeholder')).toBe(t.table.searchPlaceholder);
    fireEvent.change(box, { target: { value: 'سه' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));
    fireEvent.change(box, { target: { value: 'سهيلة ' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('name', 'سهيلة');
  });

  it('select: «الكل» is no filter, an option reports at once', () => {
    const onChange = vi.fn();
    render(<ColumnFilters controls={controls({ status: 'active' }, onChange)} />);
    const select = screen.getByRole('combobox', { name: by('الحالة') }) as HTMLSelectElement;
    expect(select.value).toBe('active');
    expect(select.options[0]?.textContent).toBe(t.table.all);
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('status', '');
  });

  it('«مسح التصفية» shows only when a filter is set and clears every set one', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColumnFilters controls={controls({}, onChange)} />);
    expect(screen.queryByRole('button', { name: t.table.clearFilters })).toBeNull();
    rerender(<ColumnFilters controls={controls({ name: 'جود', status: 'active' }, onChange)} />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('جود');
    fireEvent.click(screen.getByRole('button', { name: t.table.clearFilters }));
    expect(onChange.mock.calls).toEqual([
      ['name', ''],
      ['status', ''],
    ]);
  });

  it('clearing drops a pending keystroke; an outside change replaces the draft', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColumnFilters controls={controls({ status: 'active' }, onChange)} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'هد' } });
    fireEvent.click(screen.getByRole('button', { name: t.table.clearFilters }));
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS * 2));
    expect(onChange.mock.calls).toEqual([['status', '']]);
    rerender(<ColumnFilters controls={controls({ name: 'بلال' }, onChange)} />);
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('بلال');
  });
});

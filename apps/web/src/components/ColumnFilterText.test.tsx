import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ColumnFilterText, FILTER_DEBOUNCE_MS } from './ColumnFilterText';

describe('ColumnFilterText', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reports the trimmed value once typing pauses for 300ms', () => {
    const onChange = vi.fn();
    render(<ColumnFilterText ariaLabel="الاسم" value="" onChange={onChange} />);
    const box = screen.getByRole('searchbox', { name: 'الاسم' });
    expect(box.getAttribute('placeholder')).toBe(t.table.searchPlaceholder);
    fireEvent.change(box, { target: { value: 'سه' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));
    fireEvent.change(box, { target: { value: 'سهيلة ' } });
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS - 1));
    expect(onChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('سهيلة');
  });

  it('leaving the box sends a pending draft at once, and only once', () => {
    const onChange = vi.fn();
    render(<ColumnFilterText ariaLabel="الاسم" value="" onChange={onChange} />);
    const box = screen.getByRole('searchbox');
    fireEvent.change(box, { target: { value: 'هدى' } });
    fireEvent.blur(box);
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS * 2));
    fireEvent.blur(box);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('هدى');
  });

  it('Enter applies the draft at once; Enter on an unchanged box does nothing', () => {
    const onChange = vi.fn();
    render(<ColumnFilterText ariaLabel="الاسم" value="" onChange={onChange} />);
    const box = screen.getByRole('searchbox');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: ' هدى ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledExactlyOnceWith('هدى');
    act(() => vi.advanceTimersByTime(FILTER_DEBOUNCE_MS * 2));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('the stock control height with a leading magnifier: level with the «تصفية» button (no sm:min-h-9)', () => {
    const { container } = render(<ColumnFilterText ariaLabel="الاسم" value="" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox').className).not.toContain('min-h-9');
    expect(screen.getByRole('searchbox').className).toContain('sm:min-h-10');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('an outside change replaces the draft; its own echo does not', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ColumnFilterText ariaLabel="الاسم" value="" onChange={onChange} placeholder="بحث" />);
    const box = screen.getByRole('searchbox') as HTMLInputElement;
    expect(box.placeholder).toBe('بحث');
    rerender(<ColumnFilterText ariaLabel="الاسم" value="بلال" onChange={onChange} />);
    expect(box.value).toBe('بلال');
  });
});

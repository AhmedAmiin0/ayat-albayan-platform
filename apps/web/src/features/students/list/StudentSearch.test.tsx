import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StudentSearch } from './StudentSearch';

describe('StudentSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('plain: searches on Enter only', () => {
    const onSearch = vi.fn();
    render(<StudentSearch initial="" onSearch={onSearch} />);
    const box = screen.getByRole('textbox', { name: t.common.search });
    fireEvent.change(box, { target: { value: ' سهيلة ' } });
    act(() => void vi.advanceTimersByTime(1000));
    expect(onSearch).not.toHaveBeenCalled();
    fireEvent.submit(box.closest('form') as HTMLFormElement);
    expect(onSearch).toHaveBeenCalledWith('سهيلة');
  });

  it('live: searches 300 ms after the last key, once', () => {
    const onSearch = vi.fn();
    render(<StudentSearch initial="" onSearch={onSearch} live />);
    const box = screen.getByRole('textbox', { name: t.common.search });
    fireEvent.change(box, { target: { value: 'سه' } });
    act(() => void vi.advanceTimersByTime(200));
    fireEvent.change(box, { target: { value: 'سهيلة' } });
    act(() => void vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('سهيلة');
  });
});

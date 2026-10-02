import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { PeriodFilter } from './PeriodFilter';

const VALUE = { from: '2026-05-01', to: '2026-10-02' };

describe('PeriodFilter (one filter row, Riyadh days)', () => {
  it('applies a valid range', () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={VALUE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(t.dashboard.from), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-10-02' });
  });

  it('a reversed range is refused with the API wording, and nothing is fetched', () => {
    const onChange = vi.fn();
    render(<PeriodFilter value={VALUE} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(t.dashboard.to), { target: { value: '2026-04-01' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(screen.getByRole('alert').textContent).toBe(t.dashboard.error.invalid_range);
    expect(screen.getByLabelText(t.dashboard.to).getAttribute('aria-invalid')).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('more than a year is range_too_large', () => {
    render(<PeriodFilter value={VALUE} onChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(t.dashboard.from), { target: { value: '2024-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.search }));
    expect(screen.getByRole('alert').textContent).toBe(t.dashboard.error.range_too_large);
  });
});

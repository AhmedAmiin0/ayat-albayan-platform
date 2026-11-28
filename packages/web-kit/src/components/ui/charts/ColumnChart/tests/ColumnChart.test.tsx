import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColumnChart } from '@ab/web-kit/components/ui/charts/ColumnChart';

const MONTHS = [
  { key: '2026-01', label: 'يناير' },
  { key: '2026-02', label: 'فبراير' },
];
const IN = { key: 'in', label: 'الإيرادات', values: [10, 20] };
const OUT = { key: 'out', label: 'المصروفات', values: [5, 0] };

const column = (c: HTMLElement, month: string, key: string) =>
  c.querySelector<HTMLElement>(`[data-month="${month}"] [data-column="${key}"]`);

describe('ColumnChart', () => {
  it('is one named image whose values are left to the figure table', () => {
    render(<ColumnChart label="حسب الشهر" months={MONTHS} series={[IN]} />);
    expect(screen.getByRole('img', { name: 'حسب الشهر' })).toBeTruthy();
  });

  it('keeps months in the given order, oldest first, so it sits at inline-start', () => {
    const { container } = render(<ColumnChart label="x" months={MONTHS} series={[IN]} />);
    const keys = [...container.querySelectorAll('[data-month]')].map((m) => m.getAttribute('data-month'));
    expect(keys).toEqual(['2026-01', '2026-02']);
  });

  it('groups one column per series in each month, scaled to the largest value', () => {
    const { container } = render(<ColumnChart label="x" months={MONTHS} series={[IN, OUT]} />);
    expect(column(container, '2026-02', 'in')?.style.blockSize).toBe('100%');
    expect(column(container, '2026-01', 'in')?.style.blockSize).toBe('50%');
    expect(column(container, '2026-01', 'out')?.style.blockSize).toBe('25%');
    expect(column(container, '2026-02', 'out')?.style.blockSize).toBe('0%');
  });

  it('draws series in neutral inks, never a status colour', () => {
    const { container } = render(<ColumnChart label="x" months={MONTHS} series={[IN, OUT]} />);
    expect(column(container, '2026-01', 'in')?.className).toMatch(/bg-ink-3/);
    expect(column(container, '2026-01', 'out')?.className).toMatch(/bg-ink-2/);
  });

  it('adds a mirrored line and its key only when a line is given', () => {
    const { container, rerender } = render(<ColumnChart label="x" months={MONTHS} series={[IN]} />);
    expect(container.querySelector('[data-series-line]')).toBeNull();
    rerender(<ColumnChart label="x" months={MONTHS} series={[IN]} line={{ ...OUT, label: 'الهامش' }} />);
    expect(container.querySelector('[data-series-line]')?.getAttribute('class')).toMatch(/rtl:-scale-x-100/);
    expect(container.querySelector('[data-key-line]')?.textContent).toBe('الهامش');
  });

  it('treats a missing value as zero', () => {
    const short = { key: 'in', label: 'l', values: [4] };
    const { container } = render(<ColumnChart label="x" months={MONTHS} series={[short]} />);
    expect(column(container, '2026-02', 'in')?.style.blockSize).toBe('0%');
  });
});

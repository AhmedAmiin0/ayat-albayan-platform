import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BarList } from '@ab/web-kit/components/ui/charts/BarList';

const ROWS = [
  { key: 'a', label: 'المصدر أ', value: 8 },
  { key: 'b', label: 'المصدر ب', value: 2, valueLabel: '2 من 8' },
];

describe('BarList', () => {
  it('is a named list that prints every label and value beside its bar', () => {
    render(<BarList label="حسب المصدر" rows={ROWS} />);
    const list = screen.getByRole('list', { name: 'حسب المصدر' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0] as HTMLElement).getByText('8')).toBeTruthy();
    expect(within(items[1] as HTMLElement).getByText('2 من 8')).toBeTruthy();
  });

  it('scales the bars to the largest row, or to a given max', () => {
    const { container, rerender } = render(<BarList label="x" rows={ROWS} />);
    const shares = () =>
      [...container.querySelectorAll('[data-share]')].map((b) => b.getAttribute('data-share'));
    expect(shares()).toEqual(['1.000', '0.250']);
    rerender(<BarList label="x" rows={ROWS} max={16} />);
    expect(shares()).toEqual(['0.500', '0.125']);
  });

  it('turns a label into a 44 px button only when the row can be opened', () => {
    const onSelect = vi.fn();
    render(<BarList label="x" rows={[{ ...ROWS[0], key: 'a', label: 'أ', value: 1, onSelect }]} />);
    const button = screen.getByRole('button', { name: 'أ' });
    expect(button.className).toMatch(/min-h-11/);
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('keeps plain labels as text, not buttons', () => {
    render(<BarList label="x" rows={ROWS} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the empty line, and no list, when there are no rows', () => {
    render(<BarList label="x" rows={[]} empty="لا بيانات" />);
    expect(screen.getByText('لا بيانات')).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('keeps every row on one track of empty bars when all values are zero', () => {
    const { container } = render(
      <BarList label="x" rows={[{ key: 'z', label: 'صفر', value: 0 }]} />,
    );
    expect(container.querySelector('[data-bar-fill]')).toBeNull();
    expect(screen.getByText('0')).toBeTruthy();
  });
});

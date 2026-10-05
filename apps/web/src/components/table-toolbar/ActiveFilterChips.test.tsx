import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ActiveFilterChips } from './ActiveFilterChips';

describe('ActiveFilterChips', () => {
  it('renders nothing while no filter is set', () => {
    const { container } = render(<ActiveFilterChips chips={[]} onClearAll={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('«{label}: {value}» chips, each removable by a named button, then «مسح الكل»', () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(<ActiveFilterChips chips={[{ id: 'kind', label: 'النوع', value: 'استرداد', onRemove }]} onClearAll={onClearAll} />);
    const list = screen.getByRole('list', { name: t.table.activeFilters });
    expect(list.textContent).toContain('النوع: استرداد');
    fireEvent.click(screen.getByRole('button', { name: t.table.removeFilter.replace('{filter}', 'النوع: استرداد') }));
    expect(onRemove).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });
});

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

  it('a chip is 44px tall on phones (32px from 640px) with a visible × target, logical padding only', () => {
    render(<ActiveFilterChips chips={[{ id: 'k', label: 'النوع', value: 'استرداد', onRemove: vi.fn() }]} onClearAll={vi.fn()} />);
    const chip = screen.getByRole('button', { name: new RegExp(t.table.removeFilter.split('{')[0] ?? '') });
    expect(chip.className).toContain('max-sm:min-h-11');
    expect(chip.className).toContain('min-h-8');
    expect(chip.className).toMatch(/\bps-3\b/);
    expect(chip.className).not.toMatch(/\b(?:pl|pr|ml|mr)-/);
    const x = chip.querySelector('[aria-hidden="true"]');
    expect(x?.className).toContain('size-5');
    expect(x?.querySelector('svg')).not.toBeNull();
  });

  it('a long value truncates inside the chip instead of widening the row', () => {
    render(<ActiveFilterChips chips={[{ id: 'k', label: 'المعلم', value: 'عبد الرحمن بن محمد الأنصاري الحسيني', onRemove: vi.fn() }]} onClearAll={vi.fn()} />);
    const chip = screen.getByRole('button', { name: new RegExp(t.table.removeFilter.split('{')[0] ?? '') });
    expect(chip.className).toContain('max-w-full');
    expect(chip.querySelector('.truncate')?.textContent).toContain('الحسيني');
    expect(chip.closest('li')?.className).toContain('min-w-0');
  });
});

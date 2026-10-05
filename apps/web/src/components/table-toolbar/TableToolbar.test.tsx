import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { openFilters } from '@/test/open-filters';
import { TableToolbar } from './TableToolbar';
import type { FilterChip } from './types';

const chip = (onRemove = vi.fn()): FilterChip => ({ id: 'teacher', label: 'المعلم', value: 'أبرار', onRemove });
const chipName = t.table.removeFilter.replace('{filter}', t.table.activeFilter.replace('{label}', 'المعلم').replace('{value}', 'أبرار'));

describe('TableToolbar', () => {
  it('nothing without a search, fields or action', () => {
    const { container } = render(<TableToolbar chips={[]} onClearAll={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('search box and «تصفية»; no chip row and no count while nothing is set', () => {
    render(<TableToolbar search={<input aria-label="بحث" />} fields={<p>حقول</p>} chips={[]} onClearAll={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: 'بحث' })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.table.filter }).getAttribute('aria-haspopup')).toBe('dialog');
    expect(screen.queryByRole('list', { name: t.table.activeFilters })).toBeNull();
    expect(screen.queryByText('حقول')).toBeNull();
  });

  it('the button counts the set filters; the panel holds the fields and closes on «عرض النتائج»', () => {
    render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} onClearAll={vi.fn()} />);
    const button = screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) });
    expect(button.textContent).toContain(t.table.activeCount.replace('{n}', '1'));
    const panel = openFilters();
    expect(panel.textContent).toContain('حقول');
    fireEvent.click(screen.getByRole('button', { name: t.table.showResults }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a chip removes its filter; «مسح الكل» (row or panel) clears them all', () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(<TableToolbar fields={<p>حقول</p>} chips={[chip(onRemove)]} onClearAll={onClearAll} />);
    expect(screen.getByRole('list', { name: t.table.activeFilters }).textContent).toContain('المعلم: أبرار');
    fireEvent.click(screen.getByRole('button', { name: chipName }));
    expect(onRemove).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    openFilters();
    const [, inPanel] = screen.getAllByRole('button', { name: t.table.clearAll });
    if (inPanel) fireEvent.click(inPanel);
    expect(onClearAll).toHaveBeenCalledTimes(2);
  });

  it('no «تصفية» without panel fields; the action sits at the end', () => {
    render(<TableToolbar search={<input aria-label="بحث" />} end={<button type="button">إضافة</button>} chips={[]} onClearAll={vi.fn()} />);
    expect(screen.queryByRole('button', { name: new RegExp(`^${t.table.filter}`) })).toBeNull();
    expect(screen.getByRole('button', { name: 'إضافة' })).toBeTruthy();
  });
});

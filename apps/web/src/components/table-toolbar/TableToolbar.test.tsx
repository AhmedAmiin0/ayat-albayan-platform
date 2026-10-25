import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { closeFilters, liveSummary, openFilters } from '@/test/open-filters';
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

  it('compact (the inbox list): a smaller search basis and «تصفية» as an icon, still named «تصفية»', () => {
    render(<TableToolbar compact search={<input aria-label="بحث" />} fields={<p>حقول</p>} chips={[]} onClearAll={vi.fn()} end={<b>تبويبات</b>} />);
    const button = screen.getByRole('button', { name: t.table.filter });
    expect(button.querySelector('.sr-only')?.textContent).toBe(t.table.filter);
    const box = screen.getByRole('textbox', { name: 'بحث' }).parentElement;
    expect(box?.className).toContain('basis-24');
    expect(box?.className).not.toContain('basis-44');
  });

  it('the button counts the set filters; the panel holds the fields and closes on «عرض النتائج»', () => {
    render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} onClearAll={vi.fn()} />);
    const button = screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) });
    expect(button.textContent).toContain(t.table.activeCount.replace('{n}', '1'));
    const panel = openFilters();
    expect(panel.textContent).toContain('حقول');
    closeFilters();
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

  it('applied state: «تصفية» is tinted green with a count badge only while a filter is set', () => {
    const { rerender } = render(<TableToolbar fields={<p>حقول</p>} chips={[]} onClearAll={vi.fn()} />);
    const button = screen.getByRole('button', { name: t.table.filter });
    expect(button.getAttribute('data-applied')).toBeNull();
    expect(button.className).not.toContain('border-lapis');
    rerender(<TableToolbar fields={<p>حقول</p>} chips={[chip(), { ...chip(), id: 'kind' }]} onClearAll={vi.fn()} />);
    const applied = screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) });
    expect(applied.getAttribute('data-applied')).toBe('true');
    for (const c of ['border-lapis', 'bg-accent']) expect(applied.className).toContain(c);
    expect(applied.querySelector('[aria-hidden="true"].rounded-full')?.textContent).toBe('2');
  });

  it('announces the applied filters politely, and that none are left once cleared', () => {
    const { rerender } = render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} resultCount={14} onClearAll={vi.fn()} />);
    const live = liveSummary();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toContain(t.table.activeCount.replace('{n}', '1'));
    expect(live.textContent).toContain('14');
    rerender(<TableToolbar fields={<p>حقول</p>} chips={[]} resultCount={20} onClearAll={vi.fn()} />);
    expect(liveSummary().textContent).toBe(t.table.noFilters);
  });

  it('exactly one live region while the panel is open: a change inside is announced once', () => {
    render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} resultCount={14} onClearAll={vi.fn()} />);
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
    openFilters();
    expect(document.querySelectorAll('[aria-live]')).toHaveLength(1);
    expect(screen.getByRole('dialog').textContent).toContain(t.table.activeCount.replace('{n}', '1')); // the visible footer note
  });

  it('the panel\'s primary button names the rows the filters leave', () => {
    const { rerender } = render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} resultCount={14} onClearAll={vi.fn()} />);
    openFilters();
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '14') })).toBeTruthy();
    rerender(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} resultCount={3} onClearAll={vi.fn()} />);
    expect(screen.getByRole('button', { name: t.table.showResultsCount.replace('{n}', '3') })).toBeTruthy();
    closeFilters();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('no «تصفية» without panel fields; the action sits at the end', () => {
    render(<TableToolbar search={<input aria-label="بحث" />} end={<button type="button">إضافة</button>} chips={[]} onClearAll={vi.fn()} />);
    expect(screen.queryByRole('button', { name: new RegExp(`^${t.table.filter}`) })).toBeNull();
    expect(screen.getByRole('button', { name: 'إضافة' })).toBeTruthy();
  });

  it('removing the last chip, or «مسح الكل» in the row, moves focus to «تصفية» (the removed button is gone)', () => {
    render(<TableToolbar fields={<p>حقول</p>} chips={[chip()]} onClearAll={vi.fn()} />);
    const button = screen.getByRole('button', { name: new RegExp(`^${t.table.filter}`) });
    fireEvent.click(screen.getByRole('button', { name: chipName }));
    expect(document.activeElement).toBe(button);
    button.blur();
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(document.activeElement).toBe(button);
  });
});

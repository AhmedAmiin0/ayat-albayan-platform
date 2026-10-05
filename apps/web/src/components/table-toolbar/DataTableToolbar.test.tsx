import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { clearAllFilters, openFilters } from '@/test/open-filters';
import { filterByLabel } from './ControlField';
import { DataTableToolbar } from './DataTableToolbar';
import type { ColumnFilterControl } from './types';

const ctl = (id: string, patch: Partial<ColumnFilterControl> = {}): ColumnFilterControl => ({
  id,
  key: id,
  label: id,
  filter: { kind: 'text' },
  value: '',
  onChange: vi.fn(),
  ...patch,
});

describe('DataTableToolbar', () => {
  it('a page search replaces the column one; every column filter then sits in the panel', () => {
    render(<DataTableToolbar controls={[ctl('code')]} options={{ search: <input aria-label="بحث الصفحة" /> }} />);
    expect(screen.getByRole('textbox', { name: 'بحث الصفحة' })).toBeTruthy();
    expect(screen.queryByRole('searchbox', { name: filterByLabel('code') })).toBeNull();
    openFilters();
    expect(screen.getByRole('searchbox', { name: filterByLabel('code') })).toBeTruthy();
  });

  it('extra filters come first in the panel and the chips; «مسح الكل» hands them the panel keys', () => {
    const onClearAll = vi.fn();
    const extra = { fields: <p>حقول الصفحة</p>, chips: [{ id: 'm', label: 'الشهر', value: '10', onRemove: vi.fn() }], onClearAll };
    render(<DataTableToolbar controls={[ctl('name'), ctl('note', { value: 'x' })]} options={{ extra }} />);
    expect(screen.getByRole('list', { name: t.table.activeFilters }).textContent).toMatch(/الشهر: 10.*note: x/);
    expect(openFilters().textContent).toContain('حقول الصفحة');
    clearAllFilters();
    expect(onClearAll).toHaveBeenCalledWith(['note']);
  });

  it('without onClear (client tables) «مسح الكل» clears each set panel filter', () => {
    const note = ctl('note', { value: 'x' });
    render(<DataTableToolbar controls={[ctl('name'), note]} />);
    fireEvent.click(screen.getByRole('button', { name: t.table.clearAll }));
    expect(note.onChange).toHaveBeenCalledWith('');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import type { ColumnFilterDef } from '../data-table-features';
import { ControlField, filterByLabel } from './ControlField';

const base = { id: 'x', key: 'x', label: 'الحالة', value: '' };

describe('ControlField', () => {
  it('a select: visible label, «الكل» first, reports the picked value', () => {
    const onChange = vi.fn();
    const filter: ColumnFilterDef = { kind: 'select', options: [{ value: 'active', label: 'مشترك' }] };
    render(<ControlField control={{ ...base, filter, onChange }} />);
    expect(screen.getByText('الحالة')).toBeTruthy();
    const select = screen.getByRole('combobox', { name: filterByLabel('الحالة') }) as HTMLSelectElement;
    expect(select.options[0]?.textContent).toBe(t.table.all);
    fireEvent.change(select, { target: { value: 'active' } });
    expect(onChange).toHaveBeenCalledWith('active');
  });

  it('a text filter: a full-width search box', () => {
    render(<ControlField control={{ ...base, label: 'ملاحظة', filter: { kind: 'text' }, onChange: vi.fn() }} />);
    expect(screen.getByRole('searchbox', { name: filterByLabel('ملاحظة') }).className).toContain('w-full');
  });
});

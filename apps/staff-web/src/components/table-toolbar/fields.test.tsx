import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxFilterField, chipIfSet, DateFilterField, SelectFilterField } from './fields';

describe('page filter fields', () => {
  it('a select field: labelled, reports the picked value', () => {
    const onChange = vi.fn();
    const options = [
      { value: '', label: 'الكل' },
      { value: 'cash', label: 'نقدًا' },
    ];
    render(<SelectFilterField label="الطريقة" value={undefined} options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'الطريقة' }), { target: { value: 'cash' } });
    expect(onChange).toHaveBeenCalledWith('cash');
  });

  it('a date field: labelled, LTR, an emptied box reports undefined', () => {
    const onChange = vi.fn();
    render(<DateFilterField label="من" value="2026-10-01" onChange={onChange} />);
    const box = screen.getByLabelText('من');
    expect(box.getAttribute('dir')).toBe('ltr');
    fireEvent.change(box, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('a checkbox field: the whole labelled row toggles it and reports the new state', () => {
    const onChange = vi.fn();
    const { rerender } = render(<CheckboxFilterField label="إظهار الملغاة" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'إظهار الملغاة' });
    expect(box).toHaveProperty('checked', false);
    fireEvent.click(screen.getByText('إظهار الملغاة'));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<CheckboxFilterField label="إظهار الملغاة" checked onChange={onChange} />);
    expect(screen.getByRole('checkbox', { name: 'إظهار الملغاة' })).toHaveProperty('checked', true);
    expect(box.closest('label')?.className).toContain('min-h-11');
  });

  it('a chip only for a set value, showing its display text', () => {
    const onRemove = vi.fn();
    expect(chipIfSet({ id: 'kind', label: 'النوع', value: undefined, onRemove })).toEqual([]);
    expect(chipIfSet({ id: 'kind', label: 'النوع', value: 'refund', text: 'استرداد', onRemove })).toEqual([
      { id: 'kind', label: 'النوع', value: 'استرداد', onRemove },
    ]);
  });
});

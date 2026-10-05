import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { invoiceRangeFilters } from './invoice-range-filters';

describe('invoiceRangeFilters', () => {
  it('a chip per set day; «مسح الكل» drops the range and the column filters in one patch', () => {
    const onChange = vi.fn();
    const extra = invoiceRangeFilters({ search: { from: '2026-09-01' }, onChange });
    expect(extra.chips.map((c) => [c.label, c.value])).toEqual([[t.finance.from, '2026-09-01']]);
    extra.chips[0]?.onRemove();
    expect(onChange).toHaveBeenLastCalledWith({ from: undefined });
    extra.onClearAll(['kind']);
    expect(onChange).toHaveBeenLastCalledWith({ from: undefined, to: undefined, f_kind: undefined });
  });

  it('the panel fields: from and to days', () => {
    render(<>{invoiceRangeFilters({ search: { to: '2026-10-01' }, onChange: vi.fn() }).fields}</>);
    expect((screen.getByLabelText(t.finance.to) as HTMLInputElement).value).toBe('2026-10-01');
    expect(screen.getByLabelText(t.finance.from)).toBeTruthy();
  });
});

import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { useSubscriptionFilters, type SubscriptionFiltersOptions } from './use-subscription-filters';

function Fields(props: SubscriptionFiltersOptions) {
  return <>{useSubscriptionFilters(props).fields}</>;
}

describe('useSubscriptionFilters', () => {
  it('the status select (with «مدفوع جزئيًا») reports a URL patch', () => {
    const onChange = vi.fn();
    render(<Fields status={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox', { name: t.subscriptions.status }), { target: { value: 'partial' } });
    expect(onChange).toHaveBeenCalledWith({ status: 'partial' });
  });

  it('a chip shows the status label; «مسح الكل» also drops the column filters', () => {
    const onChange = vi.fn();
    const extra = renderHook(() => useSubscriptionFilters({ status: 'partial', onChange })).result.current;
    expect(extra.chips.map((c) => c.value)).toEqual([t.finance.partiallyPaid]);
    extra.chips[0]?.onRemove();
    expect(onChange).toHaveBeenLastCalledWith({ status: undefined });
    extra.onClearAll(['student', 'package']);
    expect(onChange).toHaveBeenLastCalledWith({ status: undefined, f_student: undefined, f_package: undefined });
  });
});

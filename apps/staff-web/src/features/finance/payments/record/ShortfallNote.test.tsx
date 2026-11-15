import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShortfallNote, shortfallText } from './ShortfallNote';

// Owner 2026-10-28: a receipt of 80 against 81 due leaves the package «غير مدفوعة»; a note, never a block.
describe('shortfallText', () => {
  it('80 against 81 due: 1 short, in the package currency', () => {
    expect(shortfallText({ amount: 80, due: 81, currencyLabel: 'ر.س' })).toBe(
      'المبلغ أقل من المستحق بـ 1 ر.س، ستبقى الباقة غير مدفوعة حتى يكتمل المبلغ',
    );
  });

  it('an amount that covers what is due: no note', () => {
    expect(shortfallText({ amount: 81, due: 81, currencyLabel: 'ر.س' })).toBeNull();
    expect(shortfallText({ amount: 100, due: 81, currencyLabel: 'ر.س' })).toBeNull();
  });
});

describe('ShortfallNote', () => {
  it('shown for a short typed amount, hidden when nothing to compare', () => {
    const { rerender } = render(<ShortfallNote amount="80" due={81} currencyLabel="ر.س" />);
    expect(screen.getByRole('status').textContent).toContain('1 ر.س');
    rerender(<ShortfallNote amount="80" due={null} currencyLabel="ر.س" />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LedgerPaid } from './LedgerPaid';

describe('LedgerPaid (docs/11 §10)', () => {
  it('names what the per-lesson ledger already paid on an open payout', () => {
    render(<LedgerPaid amount={40} />);
    expect(screen.getByText(/40/)).toBeTruthy();
  });

  it('nothing for zero or for a payout without the field', () => {
    const { container, rerender } = render(<LedgerPaid amount={0} />);
    expect(container.textContent).toBe('');
    rerender(<LedgerPaid amount={undefined} />);
    expect(container.textContent).toBe('');
  });
});

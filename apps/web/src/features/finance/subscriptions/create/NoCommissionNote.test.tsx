import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { NoCommissionNote } from './NoCommissionNote';

const NOW = new Date('2026-11-01T09:00:00Z'); // 12:00 in Riyadh
const note = () => screen.queryByText(t.salesMoney.noCommissionStarted);

describe('NoCommissionNote (owner 2026-10-28)', () => {
  it('a first day before today (Riyadh): shown', () => {
    render(<NoCommissionNote startsOn="2026-10-31" usedBefore={0} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('lessons used before: shown even on today', () => {
    render(<NoCommissionNote startsOn="2026-11-01" usedBefore={1} now={NOW} />);
    expect(note()).not.toBeNull();
  });

  it('today, a future day or no day yet: nothing', () => {
    const { rerender } = render(<NoCommissionNote startsOn="2026-11-01" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
    rerender(<NoCommissionNote startsOn="2026-11-04" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
    rerender(<NoCommissionNote startsOn="" usedBefore={0} now={NOW} />);
    expect(note()).toBeNull();
  });
});

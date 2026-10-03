import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { BalanceCards } from './BalanceCards';
import { EARNINGS } from './fixtures';

describe('BalanceCards', () => {
  it('shows earned, paid and outstanding in EGP with Western digits', () => {
    render(<BalanceCards balance={EARNINGS.balance} />);
    const group = screen.getByTestId('balance-cards');
    const value = (label: string) => within(group).getByText(label).nextElementSibling?.textContent ?? '';
    expect(value(t.teacherEarnings.earned)).toMatch(/^280\s/);
    expect(value(t.teacherEarnings.paid)).toMatch(/^100\s/);
    expect(value(t.teacherEarnings.outstanding)).toMatch(/^180\s/);
    expect(value(t.teacherEarnings.outstanding)).toContain(t.payouts.currency);
    expect(within(group).getByText(t.teacherEarnings.sessionsCount.replace('{n}', '4'))).toBeTruthy();
    expect(group.textContent).not.toMatch(/[٠-٩]/);
  });
});

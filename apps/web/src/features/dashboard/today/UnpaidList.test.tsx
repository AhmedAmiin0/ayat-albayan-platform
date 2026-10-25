import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { WORK } from '../dashboard-fixture';
import { UnpaidList } from './UnpaidList';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../link-mock')).Link }));

const OWES = WORK.unpaid.items[0];
if (!OWES) throw new Error('fixture');

// R-SUB-02: `unpaid` is either money owed or a package paid in full and used up.
describe('UnpaidList says what is due', () => {
  it('money owed: «المتبقي عليها» and the amount still owed, not the price', () => {
    render(<UnpaidList items={[OWES]} />);
    const row = screen.getByRole('listitem');
    expect(row.textContent).toContain(t.dashboard.owes);
    expect(row.textContent).toContain('100');
    expect(row.textContent).not.toContain('145');
    expect(row.textContent).not.toContain(t.dashboard.renewalDue);
  });

  it('paid in full and used up: a renewal, no amount to chase', () => {
    render(<UnpaidList items={[{ ...OWES, paid: 145, owed: 0, reason: 'renewal_due' }]} />);
    const row = screen.getByRole('listitem');
    expect(row.textContent).toContain(t.dashboard.renewalDue);
    expect(row.textContent).not.toContain(t.dashboard.owes);
  });
});

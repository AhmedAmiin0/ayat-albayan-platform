import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TrialHistoryTable } from './TrialHistoryTable';
import { history, row } from './trial-fixture';

const OUTCOMES = ['upcoming', 'moved', 'absent', 'attended', 'cancelled', 'awaiting'] as const;
const six = OUTCOMES.map((outcome, i) => row({ lesson_id: `l${i}`, outcome }));
const table = () => screen.getByTestId('trial-date-history');

describe('TrialHistoryTable (R-STU-05, R-SCH-07)', () => {
  it('lists each date with its teacher, outcome chip and who picked it', () => {
    render(<TrialHistoryTable history={history({ items: six.slice(0, 3) })} />);
    const rows = within(table()).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.textContent).toContain('17:00');
    expect(rows[0]?.textContent).toContain('أبرار');
    expect(rows[0]?.textContent).toContain(t.trialDate.outcome.upcoming);
    expect(rows[1]?.textContent).toContain(t.trialDate.outcome.moved);
    expect(rows[2]?.textContent).toContain(t.trialDate.outcome.absent);
    expect(rows[0]?.textContent).toContain('سارة');
    expect(rows[2]?.querySelector('[data-tone]')?.getAttribute('data-tone')).toBe('bad');
  });

  it('adds the family’s time under each date when their zone differs', () => {
    render(<TrialHistoryTable history={history({ family_tz: 'Europe/London' })} />);
    expect(within(table()).getByText(t.trialDate.familyTime.replace('{time}', 'الاثنين 5 أكتوبر 15:00'))).toBeTruthy();
  });

  it('no family line in the viewer’s own zone', () => {
    render(<TrialHistoryTable history={history()} />);
    expect(screen.queryByText(new RegExp(t.trialDate.familyTime.replace('{time}', '')))).toBeNull();
  });

  it('shows 5 rows, then all behind «عرض كل المواعيد»', () => {
    render(<TrialHistoryTable history={history({ items: six })} />);
    expect(within(table()).getAllByRole('row')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: t.trialDate.web.showAll.replace('{n}', '6') }));
    expect(within(table()).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByRole('button', { name: t.trialDate.web.showFewer })).toBeTruthy();
  });
});

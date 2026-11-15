import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { TrialDateNotes } from './TrialDateNotes';

const UPCOMING = { upcomingId: 'l1', upcomingAt: '2026-10-05T14:00:00.000Z' };

describe('TrialDateNotes (owner 2026-10-25)', () => {
  it('no warning for the 2nd date', () => {
    render(<TrialDateNotes trial={{ ...UPCOMING, count: 1 }} tz="Asia/Riyadh" />);
    expect(screen.queryByTestId('trial-date-warn')).toBeNull();
  });

  it('warns from the 3rd date on, naming its number', () => {
    render(<TrialDateNotes trial={{ ...UPCOMING, count: 2 }} tz="Asia/Riyadh" />);
    expect(screen.getByRole('note').textContent).toBe(t.trialDate.warn.replace('{n}', '3'));
  });

  it('says the upcoming trial moves, with its time', () => {
    render(<TrialDateNotes trial={{ ...UPCOMING, count: 1 }} tz="Asia/Riyadh" />);
    expect(screen.getByText(/الاثنين 5 أكتوبر 17:00/).textContent).toContain(t.trialDate.moves.split('(')[0] ?? '');
  });

  it('without one, a new trial lesson is booked', () => {
    render(<TrialDateNotes trial={{ upcomingId: null, upcomingAt: null, count: 0 }} tz="Asia/Riyadh" />);
    expect(screen.getByText(t.trialDate.newLesson)).toBeTruthy();
  });
});

import { describe, expect, it } from 'vitest';
import { STUDENT_STATUSES } from '../../enums/index.js';
import { canPickTrialDate, trialOutcome, upcomingTrial, warnsTrialDate } from './trial-dates.js';

const NOW = new Date('2026-10-25T12:00:00Z');
const AHEAD = '2026-10-26T15:00:00Z';
const PAST = '2026-10-24T15:00:00Z';
const at = (status: Parameters<typeof trialOutcome>[0]['status'], starts_at = PAST, attendance: Parameters<typeof trialOutcome>[0]['attendance'] = null) =>
  trialOutcome({ status, attendance, starts_at, now: NOW });

describe('trialOutcome', () => {
  it('open: قادمة while ahead, بانتظار التقرير once its time passed', () => {
    expect(at('scheduled', AHEAD)).toBe('upcoming');
    expect(at('confirmed', AHEAD)).toBe('upcoming');
    expect(at('scheduled', PAST)).toBe('awaiting');
  });

  it('held: حضر, unless the student was marked absent / excused on it', () => {
    expect(at('completed')).toBe('attended');
    expect(at('late')).toBe('attended');
    expect(at('completed', PAST, 'on_time')).toBe('attended');
    expect(at('completed', PAST, 'absent')).toBe('absent');
    expect(at('completed', PAST, 'excused')).toBe('absent');
  });

  it('no_show / excused → غاب, cancelled → أُلغيت, rescheduled → نُقلت', () => {
    expect(at('no_show')).toBe('absent');
    expect(at('excused')).toBe('absent');
    expect(at('cancelled_by_admin')).toBe('cancelled');
    expect(at('cancelled_by_teacher')).toBe('cancelled');
    expect(at('rescheduled', AHEAD)).toBe('moved');
  });
});

describe('upcomingTrial', () => {
  it('the earliest open trial still ahead; none when only past or closed ones exist', () => {
    const rows = [
      { id: 'late', status: 'scheduled' as const, starts_at: '2026-10-28T10:00:00Z' },
      { id: 'soon', status: 'confirmed' as const, starts_at: AHEAD },
      { id: 'moved', status: 'rescheduled' as const, starts_at: '2026-10-25T13:00:00Z' },
      { id: 'past', status: 'scheduled' as const, starts_at: PAST },
    ];
    expect(upcomingTrial(rows, NOW)?.id).toBe('soon');
    expect(upcomingTrial(rows.slice(2), NOW)).toBeNull();
  });
});

describe('who may get a new date and when the form warns', () => {
  it('only students without a running subscription', () => {
    const allowed = STUDENT_STATUSES.filter(canPickTrialDate);
    expect(allowed).toEqual(['new', 'trial', 'pending_subscription']);
    expect(canPickTrialDate(null)).toBe(false);
  });

  it('warns from the 3rd date on (two exist already), never before', () => {
    expect(warnsTrialDate(0)).toBe(false);
    expect(warnsTrialDate(1)).toBe(false);
    expect(warnsTrialDate(2)).toBe(true);
    expect(warnsTrialDate(7)).toBe(true);
  });
});

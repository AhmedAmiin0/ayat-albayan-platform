import { describe, expect, it } from 'vitest';
import { stepsOf } from '../../draft/draft';
import { trialDateDraft, trialHint, upcomingRow } from './draft';
import { history, row, UPCOMING_ID } from '../trial-fixture';

const student = { id: 's1', name: 'سهيلة', code: 'AB-0183' };

describe('trialDateDraft (owner 2026-10-25, R-SCH-06)', () => {
  it('books a trial for the one student in the family zone, moving the upcoming trial', () => {
    const d = trialDateDraft({ student, history: history({ family_tz: 'Africa/Cairo' }) });
    expect(d).toMatchObject({ kind: 'trial', pkg: 'trial', students: [student], tz: 'Africa/Cairo', program: 'quran', genderPref: null });
    expect(d.trialDate).toEqual({ upcomingId: UPCOMING_ID, upcomingAt: '2026-10-05T14:00:00.000Z', count: 1 });
  });

  it('takes the profile facts when given', () => {
    const d = trialDateDraft({ student, history: history(), facts: { program: 'arabic', genderPref: 'female', tz: 'Europe/London' } });
    expect(d).toMatchObject({ program: 'arabic', genderPref: 'female', tz: 'Europe/London' });
  });

  it('without an upcoming trial books a new lesson', () => {
    const h = history({ upcoming_id: null, items: [row({ outcome: 'absent' })] });
    expect(trialDateDraft({ student, history: h }).trialDate).toEqual({ upcomingId: null, upcomingAt: null, count: 1 });
    expect(upcomingRow(h)).toBeNull();
  });

  it('walks the reduced flow teacher → slot → review', () => {
    expect(stepsOf(trialDateDraft({ student, history: history() }))).toEqual(['teacher', 'slot', 'review']);
  });
});

describe('trialHint', () => {
  it('preselects the newest pick’s teacher', () => {
    const h = history({ items: [row({ teacher: { id: 't-new', name: 'نور' } }), row({ lesson_id: 'old' })] });
    expect(trialHint(h)).toEqual({ teacherId: 't-new', startsAt: null });
  });

  it('is null without a history or a teacher', () => {
    expect(trialHint(history({ items: [] }))).toBeNull();
    expect(trialHint(history({ items: [row({ teacher: null })] }))).toBeNull();
  });
});

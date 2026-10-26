import { describe, expect, it } from 'vitest';
import { planTimeEdit, type TimeEditInput } from './time-edit.plan';

// A completed lesson on Thu 2026-10-01 14:00–14:45Z = 17:00 in Riyadh and Cairo (UTC+3, no DST).
const NOW = new Date('2026-10-02T10:00:00Z');
const current = { startsAt: new Date('2026-10-01T14:00:00Z'), endsAt: new Date('2026-10-01T14:45:00Z') };
const ZONES = ['Africa/Cairo', 'Asia/Riyadh'];

const correct = (request: Partial<TimeEditInput['request']> = {}): TimeEditInput => ({
  mode: 'correct',
  now: NOW,
  current,
  zones: ZONES,
  request: { startsAt: current.startsAt, durationMin: 60, reason: 'الحلقة خدت ساعة', ...request },
});
const rejected = (input: TimeEditInput, code: string) =>
  expect(() => planTimeEdit(input)).toThrow(expect.objectContaining({ status: 400, response: { code, message: code } }));

describe('planTimeEdit — correct (a held lesson, R-SCH-11)', () => {
  it('the session ran 60 min not 45: same start, new end, PDF refresh, no notice', () => {
    expect(planTimeEdit(correct())).toEqual({
      mode: 'correct',
      start: current.startsAt,
      end: new Date('2026-10-01T15:00:00Z'),
      startChanged: false,
      durationChanged: true,
      reason: 'الحلقة خدت ساعة',
      retimeOpen: false,
      refreshPdf: true,
      notify: false,
      ignoredConflicts: ['outside_availability', 'time_off'],
    });
  });

  it('a corrected start on the same day also refreshes the PDF; notify is ignored', () => {
    const plan = planTimeEdit(correct({ startsAt: new Date('2026-10-01T13:30:00Z'), durationMin: 45, notify: true }));
    expect(plan).toMatchObject({ startChanged: true, durationChanged: false, refreshPdf: true, notify: false, retimeOpen: false });
  });

  it('a reason is required: missing or blank is 400 reason_required', () => {
    rejected(correct({ reason: undefined }), 'reason_required');
    rejected(correct({ reason: '  ' }), 'reason_required');
  });

  it('the end of the corrected session must be in the past too: 400 date_in_future', () => {
    const late = { ...correct(), now: new Date('2026-10-01T14:30:00Z') }; // a 60 min end (15:00Z) is still ahead
    rejected(late, 'date_in_future');
    rejected(correct({ startsAt: new Date('2026-10-03T14:00:00Z') }), 'date_in_future');
  });

  it('crossing midnight in the teacher tz or in a student tz is 400 correction_cross_day', () => {
    // 21:30Z = 00:30 next day in Riyadh and Cairo (+3)
    rejected(correct({ startsAt: new Date('2026-10-01T21:30:00Z'), durationMin: 30 }), 'correction_cross_day');
    // 15:30Z = 18:30 in Cairo (same day) but 00:30 on the 2nd in Tokyo, where a student lives
    const tokyo = correct({ startsAt: new Date('2026-10-01T15:30:00Z'), durationMin: 30 });
    rejected({ ...tokyo, zones: ['Africa/Cairo', 'Asia/Tokyo'] }, 'correction_cross_day');
    expect(planTimeEdit(tokyo).startChanged).toBe(true);
  });

  it('the order of checks: future, then cross-day, then the reason', () => {
    rejected(correct({ startsAt: new Date('2026-10-05T14:00:00Z'), reason: undefined }), 'date_in_future');
    rejected(correct({ startsAt: new Date('2026-10-01T21:30:00Z'), durationMin: 30, reason: undefined }), 'correction_cross_day');
  });
});

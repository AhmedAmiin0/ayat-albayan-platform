import { describe, expect, it } from 'vitest';
import { at, RIYADH_GUARDIAN, sampleLesson, STARTS_AT } from '../reminders.fakes';
import { planReminders, type ReminderPlanInput } from './reminders.plan';

const plan = (over: Partial<ReminderPlanInput> = {}) =>
  planReminders({ lessons: [sampleLesson()], minutesBefore: 60, dayBefore: false, now: at('2026-10-04T13:00:00Z'), ...over });
const keys = (rows: ReturnType<typeof plan>) => rows.map((r) => r.dedup_key);

describe('planReminders: same-day window (R-MSG-02)', () => {
  it.each([
    ['61 min before', '2026-10-04T12:59:00Z', 0],
    ['60 min before', '2026-10-04T13:00:00Z', 3],
    ['1 min before', '2026-10-04T13:59:00Z', 3],
    ['at the start', '2026-10-04T14:00:00Z', 0],
    ['after the start', '2026-10-04T14:30:00Z', 0],
  ])('%s → %i rows', (_name, now, n) => {
    expect(plan({ now: at(now) })).toHaveLength(n);
  });

  it('follows settings.reminder_minutes_before', () => {
    expect(plan({ minutesBefore: 30, now: at('2026-10-04T13:00:00Z') })).toEqual([]);
    expect(plan({ minutesBefore: 120, now: at('2026-10-04T12:00:00Z') })).toHaveLength(3);
  });

  it('one row per guardian (their own children), one for the teacher; dedup lesson + recipient + type', () => {
    const rows = plan();
    expect(keys(rows)).toEqual([
      'lesson_reminder:lesson-1:g-riyadh',
      'lesson_reminder:lesson-1:g-london',
      'teacher_lesson_reminder:lesson-1:t-1',
    ]);
    expect(rows[0]).toMatchObject({
      direction: 'outbound',
      status: 'queued',
      phone_e164: RIYADH_GUARDIAN.phone_e164,
      guardian_id: 'g-riyadh',
      lesson_id: 'lesson-1',
      lead_id: null,
      scheduled_for: '2026-10-04T13:00:00.000Z',
      expires_at: new Date(STARTS_AT).toISOString(),
    });
    expect(rows[2]).toMatchObject({ guardian_id: null, phone_e164: '+966500000201', lesson_id: 'lesson-1' });
  });

  it('{{2}} is the time in each guardian tz; the teacher gets theirs (+ the Jitsi link: no button)', () => {
    const teacher = { id: 't-1', display_name_ar: 'هدى', phone_e164: '+966500000201', tz: 'America/New_York' };
    const rows = plan({ lessons: [sampleLesson({ teacher })] });
    const slot = '10:00 — سهيلة ومريم وياسين · رابط الحلقة: https://meet.jit.si/ab-room-7';
    expect(rows.map((r) => r.template_params['2'])).toEqual(['17:00', '15:00', slot]);
    expect(rows[0]?.template_params['1']).toBe('سهيلة ومريم');
    expect(rows[1]?.template_params['1']).toBe('ياسين');
    expect(rows[2]?.template_params['1']).toBe('هدى');
  });

  it.each([
    { link: 'https://meet.jit.si/ab-room-7', guardian: ['lesson_reminder', 'ab-room-7'], teacher: ['teacher_lesson_reminder', undefined] },
    {
      link: 'https://meet.google.com/abc-defg-hij',
      guardian: ['lesson_reminder_meet', 'abc-defg-hij'],
      teacher: ['teacher_lesson_reminder_meet', 'abc-defg-hij'],
    },
    { link: null, guardian: ['lesson_reminder_plain', undefined], teacher: ['teacher_lesson_reminder', undefined] },
  ])('link $link → $guardian.0', ({ link, guardian, teacher }) => {
    const [toGuardian, , toTeacher] = plan({ lessons: [sampleLesson({ meeting_link: link })] });
    expect([toGuardian?.template_key, toGuardian?.template_params.button]).toEqual(guardian);
    expect([toTeacher?.template_key, toTeacher?.template_params.button]).toEqual(teacher);
  });

  it('no teacher phone → guardians only; a student without guardian is skipped', () => {
    const teacher = { id: 't-1', display_name_ar: 'هدى', phone_e164: null, tz: 'Asia/Riyadh' };
    const students = [{ id: 's-1', name: 'سهيلة', guardian: RIYADH_GUARDIAN }, { id: 's-9', name: 'بدون', guardian: null }];
    expect(keys(plan({ lessons: [sampleLesson({ teacher, students })] }))).toEqual(['lesson_reminder:lesson-1:g-riyadh']);
  });

  it.each(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled', 'completed'] as const)(
    'never for a %s lesson',
    (status) => {
      expect(plan({ lessons: [sampleLesson({ status })] })).toEqual([]);
    },
  );

  it('confirmed lessons still get reminders', () => {
    expect(plan({ lessons: [sampleLesson({ status: 'confirmed' })] })).toHaveLength(3);
  });

  it('the teacher row adds the CRM\'s teacher_lesson_v2 values (codes, duration) beside Meta\'s', () => {
    const students = [
      { id: 's-1', name: 'سهيلة', code: 'AB-0101', guardian: RIYADH_GUARDIAN },
      { id: 's-3', name: 'ياسين', code: 'AB-0103', guardian: null },
    ];
    const lesson = sampleLesson({ students, meeting_link: 'https://meet.google.com/abc-defg-hij' });
    const row = plan({ lessons: [lesson] }).find((r) => r.template_key === 'teacher_lesson_reminder_meet');
    expect(row?.template_params).toEqual({
      '1': 'هدى',
      '2': '17:00 — سهيلة وياسين',
      button: 'abc-defg-hij',
      crm: {
        body: ['هدى', 'سهيلة وياسين', 'AB-0101، AB-0103', expect.stringContaining('17:00'), '45 دقيقة'],
        buttons: ['classroom/lesson-1', 'teacher/report/lesson-1'],
      },
    });
  });

  it('a student without a code: the teacher row keeps only the Meta values', () => {
    expect(plan()[2]?.template_params).not.toHaveProperty('crm');
  });
});

describe('planReminders: day before (R-MSG-02, R-SCH-03)', () => {
  const dayBefore = (now: string, on = true) => plan({ dayBefore: on, now: at(now) });

  it('only when enabled + approved', () => {
    expect(keys(dayBefore('2026-10-03T14:00:00Z', false))).toEqual([]);
    expect(keys(dayBefore('2026-10-03T14:00:00Z'))).toEqual([
      'lesson_reminder_24h:lesson-1:g-riyadh',
      'lesson_reminder_24h:lesson-1:g-london',
    ]);
  });

  it('carries confirm / reschedule payloads; expires when the lesson day starts for the guardian («بكرة» stays true)', () => {
    const [riyadh, london] = dayBefore('2026-10-03T14:00:00Z');
    expect(riyadh).toMatchObject({ template_key: 'lesson_reminder_24h', expires_at: '2026-10-03T21:00:00.000Z' });
    expect(london).toMatchObject({ expires_at: '2026-10-03T23:00:00.000Z' });
    const row = riyadh;
    expect(row?.template_params).toEqual({
      '1': 'سهيلة ومريم',
      '2': '17:00',
      payloads: ['confirm:lesson-1', 'reschedule:lesson-1'],
    });
  });

  it('«بكرة» is per guardian: after Riyadh midnight only London still gets it', () => {
    expect(keys(dayBefore('2026-10-03T21:30:00Z'))).toEqual(['lesson_reminder_24h:lesson-1:g-london']);
  });

  it('across the Cairo fall-back (30 Oct 2026) the guardian gets it at 17:00 local, 25 h before', () => {
    const cairo = { id: 'g-cairo', phone_e164: '+201000000103', tz: 'Africa/Cairo' };
    const lesson = sampleLesson({ starts_at: '2026-10-30T15:00:00Z', students: [{ id: 's-3', name: 'ياسين', guardian: cairo }] });
    const run = (now: string) => planReminders({ lessons: [lesson], minutesBefore: 60, dayBefore: true, now: at(now) });
    expect(run('2026-10-29T13:59:00Z')).toEqual([]);
    const [row] = run('2026-10-29T14:00:00Z');
    expect(row).toMatchObject({ dedup_key: 'lesson_reminder_24h:lesson-1:g-cairo' });
    expect(row?.template_params['2']).toBe('17:00');
  });
});

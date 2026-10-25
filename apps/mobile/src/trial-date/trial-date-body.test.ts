import { maryam, SUN_17 } from '@/booking/testing/fixtures';
import { historyOf, STUDENT, trialRow } from './fixtures';
import { trialDateBody, trialDateDraft, trialLength } from './trial-date-body';

test('the draft starts with the last trial’s teacher, the family’s zone and the last length', () => {
  const history = historyOf([trialRow({ ends_at: '2026-10-01T15:30:00.000Z' })], { family_tz: 'Africa/Cairo' });
  expect(trialDateDraft(history)).toEqual({
    studentId: STUDENT,
    tz: 'Africa/Cairo',
    durationMin: 30,
    teacher: { id: maryam.id, name: maryam.display_name_ar },
    startsAt: null,
  });
});

test('no trial yet, or an odd length: no teacher, the booking’s 45 minutes', () => {
  expect(trialDateDraft(historyOf([])).teacher).toBeNull();
  expect(trialLength(historyOf([]))).toBe(45);
  expect(trialLength(historyOf([trialRow({ ends_at: '2026-10-01T15:20:00.000Z' })]))).toBe(45);
});

test('the body is a one-lesson trial of the one student on the slot’s local day', () => {
  const draft = { ...trialDateDraft(historyOf([trialRow()])), startsAt: SUN_17 };
  expect(trialDateBody(draft, 'req-1')).toEqual({
    studentIds: [STUDENT],
    kind: 'trial',
    package: 'trial',
    teacherId: maryam.id,
    byday: [0],
    startTimeLocal: '17:00',
    tz: 'Asia/Riyadh',
    durationMin: 45,
    startsOn: '2026-10-04',
    startsAt: SUN_17,
    clientRequestId: 'req-1',
  });
});

test('the family’s zone fixes the weekday and the clock (Cairo is an hour behind Riyadh)', () => {
  const draft = { ...trialDateDraft(historyOf([trialRow()], { family_tz: 'Africa/Cairo' })), startsAt: SUN_17 };
  expect(trialDateBody(draft, 'r')).toMatchObject({ tz: 'Africa/Cairo', startTimeLocal: '17:00', startsOn: '2026-10-04' });
});

test('nothing to send until a teacher and a time are picked', () => {
  const draft = trialDateDraft(historyOf([]));
  expect(trialDateBody(draft, 'r')).toBeNull();
  expect(trialDateBody({ ...draft, startsAt: SUN_17 }, 'r')).toBeNull();
  expect(trialDateBody({ ...trialDateDraft(historyOf([trialRow()])) }, 'r')).toBeNull();
});

test('the draft takes the student’s own zone before the family’s (as the web draft)', () => {
  const history = historyOf([trialRow()], { family_tz: 'Africa/Cairo', student_tz: 'Europe/London' });
  expect(trialDateDraft(history).tz).toBe('Europe/London');
});

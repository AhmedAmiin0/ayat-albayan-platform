import { bookingRequestSchema } from '@ab/shared';
import { toBookingRequest } from './booking-body';
import { draft, LEAD_ID, maryam, SUN_17 } from '../../testing/fixtures';

const REQ = '99999999-9999-4999-8999-999999999999';

test('lead path: one trial lesson on the slot, new student + guardian in the family zone', () => {
  const body = toBookingRequest(draft({ studentName: ' يوسف ' }), { requestId: REQ });
  expect(body).toEqual({
    kind: 'trial',
    teacherId: maryam.id,
    byday: [0],
    startTimeLocal: '18:00',
    tz: 'Asia/Dubai',
    durationMin: 45,
    startsOn: '2026-10-04',
    package: 'trial',
    clientRequestId: REQ,
    startsAt: SUN_17,
    leadId: LEAD_ID,
    newStudent: {
      name: 'يوسف',
      program: 'quran',
      tz: 'Asia/Dubai',
      status: 'trial',
      teacher_gender_pref: 'female',
    },
    guardian: { name: 'أم يوسف', phone_e164: '+971501234567', tz: 'Asia/Dubai', country: 'AE' },
  });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
});

test('the form’s answers ride along: the child’s age and gender, the guardian’s source', () => {
  const body = toBookingRequest(draft({ age: ' 9 ', studentGender: 'male', source: 'referral' }), {
    requestId: REQ,
  });
  expect(body).toMatchObject({
    newStudent: { age: 9, gender: 'male', teacher_gender_pref: 'female' },
    guardian: { source: 'referral' },
  });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
});

test('the typed phone is sent as E.164', () => {
  const body = toBookingRequest(draft({ phone: '0552147730', tz: 'Asia/Riyadh' }), {
    requestId: REQ,
  });
  expect(body && 'guardian' in body ? body.guardian : null).toMatchObject({
    phone_e164: '+966552147730',
    country: 'SA',
  });
});

test('duplicate answers: the existing child by id (lead still converts), or force a new one', () => {
  const existing = toBookingRequest(draft(), { requestId: REQ, choice: { existingId: maryam.id } });
  expect(existing).toMatchObject({ studentIds: [maryam.id], leadId: LEAD_ID, package: 'trial' });
  expect(existing).not.toHaveProperty('newStudent');
  expect(bookingRequestSchema.safeParse(existing).success).toBe(true);
  const forced = toBookingRequest(draft(), { requestId: REQ, choice: { force: true } });
  expect(forced).toMatchObject({ force: true, newStudent: { name: 'يوسف' } });
  expect(toBookingRequest(draft(), { requestId: REQ })).not.toHaveProperty('force');
});

test('nothing to send without a teacher, a slot or a valid phone', () => {
  expect(toBookingRequest(draft({ teacher: null }), { requestId: REQ })).toBeNull();
  expect(toBookingRequest(draft({ startsAt: null }), { requestId: REQ })).toBeNull();
  expect(toBookingRequest(draft({ phone: 'x' }), { requestId: REQ })).toBeNull();
});

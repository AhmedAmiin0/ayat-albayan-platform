import { bookingRequestSchema } from '@ab/shared';
import { huda, unnamed } from '@/inbox/fixtures';
import { contactReady, draftFromLead, phoneProblem, toBookingRequest, tzForPhone } from './draft';
import { draft, LEAD_ID, maryam, SUN_17 } from './fixtures';

const REQ = '99999999-9999-4999-8999-999999999999';

test('the phone country suggests the family zone; anything else is Riyadh', () => {
  expect(tzForPhone('+966552147730')).toBe('Asia/Riyadh');
  expect(tzForPhone('01012345678')).toBe('Africa/Cairo');
  expect(tzForPhone('+971501234567')).toBe('Asia/Dubai');
  expect(tzForPhone('+96899123456')).toBe('Asia/Muscat');
  expect(tzForPhone('+447700900123')).toBe('Asia/Riyadh');
  expect(tzForPhone('@handle')).toBe('Asia/Riyadh');
});

test('a lead prefills the guardian (its WhatsApp name and number); the child is typed', () => {
  expect(draftFromLead(huda)).toMatchObject({
    leadId: huda.id,
    studentName: '',
    guardianName: 'هدى سالم',
    phone: '+966552147730',
    tz: 'Asia/Riyadh',
    program: 'quran',
    gender: null,
    teacher: null,
    startsAt: null,
  });
  expect(draftFromLead(unnamed)).toMatchObject({ guardianName: '', tz: 'Africa/Cairo' });
});

test('phoneProblem: the normalizePhone reason, null for a storable number', () => {
  expect(phoneProblem('')).toBe('empty');
  expect(phoneProblem('abc')).toBe('not_a_number');
  expect(phoneProblem('+96655')).toBe('invalid_length');
  expect(phoneProblem('12345678')).toBe('missing_country_code');
  expect(phoneProblem('٠٥٥٢١٤٧٧٣٠')).toBeNull();
});

test('contactReady needs both names and a valid phone', () => {
  const ok = { studentName: 'يوسف', guardianName: 'أم يوسف', phone: '0552147730' };
  expect(contactReady(ok)).toBe(true);
  expect(contactReady({ ...ok, studentName: '  ' })).toBe(false);
  expect(contactReady({ ...ok, guardianName: '' })).toBe(false);
  expect(contactReady({ ...ok, phone: '0552' })).toBe(false);
});

test('lead path: one trial lesson on the slot, new student + guardian in the family zone', () => {
  const body = toBookingRequest(draft({ studentName: ' يوسف ' }), { requestId: REQ });
  expect(body).toEqual({
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

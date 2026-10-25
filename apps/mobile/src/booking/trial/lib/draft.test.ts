import { huda, unnamed } from '@/inbox/shared/fixtures';
import { ageValid, contactReady, draftFromLead, phoneProblem, tzForPhone } from './draft';

test('the phone country suggests the family zone; anything else is Riyadh', () => {
  expect(tzForPhone('+966552147730')).toBe('Asia/Riyadh');
  expect(tzForPhone('01012345678')).toBe('Africa/Cairo');
  expect(tzForPhone('+971501234567')).toBe('Asia/Dubai');
  expect(tzForPhone('+96899123456')).toBe('Asia/Muscat');
  expect(tzForPhone('+447700900123')).toBe('Asia/Riyadh');
  expect(tzForPhone('@handle')).toBe('Asia/Riyadh');
});

test('a lead with no answers prefills the guardian (WhatsApp name and number) and its source', () => {
  expect(draftFromLead(huda)).toMatchObject({
    leadId: huda.id,
    studentName: '',
    age: '',
    studentGender: null,
    guardianName: 'هدى سالم',
    phone: '+966552147730',
    tz: 'Asia/Riyadh',
    source: 'facebook_ad',
    program: 'quran',
    gender: null,
    teacher: null,
    startsAt: null,
    durationMin: 45,
  });
  expect(draftFromLead(unnamed)).toMatchObject({ guardianName: '', tz: 'Africa/Cairo' });
  expect(draftFromLead({ id: 'c', name: null, phone_e164: '+966552147730' })).toMatchObject({
    source: null,
  });
});

test('«بيانات الطالب» carry over: the child, age, gender, the asked parent name and zone', () => {
  const qualification = {
    student_name: 'سهيلة',
    age: 9,
    gender: 'female',
    guardian_name: 'أم سهيلة',
    tz: 'Asia/Kuwait',
  };
  expect(draftFromLead({ ...huda, qualification })).toMatchObject({
    studentName: 'سهيلة',
    age: '9',
    studentGender: 'female',
    guardianName: 'أم سهيلة',
    tz: 'Asia/Kuwait',
  });
  // A zone outside the picker's list falls back to the number's.
  expect(draftFromLead({ ...unnamed, qualification: { tz: 'Mars/Base' } }).tz).toBe('Africa/Cairo');
});

test('phoneProblem: the normalizePhone reason, null for a storable number', () => {
  expect(phoneProblem('')).toBe('empty');
  expect(phoneProblem('abc')).toBe('not_a_number');
  expect(phoneProblem('+96655')).toBe('invalid_length');
  expect(phoneProblem('12345678')).toBe('missing_country_code');
  expect(phoneProblem('٠٥٥٢١٤٧٧٣٠')).toBeNull();
});

test('«عمر الطالب»: optional, else a whole number from 3 to 99 (the form’s check)', () => {
  expect(['', ' ', '3', '9', '99'].every(ageValid)).toBe(true);
  expect(['2', '100', '9.5', 'تسعة', '-4'].some(ageValid)).toBe(false);
});

test('contactReady needs both names, a valid phone and a sane age', () => {
  const ok = { studentName: 'يوسف', guardianName: 'أم يوسف', phone: '0552147730', age: '' };
  expect(contactReady(ok)).toBe(true);
  expect(contactReady({ ...ok, studentName: '  ' })).toBe(false);
  expect(contactReady({ ...ok, guardianName: '' })).toBe(false);
  expect(contactReady({ ...ok, phone: '0552' })).toBe(false);
  expect(contactReady({ ...ok, age: '1' })).toBe(false);
  expect(contactReady({ ...ok, age: '10' })).toBe(true);
});

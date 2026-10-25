import { bookingRequestSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { InboxLead } from '@/features/inbox/api/api';
import { draftFromLead } from './BookingPage';
import { leadParts, newStudentFromLead, newStudentReady } from './new-student';

const LEAD_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const LEAD = {
  id: LEAD_ID,
  phone_e164: '+966501234567',
  name: 'أم جود',
  source: 'instagram_ad',
  status: 'qualifying',
  tz: null,
  qualification: {
    student_name: 'جود',
    age: 9,
    gender: 'female',
    tz: 'Africa/Cairo',
    level: 'مبتدئ',
    memorized: 'جزء عم',
    goal: 'حفظ',
    riwaya: 'حفص عن عاصم',
    guardian_name: 'منى',
    notes: 'تفضّل معلمة',
  },
} as unknown as InboxLead;
const FAMILY = { program: 'quran', tz: 'Africa/Cairo', pkg: 'trial', genderPref: null, country: 'EG' } as const;

describe('lead → student conversion carries «بيانات الطالب» and the source (research-forms item 2)', () => {
  it('the lead path lists the lead’s own chat for «من المحادثة», the number the invoice came from', () => {
    expect(draftFromLead({ leadId: LEAD_ID, phone: '+966501234567' }, null).chatPhone).toBe('+966501234567');
    expect(draftFromLead({ leadId: LEAD_ID }, null).chatPhone).toBeNull();
  });

  it('prefills step 1 and the zone from the qualification', () => {
    const { student, tz } = newStudentFromLead(LEAD, { name: 'أم جود', phone: LEAD.phone_e164 });
    expect(student).toMatchObject({ name: 'جود', guardianName: 'منى', guardianPhone: '+966501234567', age: '9', gender: 'female', source: 'instagram_ad' });
    expect(tz).toBe('Africa/Cairo');
    expect(draftFromLead({ leadId: LEAD_ID, phone: LEAD.phone_e164 }, LEAD)).toMatchObject({ tz: 'Africa/Cairo', pkg: 'trial' });
  });

  it('without a lead row it starts from the URL (name, phone) and the default zone', () => {
    const { student, tz } = newStudentFromLead(null, { name: 'أم جود', phone: '+966501234567' });
    expect(student).toMatchObject({ name: '', guardianName: 'أم جود', age: '', gender: '', source: '' });
    expect(tz).toBeNull();
    expect(draftFromLead({ leadId: LEAD_ID, phone: '+966501234567' }, null).tz).toBe('Asia/Riyadh');
  });

  it('sends the qualification onto the student and the source onto the guardian', () => {
    const { student } = newStudentFromLead(LEAD, { phone: LEAD.phone_e164 });
    const parts = leadParts(student, FAMILY);
    expect(parts.newStudent).toMatchObject({ age: 9, gender: 'female', level: 'مبتدئ', memorized: 'جزء عم', goal: 'حفظ', riwaya: 'حفص عن عاصم', notes: 'تفضّل معلمة', status: 'trial' });
    expect(parts.guardian).toMatchObject({ name: 'منى', source: 'instagram_ad', country: 'EG' });
    const body = { ...parts, leadId: LEAD_ID, teacherId: LEAD_ID, byday: [0], startTimeLocal: '17:00', tz: 'Africa/Cairo', durationMin: 45, startsOn: '2026-10-04', package: 'trial' };
    expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  });

  it('a typed age must be a whole 3–99; blank is fine', () => {
    const base = { name: 'جود', guardianName: 'منى', guardianPhone: '0501234567' };
    expect(newStudentReady(base)).toBe(true);
    expect(newStudentReady({ ...base, age: '9' })).toBe(true);
    expect(newStudentReady({ ...base, age: '120' })).toBe(false);
    expect(leadParts({ ...base, age: '' }, FAMILY).newStudent).toMatchObject({ age: null, gender: null, level: null });
  });

  it('a trial booking registers a «trial» student, a regular package a «new» one until paid (docs/18 row 1)', () => {
    const base = { name: 'جود', guardianName: 'منى', guardianPhone: '0501234567' };
    expect(leadParts(base, { ...FAMILY, pkg: 'trial' }).newStudent.status).toBe('trial');
    expect(leadParts(base, { ...FAMILY, pkg: '8' }).newStudent.status).toBe('new');
  });
});

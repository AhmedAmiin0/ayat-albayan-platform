import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { lead, PHONE } from '../testing/inbox-fixture';
import { leadSummary, registerInitial } from './lead-summary';

describe('leadSummary: the aside’s key facts (R-LEAD-03)', () => {
  it('nothing filled → no rows', () => {
    expect(leadSummary(lead())).toEqual([]);
  });

  it('only the filled facts, in order, in words', () => {
    const rows = leadSummary(
      lead({
        qualification: {
          student_name: 'سهيلة',
          age: 9,
          gender: 'female',
          guardian_name: 'أم سهيلة',
          tz: 'Africa/Cairo',
          available_days: [0, 2],
          preferred_from: '16:00',
          preferred_to: '18:00',
        },
      }),
    );
    expect(rows).toEqual([
      { label: t.leads.studentName, value: 'سهيلة' },
      { label: t.leads.studentAge, value: '9' },
      { label: t.leads.gender, value: t.enums.gender.female },
      { label: t.guardians.name, value: 'أم سهيلة' },
      { label: t.students.tz, value: t.tz['Africa/Cairo'] },
      { label: t.leads.availableDays, value: `${t.enums.weekday['0']}، ${t.enums.weekday['2']}` },
      { label: t.leads.preferredTime, value: '16:00 – 18:00' },
    ]);
  });

  it('the lead’s own zone when the qualification has none; an unlisted zone shows its id', () => {
    expect(leadSummary(lead({ tz: 'Asia/Riyadh' }))).toEqual([{ label: t.students.tz, value: t.tz['Asia/Riyadh'] }]);
    expect(leadSummary(lead({ qualification: { tz: 'Pacific/Fiji', country: 'فيجي' } }))).toEqual([
      { label: t.leads.country, value: 'فيجي' },
      { label: t.students.tz, value: 'Pacific/Fiji' },
    ]);
  });
});

describe('registerInitial: «تسجيل الطالب» pre-filled from the lead (R-STU-02)', () => {
  it('the thread phone, the lead’s facts, its source and quran', () => {
    const l = lead({ qualification: { student_name: 'عمر', age: 9, gender: 'male', tz: 'Africa/Cairo' } });
    expect(registerInitial(l)).toEqual({
      name: 'عمر',
      guardianPhone: PHONE,
      guardianName: 'أم سهيلة',
      age: '9',
      gender: 'male',
      tz: 'Africa/Cairo',
      source: 'facebook_ad',
      program: 'quran',
    });
  });

  it('guardian name from the qualification first; zone falls back to the lead, then Riyadh', () => {
    expect(registerInitial(lead({ qualification: { guardian_name: 'أبو عمر' }, tz: 'Africa/Cairo' }))).toMatchObject({
      guardianName: 'أبو عمر',
      tz: 'Africa/Cairo',
    });
    expect(registerInitial(lead({ name: null }))).toMatchObject({ guardianName: '', tz: 'Asia/Riyadh', name: '' });
  });
});

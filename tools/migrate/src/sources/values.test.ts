import { describe, expect, it } from 'vitest';
import {
  attendance,
  gender,
  grade,
  leadSource,
  packageSize,
  program,
  sheetLeadStatus,
  teacherFromText,
} from './values.ts';
import { bookingStatus, parseRecurrence, weekday } from './values.schedule.ts';

describe('teacherFromText (A3)', () => {
  it('accepts the directory slugs and English names', () => {
    expect(teacherFromText('hassan')).toBe('hassan');
    expect(teacherFromText('Mariam Adel')).toBe('mariam adel');
  });
  it('maps the directory aliases in any spelling (invented fixture, src/test-setup.ts)', () => {
    for (const v of ['أبرار', 'ابرار', 'أبرار سالم', 'ابرار سالم'])
      expect(teacherFromText(v)).toBe('abrar');
    for (const v of ['ربيعة', 'ربيعه منصور']) expect(teacherFromText(v)).toBe('rabia');
    expect(teacherFromText('حسن كامل')).toBe('hassan');
    for (const v of ['هند', 'الأستاذة : هند', 'المعلمة: هند', 'معلمه هند'])
      expect(teacherFromText(v)).toBe('hend');
  });
  it('null for cities, undefined for unknown or empty', () => {
    expect(teacherFromText('الفيوم')).toBeNull();
    expect(teacherFromText('مصر')).toBeNull();
    expect(teacherFromText('Minus ipsum')).toBeUndefined();
    expect(teacherFromText(null)).toBeUndefined();
  });
});

describe('enum lookups', () => {
  it('lead status and source', () => {
    expect(sheetLeadStatus('مهتم بدون ميعاد')).toBe('interested_no_slot');
    expect(sheetLeadStatus('حجز مبدئي – بانتظار تأكيد')).toBe('trial_booked');
    expect(sheetLeadStatus('توظيف / عرض خدمة')).toBe('job_applicant');
    expect(sheetLeadStatus('جروب حلقة')).toBe('skip');
    expect(leadSource('واتساب مباشر,')).toBe('whatsapp_direct');
    expect(leadSource('إعلان انستجرام')).toBe('instagram_ad');
    expect(leadSource(null)).toBeUndefined();
  });
  it('report vocabulary', () => {
    expect(attendance('حضرت متأخرة')).toBe('late');
    expect(grade('جيد جدًا')).toBe('very_good');
    expect(grade('ممتاز')).toBe('excellent');
    expect(program('القرآن الكريم')).toBe('quran');
    expect(program('اللغة العربية')).toBe('arabic');
  });
  it('people and packages', () => {
    expect(gender('أنثى')).toBe('female');
    expect(gender('معلم')).toBe('male');
    expect(packageSize('8 حلقات في الشهر')).toBe('8');
    expect(packageSize('حلقة تجريبية مجانية بس')).toBe('trial');
    expect(packageSize('170 دينار / 16 حلقة')).toBeUndefined();
  });
  it('booking status and weekdays', () => {
    expect(bookingStatus('يحتاج تأكيد')).toBe('needs_confirmation');
    expect(bookingStatus('مشترك')).toBe('subscribed');
    expect(weekday('الاتنين')).toBe(1);
    expect(weekday('الإثنين')).toBe(1);
    expect(weekday('السبت')).toBe(6);
    expect(weekday('sun')).toBe(0);
  });
});

describe('parseRecurrence', () => {
  it('reads the booking calendar shapes', () => {
    expect(parseRecurrence('أسبوعي: السبت,الثلاثاء حتى 2026-10-17')).toEqual({
      byday: [2, 6],
      until: '2026-10-17',
    });
    expect(parseRecurrence('أسبوعي: الاتنين,الخميس')).toEqual({ byday: [1, 4], until: null });
    expect(parseRecurrence('أسبوعي: السبت')).toEqual({ byday: [6], until: null });
  });
  it('null for one-off, undefined for unknown text', () => {
    expect(parseRecurrence(null)).toBeNull();
    expect(parseRecurrence('شهري: السبت')).toBeUndefined();
    expect(parseRecurrence('أسبوعي: يوم ما')).toBeUndefined();
  });
});

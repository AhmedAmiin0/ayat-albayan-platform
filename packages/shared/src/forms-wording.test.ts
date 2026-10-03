import { describe, expect, it } from 'vitest';
import ar from '../i18n/ar.json' with { type: 'json' };
import { PROGRAMS } from './enums/index.js';
import { messageExpired, TEMPLATE_KEYS } from './messaging/index.js';

// docs/13-forms-spec.md is the owner's wording for the three Google Forms; titles, options and the
// order of a form's choices must stay identical (CLAUDE.md rule 10).

describe('form 1: استمارة تسجيل طالب جديد', () => {
  it('field titles', () => {
    expect(ar.students.name).toBe('اسم الطالب');
    expect(ar.leads.studentName).toBe('اسم الطالب');
    expect(ar.guardians.phone).toBe('رقم الواتساب (مع رمز الدولة)');
    expect(ar.students.age).toBe('عمر الطالب');
    expect(ar.students.gender).toBe('النوع');
    expect(ar.booking.pickDays).toBe('الأيام المتاحة');
    expect(ar.booking.pickTime).toBe('الساعة');
    expect(ar.leads.preferredTime).toBe('الساعة');
    expect(ar.booking.startsOn).toBe('تاريخ أول حلقة');
    expect(ar.students.teacher).toBe('المعلم/المعلمة');
    expect(ar.booking.pickTeacher).toBe('المعلم/المعلمة');
    expect(ar.booking.pickDuration).toBe('المدة');
    expect(ar.booking.pickPackage).toBe('الباقة المطلوبة');
    expect(ar.guardians.source).toBe('كيف عرفت عنا؟');
  });

  it('package options', () => {
    const p = ar.enums.packageSize;
    expect([p.trial, p['4'], p['8'], p['12'], p['16']]).toEqual([
      'حلقة تجريبية مجانية فقط',
      '4 حلقات في الشهر',
      '8 حلقات',
      '12 حلقة',
      '16 حلقة في الشهر',
    ]);
  });

  it('source options and gender', () => {
    const s = ar.enums.leadSource;
    expect([s.facebook_ad, s.instagram_ad, s.whatsapp_direct, s.referral]).toEqual([
      'إعلان فيسبوك',
      'إعلان انستجرام',
      'واتساب مباشر',
      'صديق أو معرفة',
    ]);
    expect([ar.enums.gender.male, ar.enums.gender.female]).toEqual(['ذكر', 'أنثى']);
  });
});

describe('form 2: تقرير الحلقة', () => {
  const r = ar.reports;

  it('identity labels, section headings and the program choice', () => {
    expect([r.studentId, r.teacher, r.student]).toEqual(['معرّف الطالب (لا تعدله)', 'اسم المعلم (لا تعدله)', 'اسم الطالب (لا تعدله)']);
    expect([r.identity, r.done, r.detailTitle, r.notesTitle]).toEqual(['بيانات الحلقة', 'محتوى الحلقة', 'التقييم التفصيلي', 'الملاحظات والواجب']);
    expect(PROGRAMS.map((p) => ar.enums.program[p])).toEqual(['القرآن الكريم', 'اللغة العربية', 'الدراسات الإسلامية']);
  });

  it('the PDF reuses the form headings (one source)', () => {
    expect(Object.keys(r.pdf)).not.toEqual(expect.arrayContaining(['content', 'grades', 'notesTitle']));
  });

  it('attendance options', () => {
    const a = ar.enums.attendance;
    expect([a.on_time, a.late, a.excused, a.absent]).toEqual(['حضرت في الموعد', 'حضرت متأخرة', 'اعتذرت مسبقًا', 'غياب بدون إشعار']);
  });
});

describe('form 3: رأيك يهمّنا', () => {
  it('titles, scale ends and options', () => {
    const f = ar.feedback;
    expect([f.title, f.teacher, f.kind, f.rating, f.ratingLow, f.ratingHigh, f.recommend, f.note, f.contact]).toEqual([
      'رأيك يهمّنا',
      'اسم المعلمة',
      'نوع الحلقة',
      'تقييمك للحلقة',
      'غير راضٍ',
      'راضٍ تمامًا',
      'هل ترشّح الأكاديمية لصديق أو قريب؟',
      'ملاحظة أو اقتراح',
      'رقم واتساب للتواصل',
    ]);
  });
});

describe('lesson_feedback_request template', () => {
  it('is a registry key with a name, and never expires on a lesson start (its link carries its own expiry)', () => {
    expect(TEMPLATE_KEYS).toContain('lesson_feedback_request');
    expect(ar.templates.names.lesson_feedback_request).toBeTruthy();
    const lessonStartedAt = '2026-10-01T10:00:00Z';
    const now = new Date('2026-10-03T10:00:00Z');
    const input = { templateKey: 'lesson_feedback_request', expiresAt: null, lessonStartsAt: lessonStartedAt, now };
    expect(messageExpired(input)).toBe(false);
    expect(messageExpired({ ...input, expiresAt: '2026-10-02T00:00:00Z' })).toBe(true);
  });
});

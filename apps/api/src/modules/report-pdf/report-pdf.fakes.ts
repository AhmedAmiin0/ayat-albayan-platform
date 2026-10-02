import type { PdfAssets } from './pdf-assets';
import type { ReportPdfModel } from './pdf-model';
import type { ReportSource } from './report-pdf.source';

// Invented sample data for the template, smoke and job tests: no real student, teacher or
// guardian (AB-0183 is the code docs/07 uses as its example).

export const STUB_ASSETS: PdfAssets = { fontCss: '/* fonts */', logo: 'data:image/png;base64,AA==' };

export function sampleModel(over: Partial<ReportPdfModel> = {}): ReportPdfModel {
  return {
    student: { name: 'سلمى عبد الرحمن', code: 'AB-0183' },
    teacherName: 'هدى سامي',
    program: 'quran',
    startsAt: new Date('2026-09-29T14:00:00Z'),
    endsAt: new Date('2026-09-29T15:00:00Z'),
    tz: 'Asia/Riyadh',
    lessonNo: 14,
    slot: { position: 6, total: 8 },
    attendance: 'on_time',
    recited: 'سورة النبأ 1-20',
    newMemorization: 'سورة النازعات 1-15',
    revision: 'سورة عبس كاملة\nسورة التكوير 1-14',
    theory: 'أحكام النون الساكنة والتنوين: الإظهار والإدغام',
    grades: {
      recitation: 'excellent',
      memorization: 'very_good',
      revision: 'excellent',
      tajweed: 'good',
      engagement: 'excellent',
      commitment: 'needs_review',
    },
    overall: 'very_good',
    notes: 'تحسّن واضح في المدود، ومحتاجين نركّز على مخارج حروف الحلق.',
    homework: 'مراجعة سورة النازعات 1-15 مع تطبيق أحكام النون الساكنة.',
    nextPlan: 'تسميع النازعات 1-15 وحفظ 16-30.',
    generatedAt: new Date('2026-09-29T15:12:00Z'),
    ...over,
  };
}

/** A student who missed the lesson: no grades, no content (R-REP-02 grades only when attended). */
export function absentModel(): ReportPdfModel {
  return sampleModel({
    attendance: 'absent',
    recited: null,
    newMemorization: null,
    revision: null,
    theory: null,
    grades: {
      recitation: null,
      memorization: null,
      revision: null,
      tajweed: null,
      engagement: null,
      commitment: null,
    },
    overall: null,
    notes: null,
    homework: 'مراجعة سورة النبأ.',
    nextPlan: null,
    slot: null,
    lessonNo: 3,
  });
}

/** The DB side of a report: what ReportPdfSource.load returns. */
export function sampleSource(over: Partial<ReportSource> = {}): ReportSource {
  return {
    report: {
      id: 'r1',
      lesson_id: 'l1',
      student_id: 's1',
      teacher_id: 't1',
      attendance: 'on_time',
      recited: 'سورة النبأ 1-20',
      new_memorization: 'سورة النازعات 1-15',
      revision: null,
      theory: null,
      grade_recitation: 'excellent',
      grade_memorization: 'very_good',
      grade_revision: 'good',
      grade_tajweed: 'acceptable',
      grade_engagement: 'needs_review',
      grade_commitment: null,
      grade_overall: 'very_good',
      notes: 'ملاحظة',
      homework: 'واجب',
      next_plan: 'خطة',
      version: 2,
    },
    lesson: { starts_at: '2026-09-29T14:00:00+00:00', ends_at: '2026-09-29T14:45:00+00:00' },
    student: { name: 'سلمى عبد الرحمن', code: 'AB-0183', program: 'quran' },
    guardian: { id: 'g1', phone_e164: '+966551234567', tz: 'Asia/Riyadh' },
    teacher: { display_name_ar: 'هدى سامي' },
    seq: 14,
    completedBefore: 0,
    packageN: 6,
    packages: [{ id: 'p1', lessonsTotal: 8, startsOn: '2026-09-01', createdAt: '2026-09-01T08:00:00Z' }],
    ...over,
  };
}

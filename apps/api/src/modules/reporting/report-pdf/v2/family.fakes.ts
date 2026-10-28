// Invented sample data for the v2 family report tests: no real student, teacher or guardian.
import { reportContentSchema, type ReportContentInput } from '@ab/shared';
import { sampleSource } from '../report-pdf.fakes';
import type { ReportSource } from '../report-pdf.source';
import type { FamilyModel } from './family-model';

export const QURAN_CONTENT = reportContentSchema.parse({
  segments: [
    { kind: 'recited', surah: 67, from: 1, to: 15, grade: 'excellent' },
    { kind: 'new', surah: 67, from: 16, to: 22, grade: 'very_good' },
    { kind: 'revision', surah: 68, from: 1, to: 20, grade: 'good' },
  ],
  tajweed: 'noon_sakin',
  quick: ['keep_going'],
});

export function familyModel(over: Partial<FamilyModel> = {}): FamilyModel {
  return {
    student: { name: 'يوسف', code: 'AB-2041' },
    teacherName: 'سارة',
    program: 'quran',
    startsAt: new Date('2026-10-27T13:00:00Z'),
    tz: 'Asia/Riyadh',
    lessonNo: 21,
    slot: { position: 9, total: 12 },
    attendance: 'on_time',
    content: QURAN_CONTENT,
    overall: 'very_good',
    notes: 'تحسّنت المدود كثيرًا هذا الأسبوع.',
    homework: 'مراجعة سورة الملك من الآية 1 إلى 22 يوميًا.',
    nextPlan: 'الحفظ الجديد: سورة الملك 23–30',
    nextLessonAt: new Date('2026-10-29T13:00:00Z'),
    progress: { juz: 29, done: 2, total: 20, completed: [30] },
    generatedAt: new Date('2026-10-27T14:10:00Z'),
    ...over,
  };
}

export const content = (c: ReportContentInput) => reportContentSchema.parse(c);

/** A submitted v2 report as ReportPdfSource.load returns it. */
export function familySource(over: Partial<ReportSource['family']> = {}): ReportSource {
  const base = sampleSource();
  return {
    ...base,
    report: { ...base.report, form_version: 2, content: QURAN_CONTENT, program: 'quran' },
    family: { content: QURAN_CONTENT, history: [{ surah: 67, from: 1, to: 12 }], nextLessonAt: '2026-10-29T13:00:00Z', ...over },
  };
}

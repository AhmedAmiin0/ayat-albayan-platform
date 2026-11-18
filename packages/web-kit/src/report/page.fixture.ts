import type { ReportPageView } from '@ab/shared';

// Invented data: no real student, teacher or family.
const grades = {
  recitation: null,
  memorization: null,
  revision: null,
  tajweed: null,
  engagement: null,
  commitment: null,
};

export const PUBLIC_ID = 'aaaabbbbccccddddeeeeffff00001111';

export function pageView(over: Partial<ReportPageView> = {}): ReportPageView {
  return {
    public_id: PUBLIC_ID,
    student: { name: 'سهيلة' },
    teacher: { name: 'أبرار' },
    lesson: { starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' },
    tz: 'Asia/Riyadh',
    report: {
      form_version: 2,
      attendance: 'on_time',
      program: 'quran',
      recited: null,
      new_memorization: null,
      revision: null,
      theory: null,
      grades,
      grade_overall: 'excellent',
      notes: 'أداء ممتاز',
      homework: 'مراجعة الملك',
      next_plan: null,
      content: { segments: [], tajweed: null, arabic: null, islamic: null, quick: [] },
      version: 1,
      submitted_at: '2026-10-04T15:00:00Z',
      edited_at: null,
    },
    attachments: [
      {
        id: '00000000-0000-4000-8000-0000000000a1',
        mime: 'image/png',
        size: 10,
        url: 'https://files.example/a',
      },
    ],
    pdf: { url: 'https://files.example/report.pdf' },
    ...over,
  };
}

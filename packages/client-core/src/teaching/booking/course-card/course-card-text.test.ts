import { describe, expect, it } from 'vitest';
import {
  courseCardLines,
  extendPreviewLines,
  pausePreviewLines,
  resumePreviewLines,
} from './course-card-text.js';

const forms = (stem: string) => ({
  zero: `لا ${stem}`,
  one: `${stem} واحدة: {dates}`,
  two: `${stem} اثنتان: {dates}`,
  few: `{n} ${stem}: {dates}`,
  other: `{n} ${stem}: {dates}`,
});
const plain = (stem: string) => ({ zero: `لا ${stem}`, one: stem, two: stem, few: `{n} ${stem}`, other: `{n} ${stem}` });
const day = (instant: string) => instant.slice(5, 10);
const date = (local: string) => `[${local}]`;
const course = {
  ...{ teacherName: 'فاطمة', days: [], tz: 'Asia/Riyadh', endsOn: '2026-11-24' },
  ...{ lastAt: null, lessonsTotal: 12, unbooked: 2 },
};
const cardWords = { teacherEnd: '{teacher} · {date}', endsOn: 'حتى {date}', unbooked: forms('بلا موعد') };

describe('course card lines (owner 2026-11-17)', () => {
  it('the teacher with the last day, and the lessons left without a date', () => {
    expect(courseCardLines({ course, words: cardWords, date })).toEqual({
      teacher: 'فاطمة · [2026-11-24]',
      unbooked: 'بلا موعد اثنتان: {dates}',
    });
    const none = courseCardLines({ course: { ...course, teacherName: null, unbooked: 0 }, words: cardWords, date });
    expect(none).toEqual({ teacher: 'حتى [2026-11-24]', unbooked: null });
  });

  it('the pause: the lessons with their dates, then the days the package moves', () => {
    const words = { cancels: forms('تُلغى'), extendDays: plain('يومًا'), extendOpen: 'عند الاستئناف' };
    const preview = { lessons: 2, starts: ['2026-11-22T15:30:00Z', '2026-11-24T15:30:00Z'], extend_days: 7 };
    expect(pausePreviewLines({ preview, words, day })).toEqual([
      'تُلغى اثنتان: 11-22، 11-24',
      '7 يومًا',
    ]);
    expect(pausePreviewLines({ preview: { lessons: 0 }, words, day })).toEqual(['لا تُلغى', 'عند الاستئناف']);
  });

  it('the resume and «مدّ الجدول»', () => {
    const words = { back: forms('تعود'), extendDays: plain('يومًا') };
    expect(resumePreviewLines({ preview: { back: ['2026-11-22T15:30:00Z'], extendDays: 0 }, words, day })).toEqual([
      'تعود واحدة: 11-22',
      'لا يومًا',
    ]);
    const extend = { books: forms('تُحجز'), endsOn: 'آخر حلقة {date}' };
    const preview = { starts: ['2026-11-22T15:30:00Z', '2026-11-24T15:30:00Z'], endsOn: '2026-11-24' };
    expect(extendPreviewLines({ preview, words: extend, format: { day, date } })).toEqual([
      'تُحجز اثنتان: 11-22، 11-24',
      'آخر حلقة [2026-11-24]',
    ]);
  });
});

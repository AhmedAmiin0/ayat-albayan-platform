import { describe, expect, it } from 'vitest';
import { sampleSource } from '../report-pdf.fakes';
import { familySource, QURAN_CONTENT } from './family.fakes';
import { toFamilyModel } from './family-model';

const NOW = new Date('2026-10-27T14:10:00Z');

describe('toFamilyModel — DB rows → the v2 family report', () => {
  it('reads the content, the package slot, the next lesson and the juz progress from v2 history', () => {
    const m = toFamilyModel(familySource(), NOW);
    expect(m).toMatchObject({ program: 'quran', content: QURAN_CONTENT, slot: { position: 6, total: 8 }, overall: 'very_good' });
    expect(m.nextLessonAt?.toISOString()).toBe('2026-10-29T13:00:00.000Z');
    // History holds الملك 1–12 (page 562) and today adds 1–22: 562 whole, 563 (13–26) not yet.
    expect(m.progress).toEqual({ juz: 29, done: 1, total: 20, completed: [] });
  });

  it('no next lesson booked → null; non-Quran programs have no juz progress', () => {
    const src = familySource({ nextLessonAt: null });
    expect(toFamilyModel(src, NOW).nextLessonAt).toBeNull();
    expect(toFamilyModel({ ...src, report: { ...src.report, program: 'arabic' } }, NOW).progress).toBeNull();
  });

  it('refuses a v2 report read without its v2 parts, and one without attendance', () => {
    expect(() => toFamilyModel(sampleSource(), NOW)).toThrow('v2 report without its family reads');
    const src = familySource();
    expect(() => toFamilyModel({ ...src, report: { ...src.report, attendance: null } }, NOW)).toThrow('report has no attendance');
  });
});

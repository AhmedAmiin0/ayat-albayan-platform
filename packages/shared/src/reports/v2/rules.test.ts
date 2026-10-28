import { describe, expect, it } from 'vitest';
import { reportContentSchema, type ReportContentInput } from './content.js';
import { juzProgress } from './progress.js';
import { keptContent, legacyGrades, memoryOf, suggestOverall, suggestRange } from './rules.js';
import { suggestHomework, suggestNextPlan } from './suggest.js';

const content = (c: ReportContentInput) => reportContentSchema.parse(c);
type Kind = 'recited' | 'new' | 'revision';
const seg = (kind: Kind, [surah, from, to]: [number, number, number], grade: 'excellent' | 'very_good' | 'good' | null = 'good') => ({ kind, surah, from, to, grade });
const lesson = content({ segments: [seg('recited', [67, 1, 15], 'excellent'), seg('new', [67, 16, 22], 'very_good'), seg('revision', [68, 1, 20])] });
const WORDS = { homeworkQuran: 'مراجعة سورة {surah} من الآية {from} إلى {to} يوميًا.', nextNew: 'الحفظ الجديد: سورة {surah} {from}–{to}', nextRevision: 'المراجعة: سورة {surah} {from}–{to}' };

describe('memory: the last saved ayah per track (v2 history, newest first)', () => {
  it('takes each track from the newest report that has it', () => {
    const older = content({ segments: [seg('new', [67, 1, 15]), seg('revision', [78, 1, 40])] });
    const newer = content({ segments: [seg('new', [67, 16, 22])] });
    expect(memoryOf([newer, older])).toEqual({
      last: { recited: null, new: { surah: 67, from: 16, to: 22 }, revision: { surah: 78, from: 1, to: 40 } },
      recent_surahs: [67, 78],
    });
    expect(memoryOf([]).last.new).toBeNull();
  });

  it('suggests the next range right after the last ayah, as long as the last one, capped at the surah', () => {
    expect(suggestRange({ surah: 67, from: 1, to: 15 })).toEqual({ surah: 67, from: 16, to: 30 });
    expect(suggestRange({ surah: 67, from: 16, to: 22 })).toEqual({ surah: 67, from: 23, to: 29 });
    expect(suggestRange({ surah: 67, from: 23, to: 30 })).toEqual({ surah: 68, from: 1, to: 8 });
    expect(suggestRange({ surah: 114, from: 1, to: 6 })).toBeNull();
    expect(suggestRange(null)).toBeNull();
  });
});

describe('grades', () => {
  it('suggests the overall grade from the rows (rounded mean)', () => {
    expect(suggestOverall('quran', lesson)).toBe('very_good');
    expect(suggestOverall('quran', content({}))).toBeNull();
    const arabic = content({ arabic: { topic: 'x', skills: { reading: 'excellent', writing: 'excellent', listening: 'good', grammar: null } } });
    expect(suggestOverall('arabic', arabic)).toBe('very_good');
  });

  it('fills the v1 grade columns from each track’s first part', () => {
    expect(legacyGrades(lesson)).toEqual({ grade_recitation: 'excellent', grade_memorization: 'very_good', grade_revision: 'good' });
  });
});

describe('keptContent: what a send stores', () => {
  const mixed = content({ ...lesson, tajweed: 'madd', arabic: { topic: 'x' }, quick: ['keep_going'] });
  it('absent / excused: nothing', () => {
    expect(keptContent('absent', 'quran', mixed)).toEqual(content({}));
    expect(keptContent('excused', 'quran', mixed)).toEqual(content({}));
  });
  it('attended: only the taught program’s part, with the quick notes', () => {
    expect(keptContent('on_time', 'quran', mixed)).toEqual({ ...lesson, tajweed: 'madd', quick: ['keep_going'] });
    expect(keptContent('late', 'arabic', mixed).segments).toEqual([]);
    expect(keptContent('late', 'arabic', mixed).arabic?.topic).toBe('x');
  });
});

describe('suggestions', () => {
  it('homework revises today’s new memorization; the plan continues after it', () => {
    expect(suggestHomework(lesson, WORDS)).toBe('مراجعة سورة الملك من الآية 16 إلى 22 يوميًا.');
    expect(suggestNextPlan(lesson, WORDS)).toBe('الحفظ الجديد: سورة الملك 23–29 · المراجعة: سورة القلم 21–40');
    expect(suggestHomework(content({}), WORDS)).toBeNull();
    expect(suggestNextPlan(content({ segments: [seg('recited', [1, 1, 7])] }), WORDS)).toBeNull();
    expect(suggestHomework(lesson, { ...WORDS, homeworkQuran: 'Revise {surah} {from}-{to}' }, 'en')).toBe('Revise Al-Mulk 16-22');
  });
});

describe('juzProgress', () => {
  it('counts whole pages held in the juz of today’s new memorization', () => {
    const p = juzProgress(lesson, [{ surah: 67, from: 1, to: 15 }]);
    expect(p).toMatchObject({ juz: 29, total: 20 });
    // Page 562 = الملك 1–12 is held; 563 (13–26) is not complete.
    expect(p?.done).toBe(1);
    expect(p?.completed).toEqual([]);
  });

  it('marks a juz completed once every page is held', () => {
    const amma = Array.from({ length: 37 }, (_, i) => ({ surah: 78 + i, from: 1, to: [40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6][i] ?? 1 }));
    const p = juzProgress(content({ segments: [seg('new', [67, 1, 12])] }), amma);
    expect(p).toEqual({ juz: 29, done: 1, total: 20, completed: [30] });
    expect(juzProgress(content({}), amma)).toBeNull();
  });
});

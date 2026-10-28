import { describe, expect, it } from 'vitest';
import { emptyContent, reportContentSchema } from './content.js';
import { reportV2DraftSchema, reportV2SubmitSchema } from './schema.js';

const seg = (kind: string, [surah, from, to]: [number, number, number], grade: string | null = 'excellent') => ({ kind, surah, from, to, grade });
const quran = { segments: [seg('recited', [67, 1, 15]), seg('new', [67, 16, 22], 'very_good')] };
const base = { expectedVersion: 0, attendance: 'on_time', program: 'quran', overall: 'very_good' } as const;

const problem = (body: unknown) => {
  const r = reportV2SubmitSchema.safeParse(body);
  return r.success ? null : r.error.issues[0]?.message;
};

describe('reportContentSchema', () => {
  it('fills every part with its default', () => {
    expect(emptyContent()).toEqual({ segments: [], tajweed: null, arabic: null, islamic: null, quick: [] });
    expect(reportContentSchema.parse({ arabic: { topic: '  ' } }).arabic).toEqual({
      topic: null,
      skills: { reading: null, writing: null, listening: null, grammar: null },
    });
  });

  it('rejects a range outside the surah or reversed (invalid_range)', () => {
    const bad = (s: object) => reportContentSchema.safeParse({ segments: [s] }).error?.issues[0]?.message;
    expect(bad(seg('new', [67, 16, 31]))).toBe('invalid_range');
    expect(bad(seg('new', [67, 22, 16]))).toBe('invalid_range');
    expect(bad(seg('new', [115, 1, 1]))).toBeDefined();
    expect(bad(seg('new', [114, 1, 6]))).toBeUndefined();
  });

  it('caps the parts and refuses unknown tracks and chips', () => {
    expect(reportContentSchema.safeParse({ segments: Array(10).fill(seg('new', [1, 1, 7])) }).success).toBe(false);
    expect(reportContentSchema.safeParse({ segments: [seg('tafsir', [1, 1, 7])] }).success).toBe(false);
    expect(reportContentSchema.safeParse({ tajweed: 'idgham_x' }).success).toBe(false);
  });
});

describe('reportV2DraftSchema', () => {
  it('accepts a partial autosave and leaves the rest out', () => {
    const out = reportV2DraftSchema.parse({ homework: ' ' });
    expect(out).toEqual({ homework: null });
  });
});

describe('reportV2SubmitSchema — per program and attendance', () => {
  it('Quran attended: needs a part, every part graded, and the overall grade', () => {
    expect(problem({ ...base, content: quran })).toBeNull();
    expect(problem({ ...base, content: {} })).toBe('missing_segments');
    expect(problem({ ...base, content: { segments: [seg('new', [67, 16, 22], null)] } })).toBe('missing_grades');
    expect(problem({ ...base, overall: null, content: quran })).toBe('missing_grades');
  });

  it('Arabic attended: needs the topic and the four skills', () => {
    const skills = { reading: 'good', writing: 'good', listening: 'good', grammar: 'good' };
    const arabic = (a: object) => problem({ ...base, program: 'arabic', content: { arabic: a } });
    expect(arabic({ topic: 'الجملة الاسمية', skills })).toBeNull();
    expect(arabic({ topic: null, skills })).toBe('missing_topic');
    expect(arabic({ topic: 'الجملة الاسمية', skills: { ...skills, grammar: null } })).toBe('missing_grades');
  });

  it('Islamic studies (late): needs the area, the topic and both rates', () => {
    const rates = { comprehension: 'excellent', participation: 'good' };
    const islamic = (i: object) => problem({ ...base, attendance: 'late', program: 'islamic_studies', content: { islamic: i } });
    expect(islamic({ domain: 'fiqh', topic: 'أركان الوضوء', rates })).toBeNull();
    expect(islamic({ domain: null, topic: 'أركان الوضوء', rates })).toBe('missing_domain');
    expect(islamic({ domain: 'fiqh', topic: '', rates })).toBe('missing_topic');
    expect(islamic({ domain: 'fiqh', topic: 'أركان الوضوء', rates: { comprehension: 'good' } })).toBe('missing_grades');
  });

  it('absent or excused: no content and no grade needed', () => {
    expect(problem({ ...base, attendance: 'absent', overall: null, content: {} })).toBeNull();
    expect(problem({ ...base, attendance: 'excused', overall: null })).toBeNull();
  });

  it('needs attendance and a program', () => {
    expect(problem({ ...base, attendance: null, content: quran })).toBe('missing_attendance');
    expect(reportV2SubmitSchema.safeParse({ ...base, program: undefined, content: quran }).success).toBe(false);
  });
});

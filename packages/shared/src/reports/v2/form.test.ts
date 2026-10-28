import { describe, expect, it } from 'vitest';
import { reportView } from '../../testing/reports.js';
import { emptyContent, MAX_SEGMENTS, type ReportSegment } from './content.js';
import { effective, segmentsOf, v2DraftBody, v2Problem, v2SubmitBody, v2ValuesOf, withSegment } from './form.js';

const WORDS = { homeworkQuran: 'راجع {surah} {from}-{to}', nextNew: 'جديد {surah} {from}-{to}', nextRevision: 'مراجعة {surah} {from}-{to}' };
const seg = (kind: ReportSegment['kind'], grade: ReportSegment['grade'] = 'excellent'): ReportSegment => ({ kind, surah: 67, from: 16, to: 22, grade });
const values = () => v2ValuesOf(reportView({ form_version: 2, program: null }), 'quran', [WORDS]);

describe('v2 form values', () => {
  it('start from the report, the student’s program and an empty form', () => {
    expect(values()).toEqual({ attendance: null, program: 'quran', content: emptyContent(), overall: null, notes: '', homework: null, nextPlan: null });
  });

  it('show the suggestions until the teacher changes the field', () => {
    const v = { ...values(), content: { ...emptyContent(), segments: [seg('new'), { ...seg('revision', 'acceptable'), surah: 68, from: 1, to: 20 }] } };
    expect(effective(v, WORDS)).toEqual({ overall: 'good', homework: 'راجع الملك 16-22', nextPlan: 'جديد الملك 23-29 · مراجعة القلم 21-40' });
    expect(effective({ ...v, overall: 'excellent', homework: '', nextPlan: 'x' }, WORDS)).toEqual({ overall: 'excellent', homework: '', nextPlan: 'x' });
    expect(effective({ ...v, program: 'arabic' }, WORDS).homework).toBe('');
  });

  it('autosave and submit leave untouched homework / plan out (the API words them in Arabic)', () => {
    const v = { ...values(), attendance: 'on_time' as const, content: { ...emptyContent(), segments: [seg('new')] } };
    expect(v2DraftBody(v)).not.toHaveProperty('homework');
    const body = v2SubmitBody(v, { version: 0, words: WORDS });
    expect(body).toMatchObject({ overall: 'excellent', expectedVersion: 0 });
    expect(body).not.toHaveProperty('homework');
    expect(v2SubmitBody({ ...v, homework: 'x' }, { version: 0, words: WORDS }).homework).toBe('x');
  });

  it('a sent report’s stored suggestions read as untouched: an edited range re-sends new ones; a typed value stays', () => {
    const first = { ...emptyContent(), segments: [seg('new')] };
    const sent = (homework: string | null) =>
      reportView({ form_version: 2, program: 'quran', content: first, grade_overall: 'excellent', homework, next_plan: 'جديد الملك 23-29' });
    const v = v2ValuesOf(sent('راجع الملك 16-22'), 'quran', [WORDS]);
    expect([v.overall, v.homework, v.nextPlan]).toEqual([null, null, null]);
    const edited = { ...v, content: { ...first, segments: [{ ...seg('new', 'good'), to: 20 }] } };
    expect(effective(edited, WORDS)).toEqual({ overall: 'good', homework: 'راجع الملك 16-20', nextPlan: 'جديد الملك 21-25' });
    expect(v2ValuesOf(sent('اكتب الواجب'), 'quran', [WORDS]).homework).toBe('اكتب الواجب');
    expect(v2ValuesOf({ ...sent('راجع الملك 16-22'), grade_overall: 'good' }, 'quran', [WORDS]).overall).toBe('good');
  });

  it('check like the API', () => {
    const opts = { version: 0, words: WORDS };
    expect(v2Problem(values(), opts)).toBe('missing_attendance');
    expect(v2Problem({ ...values(), attendance: 'on_time' }, opts)).toBe('missing_segments');
    const ungraded = { ...values(), attendance: 'on_time' as const, content: { ...emptyContent(), segments: [seg('new', null)] } };
    expect(v2Problem(ungraded, opts)).toBe('missing_grades');
    expect(v2Problem({ ...ungraded, content: { ...emptyContent(), segments: [seg('new')] } }, opts)).toBeNull();
    expect(v2Problem({ ...values(), attendance: 'absent' }, opts)).toBeNull();
  });
});

describe('segments', () => {
  it('lists a track with indexes; adds, replaces and removes a part', () => {
    let c = withSegment(emptyContent(), { index: -1, segment: seg('recited') });
    c = withSegment(c, { index: -1, segment: seg('new') });
    expect(segmentsOf(c, 'new')).toEqual([{ segment: seg('new'), index: 1 }]);
    c = withSegment(c, { index: 1, segment: { ...seg('new'), to: 30 } });
    expect(c.segments[1]?.to).toBe(30);
    expect(withSegment(c, { index: 0, segment: null }).segments.map((s) => s.kind)).toEqual(['new']);
    expect(withSegment(c, { index: -1, segment: null })).toBe(c);
  });

  it('refuses a part past MAX_SEGMENTS; a full form sent anyway names its own error', () => {
    const full = { ...emptyContent(), segments: Array.from({ length: MAX_SEGMENTS }, () => seg('revision')) };
    expect(withSegment(full, { index: -1, segment: seg('new') })).toBe(full);
    expect(withSegment(full, { index: 0, segment: seg('new') }).segments[0]?.kind).toBe('new');
    const over = { ...values(), attendance: 'on_time' as const, content: { ...full, segments: [...full.segments, seg('new')] } };
    expect(v2Problem(over, { version: 0, words: WORDS })).toBe('too_many_segments');
  });
});

import { describe, expect, it } from 'vitest';
import { reportFormRoutes as routes, teacherLinkRoutes } from '..';
import { FORM, MEMORY } from './report-form.fixture';

const LESSON_ID = FORM.lesson.id;
const [ENTRY] = FORM.entries;

describe('reportFormRoutes', () => {
  it('keeps the path the api serves today, for report readers under reports', () => {
    expect(`${routes.form.method} ${routes.form.path}`).toBe('GET /lessons/:id/report-form');
    expect(routes.form.permissions).toEqual(['reports.read']);
    expect(routes.form.tags).toEqual(['reports']);
    expect(routes.form.params.safeParse({ id: 'l-1' }).success).toBe(false);
    expect(routes.form.params.parse({ id: LESSON_ID })).toEqual({ id: LESSON_ID });
  });

  it('answers the lesson, one entry per student and the submit block', () => {
    expect(routes.form.response.parse(FORM)).toEqual(FORM);
    const plain = { ...ENTRY, package: null, memory: undefined };
    expect(routes.form.response.parse({ ...FORM, entries: [plain] }).entries).toHaveLength(1);
    const blocked = { ...FORM, submit_block: 'not_started' };
    expect(routes.form.response.parse(blocked).submit_block).toBe('not_started');
  });

  it('refuses an unknown block, lesson status or program, and a partial memory', () => {
    const bad = [
      { ...FORM, submit_block: 'closed' },
      { ...FORM, lesson: { ...FORM.lesson, status: 'gone' } },
      { ...FORM, entries: [{ ...ENTRY, student: { ...ENTRY?.student, program: 'math' } }] },
      { ...FORM, entries: [{ ...ENTRY, memory: { ...MEMORY, last: { recited: null } } }] },
    ];
    expect(bad.map((b) => routes.form.response.safeParse(b).success)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('teacherLinkRoutes.form', () => {
  it('reads the same answer by the link token alone', () => {
    const { form } = teacherLinkRoutes;
    expect(`${form.method} ${form.path}`).toBe('GET /public/teacher-report/:token');
    expect(form.response).toBe(routes.form.response);
    expect(form.params.safeParse({ token: 'k'.repeat(101) }).success).toBe(false);
    expect(form.params.parse({ token: 'k' })).toEqual({ token: 'k' });
  });
});

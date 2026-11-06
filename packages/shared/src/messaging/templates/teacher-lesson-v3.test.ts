import { describe, expect, it } from 'vitest';
import { templateCreateSchema } from './template-create.js';
import { TEACHER_LESSON_V3 } from './teacher-lesson-v3.js';
import { TEMPLATE_KEYS } from './templates.js';

describe('teacher_lesson_v3 (owner 2026-11-06)', () => {
  it('is a valid new registry row: two link buttons with a {{1}} suffix and a sample each', () => {
    const row = templateCreateSchema.parse(TEACHER_LESSON_V3);
    expect(row.buttons.map((b) => (b.type === 'url' ? b.url : ''))).toEqual([
      'https://api.ayatalbayan.com/join/{{1}}',
      'https://app.ayatalbayan.com/teacher-report/{{1}}',
    ]);
    expect(row.buttons.every((b) => b.type === 'url' && b.example)).toBe(true);
    expect(TEMPLATE_KEYS).toContain(row.key);
  });

  it('one sample per {{n}}; the meeting link is in the text, the report link is a button only', () => {
    const used = [...TEACHER_LESSON_V3.body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    expect(Math.max(...used)).toBe(TEACHER_LESSON_V3.params.length);
    expect(TEACHER_LESSON_V3.params.at(-1)?.name).toBe('meeting_url');
    expect(TEACHER_LESSON_V3.body).not.toContain('teacher-report');
    expect(TEACHER_LESSON_V3.footer).toBe('أكاديمية آيات البيان');
  });
});

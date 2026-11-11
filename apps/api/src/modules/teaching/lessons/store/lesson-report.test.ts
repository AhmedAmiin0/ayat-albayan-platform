import { describe, expect, it } from 'vitest';
import { lessonReport } from './lesson-report';

const SUBMITTED = '2026-11-11 10:00:00+00';
const report = (over: { submitted_at?: string | null; sent_at?: string | null } = {}) => ({
  id: 'r1', status: 'submitted' as const, submitted_at: SUBMITTED, sent_at: null, ...over,
});
const at = (iso: string) => new Date(iso);

describe('lessonReport (docs/46 B7: report state on the lesson views)', () => {
  it('no report yet → null', () => {
    expect(lessonReport(null, { role: 'teacher', now: at('2026-11-11T10:00:00Z'), minutes: 30 })).toBeNull();
    expect(lessonReport(undefined, { role: 'teacher', now: at('2026-11-11T10:00:00Z'), minutes: 30 })).toBeNull();
  });

  it('the teacher edits inside the window; edit_until = first submit + minutes; not sent yet', () => {
    const view = lessonReport(report(), { role: 'teacher', now: at('2026-11-11T10:29:59Z'), minutes: 30 });
    expect(view).toEqual({
      id: 'r1', status: 'submitted', submitted_at: '2026-11-11T10:00:00.000Z', sent_at: null,
      can_edit: true, edit_until: '2026-11-11T10:30:00.000Z',
    });
  });

  it('the boundary instant is closed for the teacher; the admin always edits; others never', () => {
    const now = at('2026-11-11T10:30:00Z');
    expect(lessonReport(report(), { role: 'teacher', now, minutes: 30 })?.can_edit).toBe(false);
    expect(lessonReport(report(), { role: 'admin', now, minutes: 30 })?.can_edit).toBe(true);
    expect(lessonReport(report(), { role: 'sales', now, minutes: 30 })?.can_edit).toBe(false);
    expect(lessonReport(report(), { role: null, now, minutes: 30 })?.can_edit).toBe(false);
  });

  it('a draft: editable, no window; an old embed without the window columns reads as a draft', () => {
    const draft = { id: 'r2', status: 'draft' as const };
    const view = lessonReport(draft, { role: 'teacher', now: at('2026-11-12T00:00:00Z'), minutes: 30 });
    expect(view).toEqual({ id: 'r2', status: 'draft', submitted_at: null, sent_at: null, can_edit: true, edit_until: null });
  });

  it('sent_at comes through as ISO once the family message went out', () => {
    const view = lessonReport(report({ sent_at: '2026-11-11 10:31:05+00' }), { role: 'teacher', now: at('2026-11-11T11:00:00Z'), minutes: 30 });
    expect(view).toMatchObject({ sent_at: '2026-11-11T10:31:05.000Z', can_edit: false });
  });
});

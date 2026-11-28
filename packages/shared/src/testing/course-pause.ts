import type { CoursePauseResult, CoursePauseView } from '../people/students';

// Test-only course pause answers for the web and mobile tests: fields a test does not name get
// neutral values (an open-ended pause nobody has resumed yet).

/** One pause as GET /students/:id/course-pause lists it, with `over` on top. */
export const coursePauseFixture = (over: Partial<CoursePauseView> = {}): CoursePauseView => ({
  id: 'p1',
  from_date: '2026-12-01',
  until_date: null,
  reason: null,
  created_at: '2026-11-27T08:00:00Z',
  created_by_name: null,
  resumed_at: null,
  extended_days: null,
  ...over,
});

/** What a start, an until change or a resume answers. */
export const coursePauseResultFixture = (
  over: Partial<CoursePauseResult> = {},
): CoursePauseResult => ({
  pause: coursePauseFixture(),
  cancelled: 0,
  left: 0,
  reopened: 0,
  conflicts: 0,
  ...over,
});

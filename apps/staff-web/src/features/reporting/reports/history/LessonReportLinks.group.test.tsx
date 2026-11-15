import type { LessonView } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson, SUHAILA } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { LessonReportLinks } from './LessonReportLinks';

const STARTED = '2026-10-03T13:00:00.000Z';
const NOW = '2026-10-03T14:00:00.000Z';
const LATER = '2026-10-03T15:00:00.000Z';
const EARLIER = '2026-10-03T13:30:00.000Z';
const submitted = (edit_until: string, sent_at: string | null = null) =>
  ({ id: `r-${edit_until}`, status: 'submitted', edit_until, sent_at }) as const;
type Report = LessonView['students'][number]['report'];
const student = (id: string, name: string, report: Report) => ({ ...SUHAILA, id, name, report });

const names = () => screen.getAllByRole('link').map((a) => a.textContent);
const hrefs = () => [...new Set(screen.getAllByRole('link').map((a) => a.getAttribute('href')))];

// docs/49 «Drawer rule» R1–R4, R7.
describe('LessonReportLinks, teacher: every report of the lesson', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => vi.useRealTimers());

  it('a group: one named control per student by her own stage, all to the lesson form', () => {
    const students = [
      student('s-1', 'سهيلة', null),
      student('s-2', 'آية', { id: 'r-2', status: 'draft' }),
      student('s-3', 'جود', submitted(LATER)),
      student('s-4', 'مريم', submitted(EARLIER, EARLIER)),
    ];
    render(<LessonReportLinks lesson={lesson({ id: 'l-1', starts_at: STARTED, students })} role="teacher" />);
    expect(names()).toEqual([
      `سهيلة: ${t.reports.open}`,
      `آية: ${t.reports.resume}`,
      `جود: ${t.reports.edit}`,
      `مريم: ${t.reports.view}`,
    ]);
    expect(hrefs()).toEqual(['/teacher/report/l-1']);
    for (const a of screen.getAllByRole('link')) expect(a.className).not.toContain('bg-primary');
  });

  it('a sent report is still listed («عرض التقرير»)', () => {
    const students = [student('s-1', 'سهيلة', submitted(EARLIER, EARLIER))];
    render(<LessonReportLinks lesson={lesson({ id: 'l-1', starts_at: STARTED, students })} role="teacher" />);
    expect(screen.getByRole('link', { name: t.reports.view }).getAttribute('href')).toBe('/teacher/report/l-1');
  });

  it('in the window one student reads «تعديل التقرير»', () => {
    const students = [student('s-1', 'سهيلة', submitted(LATER))];
    render(<LessonReportLinks lesson={lesson({ starts_at: STARTED, students })} role="teacher" filled />);
    expect(screen.getByRole('link', { name: t.reports.edit })).toBeTruthy();
  });

  it('nothing before the start', () => {
    render(<LessonReportLinks lesson={lesson({ starts_at: LATER })} role="teacher" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

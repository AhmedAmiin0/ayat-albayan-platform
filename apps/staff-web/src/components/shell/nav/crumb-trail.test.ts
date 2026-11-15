import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { crumbsFor } from './crumb-trail';

describe('crumbsFor', () => {
  it.each([
    ['/admin', [{ label: t.nav.dashboard }]],
    ['/admin/students', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.students }]],
    ['/admin/leads/', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.leads }]],
    ['/admin/job-applicants', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.jobApplicants }]],
    ['/admin/pricing', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.pricing.title }]],
    ['/admin/schedule', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.schedule.nav }]],
    ['/admin/book', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.booking.title }]],
    ['/admin/payouts', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.payouts }]],
    ['/admin/students/abc', [{ label: t.nav.students, to: '/admin/students' }, { label: t.students.profile }]],
    ['/admin/teachers/abc', [{ label: t.nav.teachers, to: '/admin/teachers' }, { label: t.teachers.profile }]],
    ['/admin/students/abc/reports', [{ label: t.nav.students, to: '/admin/students' }, { label: t.reports.history }]],
    ['/admin/students/abc/reports/l1', [{ label: t.nav.students, to: '/admin/students' }, { label: t.reports.formTitle }]],
  ])('%s', (path, crumbs) => {
    expect(crumbsFor(path)).toEqual(crumbs);
  });

  it('has none outside /admin or for unknown sections', () => {
    expect(crumbsFor('/teacher')).toEqual([]);
    expect(crumbsFor('/admin/nope')).toEqual([]);
  });
});

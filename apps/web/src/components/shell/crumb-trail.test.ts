import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { crumbsFor } from './crumb-trail';

describe('crumbsFor', () => {
  it.each([
    ['/admin', [{ label: t.nav.dashboard }]],
    ['/admin/students', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.students }]],
    ['/admin/leads/', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.leads }]],
    ['/admin/job-applicants', [{ label: t.nav.dashboard, to: '/admin' }, { label: t.nav.jobApplicants }]],
    ['/admin/students/abc', [{ label: t.nav.students, to: '/admin/students' }, { label: t.students.profile }]],
    ['/admin/teachers/abc', [{ label: t.nav.teachers, to: '/admin/teachers' }, { label: t.teachers.profile }]],
  ])('%s', (path, crumbs) => {
    expect(crumbsFor(path)).toEqual(crumbs);
  });

  it('has none outside /admin or for unknown sections', () => {
    expect(crumbsFor('/teacher')).toEqual([]);
    expect(crumbsFor('/admin/nope')).toEqual([]);
  });
});

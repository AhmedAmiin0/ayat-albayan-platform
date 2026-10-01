import { t } from '@/lib/i18n';

type CrumbTarget = '/admin' | '/admin/students' | '/admin/teachers';
export interface Crumb {
  label: string;
  /** Linked crumbs; the last one (current page) has none. */
  to?: CrumbTarget;
}

const SECTIONS: Record<string, { label: string; profile?: string }> = {
  students: { label: t.nav.students, profile: t.students.profile },
  teachers: { label: t.nav.teachers, profile: t.teachers.profile },
  leads: { label: t.nav.leads },
  'job-applicants': { label: t.nav.jobApplicants },
};

/** Running-head breadcrumbs for an /admin path (docs/07 §7). Unknown paths get none. */
export function crumbsFor(pathname: string): Crumb[] {
  const [root, section, id] = pathname.split('/').filter(Boolean);
  if (root !== 'admin') return [];
  if (!section) return [{ label: t.nav.dashboard }];
  const s = SECTIONS[section];
  if (!s) return [];
  if (id && s.profile && (section === 'students' || section === 'teachers')) {
    return [{ label: s.label, to: `/admin/${section}` }, { label: s.profile }];
  }
  return [{ label: t.nav.dashboard, to: '/admin' }, { label: s.label }];
}

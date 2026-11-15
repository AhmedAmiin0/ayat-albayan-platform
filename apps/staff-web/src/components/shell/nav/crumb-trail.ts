import { t } from '@/lib/i18n/i18n';

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
  pricing: { label: t.pricing.title },
  schedule: { label: t.schedule.nav },
  book: { label: t.booking.title },
  subscriptions: { label: t.nav.subscriptions },
  payments: { label: t.payments.title },
  payouts: { label: t.nav.payouts },
  assistants: { label: t.assistants.nav },
  expenses: { label: t.nav.expenses },
  inbox: { label: t.nav.inbox },
  settings: { label: t.settings.title },
};

/** /admin/students/$id/reports[/$lessonId]: the report history, or one report. */
function reportCrumbs(lessonId: string | undefined): Crumb[] {
  return [{ label: t.nav.students, to: '/admin/students' }, { label: lessonId ? t.reports.formTitle : t.reports.history }];
}

/** Running-head breadcrumbs for an /admin path (docs/07 §7). Unknown paths get none. */
export function crumbsFor(pathname: string): Crumb[] {
  const [root, section, id, sub, lessonId] = pathname.split('/').filter(Boolean);
  if (root !== 'admin') return [];
  if (!section) return [{ label: t.nav.dashboard }];
  const s = SECTIONS[section];
  if (!s) return [];
  if (section === 'students' && sub === 'reports') return reportCrumbs(lessonId);
  if (id && s.profile && (section === 'students' || section === 'teachers')) {
    return [{ label: s.label, to: `/admin/${section}` }, { label: s.profile }];
  }
  return [{ label: t.nav.dashboard, to: '/admin' }, { label: s.label }];
}

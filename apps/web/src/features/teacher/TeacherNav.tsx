import { SectionLinks, type SectionLink } from '@/components/shell/SectionLinks';
import { t } from '@/lib/i18n';

// The teacher's own pages (R-TCH-03), the same order as the mobile tabs.
export const TEACHER_NAV_ITEMS = [
  { to: '/teacher', label: t.teacherNav.today, icon: 'clock', exact: true },
  { to: '/teacher/calendar', label: t.teacherNav.calendar, icon: 'calendar' },
  { to: '/teacher/inbox', label: t.teacherNav.chats, icon: 'chat' },
  { to: '/teacher/students', label: t.teacherNav.students, icon: 'users' },
  { to: '/teacher/reports', label: t.teacherNav.reports, icon: 'receipt' },
  { to: '/teacher/earnings', label: t.teacherNav.payouts, icon: 'wallet' },
  { to: '/teacher/payouts', label: t.teacherNav.statements, icon: 'receipt' },
  { to: '/teacher/feedback', label: t.teacherNav.feedback, icon: 'star' },
] as const satisfies readonly SectionLink[];

/** The teacher's nav: the row under the logo from 900px, the «القائمة» sheet below (docs/07 §7). */
export function TeacherNav() {
  return <SectionLinks label={t.teacherNav.label} items={TEACHER_NAV_ITEMS} />;
}

import type { Permission } from '@ab/shared';
import { SectionLinks, type SectionLink } from '@/components/shell/nav/SectionLinks';
import { t } from '@/lib/i18n/i18n';

// The teacher's own pages (R-TCH-03), the same order as the mobile tabs.
export const TEACHER_NAV_ITEMS = [
  { to: '/teacher', label: t.teacherNav.today, icon: 'clock', exact: true, permission: 'self.teacher' },
  { to: '/teacher/calendar', label: t.teacherNav.calendar, icon: 'calendar', permission: 'self.teacher' },
  { to: '/teacher/inbox', label: t.teacherNav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/teacher/students', label: t.teacherNav.students, icon: 'users', permission: 'self.teacher' },
  { to: '/teacher/reports', label: t.teacherNav.reports, icon: 'receipt', permission: 'self.teacher' },
  { to: '/teacher/earnings', label: t.teacherNav.payouts, icon: 'wallet', permission: 'self.teacher' },
  { to: '/teacher/payouts', label: t.teacherNav.statements, icon: 'receipt', permission: 'self.teacher' },
  { to: '/teacher/feedback', label: t.teacherNav.feedback, icon: 'star', permission: 'self.teacher' },
] as const satisfies readonly SectionLink[];

/**
 * The teacher's nav: the row under the logo from 900px, the «القائمة» sheet below (docs/07 §7).
 * Only the pages the held role's permissions open (dynamic roles), in both places.
 */
export function TeacherNav({ can }: { can?: (permission: Permission) => boolean }) {
  return <SectionLinks label={t.teacherNav.label} items={TEACHER_NAV_ITEMS} can={can} />;
}

import type { Permission, TeacherPage } from '@ab/shared';
import { SectionLinks, type SectionLink } from '@/components/shell/nav/SectionLinks';
import { t } from '@/lib/i18n/i18n';
import { useTeacherPageOn } from '@/lib/settings/teacher-pages';

// The teacher's own pages (R-TCH-03), the same order as the mobile tabs.
export const TEACHER_NAV_ITEMS = [
  {
    to: '/teacher',
    label: t.teacherNav.today,
    icon: 'clock',
    exact: true,
    // «اليوم» stays current on any search (an old ?tab= link; owner 2026-11-14).
    activeOptions: { exact: true, includeSearch: false },
    permission: 'self.teacher',
  },
  { to: '/teacher/calendar', label: t.teacherNav.calendar, icon: 'calendar', permission: 'self.teacher' },
  { to: '/teacher/availability', label: t.availability.title, icon: 'grid', permission: 'self.teacher' },
  { to: '/teacher/inbox', label: t.teacherNav.chats, icon: 'chat', permission: 'inbox.read' },
  { to: '/teacher/students', label: t.teacherNav.students, icon: 'users', permission: 'self.teacher' },
  { to: '/teacher/messages', label: t.teacherNav.messages, icon: 'chat', permission: 'self.teacher' },
  { to: '/teacher/earnings', label: t.teacherNav.payouts, icon: 'wallet', permission: 'self.teacher' },
  { to: '/teacher/payouts', label: t.teacherNav.statements, icon: 'receipt', permission: 'self.teacher' },
  { to: '/teacher/feedback', label: t.teacherNav.feedback, icon: 'star', permission: 'self.teacher' },
] as const satisfies readonly SectionLink[];

type NavPath = (typeof TEACHER_NAV_ITEMS)[number]['to'];

/** The pages behind an academy switch («صفحات المعلم»); the others always show. */
const NAV_PAGE: Partial<Record<NavPath, TeacherPage>> = {
  '/teacher/inbox': 'chats',
  '/teacher/messages': 'messages',
  '/teacher/earnings': 'earnings',
  '/teacher/payouts': 'statements',
  '/teacher/feedback': 'feedback',
};

/**
 * The teacher's nav: the row under the logo from 900px, the «القائمة» sheet below (docs/07 §7).
 * Only the pages the held role's permissions open (dynamic roles) and the academy switches show,
 * in both places («المحادثات» needs both inbox.read and its switch).
 */
export function TeacherNav({ can }: { can?: (permission: Permission) => boolean }) {
  const pageOn = useTeacherPageOn();
  const switchedOn = (to: NavPath): boolean => {
    const page = NAV_PAGE[to];
    return page === undefined || pageOn(page);
  };
  const items = TEACHER_NAV_ITEMS.filter((item) => switchedOn(item.to));
  return <SectionLinks label={t.teacherNav.label} items={items} can={can} />;
}

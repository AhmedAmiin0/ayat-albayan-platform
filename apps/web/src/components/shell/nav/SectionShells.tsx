import type { UserRole } from '@ab/shared';
import type { ComponentType } from 'react';
import { ADMIN_NAV_ITEMS } from '@/components/admin-nav-items';
import { AdminNav } from '@/components/AdminNav';
import { AppShell } from '@/components/AppShell';
import { CallProvider } from '@/features/messaging/inbox';
import { usePermissions } from '@/features/people/auth/use-permissions';
import { SALES_NAV_ITEMS, SalesNav } from '@/features/sales/sales/SalesNav';
import { useSalesUnread } from '@/features/sales/sales/use-sales-unread';
import { TEACHER_NAV_ITEMS, TeacherNav } from '@/features/teaching/teacher/TeacherNav';
import { t } from '@/lib/i18n/i18n';
import { NavSkeleton } from './NavSkeleton';
import { useNavCounts } from './use-nav-counts';

// Each role's own shell (docs/07 §7), shared by its section route (/admin, /teacher, …) and by
// «حسابي» (/account, R-ACC-01), which every signed-in role opens inside the shell it knows.

/** «حسابي» in the compact bar's titles of every shell. */
const ACCOUNT_TITLE = { to: '/account', label: t.account.title };

/** The admin's titles: every nav page, the booking wizard (opened from several pages) and «حسابي». */
const ADMIN_TITLES = [...ADMIN_NAV_ITEMS, { to: '/admin/book', label: t.booking.title }, ACCOUNT_TITLE];
/** The teacher's titles: the nav pages, the report form (opened from «اليوم») and «حسابي». */
const TEACHER_TITLES = [...TEACHER_NAV_ITEMS, { to: '/teacher/report', label: t.reports.formTitle }, ACCOUNT_TITLE];
const SALES_TITLES = [...SALES_NAV_ITEMS, ACCOUNT_TITLE];

/**
 * Admin: ONE permission-filtered AdminNav, rendered by the sidebar and the «القائمة» sheet alike; a
 * skeleton until /auth/me has loaded (docs/27 E2, D6).
 */
export function AdminShell() {
  const { can, loaded } = usePermissions();
  const counts = useNavCounts(can);
  const nav = loaded ? <AdminNav counts={counts} can={can} /> : <NavSkeleton />;
  return (
    <CallProvider>
      <AppShell title={t.admin.dashboardTitle} home="/admin" titles={ADMIN_TITLES} nav={nav} />
    </CallProvider>
  );
}

/** Teacher: the nav shows only the pages the held role's permissions open (row and sheet). */
export function TeacherShell() {
  const { can, loaded } = usePermissions();
  const nav = loaded ? <TeacherNav can={can} /> : <NavSkeleton layout="row" />;
  return (
    <CallProvider showsPhone={false}>
      <AppShell title={t.teacher.dashboardTitle} home="/teacher" titles={TEACHER_TITLES} topNav={nav} />
    </CallProvider>
  );
}

/**
 * Sales: same as the teacher, with the salesperson's pages; «المحادثات» carries the unread count.
 * Every page in the chat's full width and frame (owner 2026-10-20).
 */
export function SalesShell() {
  const { can, loaded } = usePermissions();
  const unread = useSalesUnread(can);
  const nav = loaded ? <SalesNav can={can} unread={unread} /> : <NavSkeleton layout="row" />;
  return (
    <CallProvider>
      <AppShell title={t.assistantPortal.title} home="/sales" titles={SALES_TITLES} topNav={nav} wide />
    </CallProvider>
  );
}

/** A teaching assistant's own page (no nav: one list). */
export function AssistantShell() {
  return <AppShell title={t.classroom.assistants.homeTitle} home="/assistant" titles={[ACCOUNT_TITLE]} />;
}

/** Guardian and student portal. */
export function PortalShell() {
  return <AppShell title={t.portal.dashboardTitle} home="/portal" titles={[ACCOUNT_TITLE]} />;
}

/** The shell a base role gets (the role decides the app; pages inside are gated by permission). */
export const SHELL_OF: Record<UserRole, ComponentType> = {
  admin: AdminShell,
  teacher: TeacherShell,
  sales: SalesShell,
  assistant: AssistantShell,
  guardian: PortalShell,
  student: PortalShell,
};

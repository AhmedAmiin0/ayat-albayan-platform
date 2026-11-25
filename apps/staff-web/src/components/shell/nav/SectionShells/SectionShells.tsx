import type { UserRole } from '@ab/catalog';
import type { ComponentType } from 'react';
import { ADMIN_NAV_ITEMS } from '@/components/shell/nav/admin-nav-items';
import { AdminNav } from '@/components/shell/nav/AdminNav';
import { AppShell } from '@/components/shell/layout/AppShell';
import { CallProvider, useInboxRealtime } from '@/features/messaging/inbox';
import { usePermissions, t } from '@ab/web-kit';
import { PortalHome } from '@/features/people/portal';
import { SALES_NAV_ITEMS, SalesNav } from '@/features/sales/sales/SalesNav';
import { useSalesUnread } from '@/features/sales/sales/use-sales-unread';
import { TEACHER_NAV_ITEMS, TeacherNav } from '@/features/teaching/teacher/TeacherNav';
import { NavSkeleton } from '@/components/shell/nav/NavSkeleton';
import { useNavCounts } from '@/components/shell/nav/use-nav-counts';

// Each role's shell (docs/07 §7) also hosts /account (R-ACC-01); admin and sales inbox live.

const ACCOUNT_TITLE = { to: '/account', label: t.account.title };

/** The booking wizard opens from several pages, so it needs its own title. */
const ADMIN_TITLES = [...ADMIN_NAV_ITEMS, { to: '/admin/book', label: t.booking.title }, ACCOUNT_TITLE];
const TEACHER_TITLES = [...TEACHER_NAV_ITEMS, { to: '/teacher/report', label: t.reports.formTitle }, ACCOUNT_TITLE];
const SALES_TITLES = [...SALES_NAV_ITEMS, ACCOUNT_TITLE];

/** One permission-filtered nav for sidebar and sheet; a skeleton until /auth/me (docs/27 E2). */
export function AdminShell() {
  const { can, loaded } = usePermissions();
  const counts = useNavCounts(can);
  useInboxRealtime(can('inbox.read'));
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

/** Every page in the chat's full width and frame. */
export function SalesShell() {
  const { can, loaded } = usePermissions();
  const unread = useSalesUnread(can);
  useInboxRealtime(can('inbox.read'));
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

/** Guardian and student portal (docs/31); the account page is its only other page. */
export function PortalShell() {
  return <AppShell title={t.portal.dashboardTitle} home="/portal" titles={[ACCOUNT_TITLE]} homePage={<PortalHome />} />;
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

import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { usePermissions } from '@/features/auth/use-permissions';
import { TEACHER_NAV_ITEMS, TeacherNav } from '@/features/teacher/TeacherNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'teacher'),
  component: () => <AppShell title={t.teacher.dashboardTitle} home="/teacher" titles={TITLES} topNav={<TeacherNavGated />} />,
});

/** The compact bar's titles: the nav pages, plus the report form (opened from «اليوم»). */
const TITLES = [...TEACHER_NAV_ITEMS, { to: '/teacher/report', label: t.reports.formTitle }];

/** The nav shows only the pages the held role's permissions open (dynamic roles), row and sheet. */
function TeacherNavGated() {
  const { can } = usePermissions();
  return <TeacherNav can={can} />;
}

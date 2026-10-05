import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { TEACHER_NAV_ITEMS, TeacherNav } from '@/features/teacher/TeacherNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'teacher'),
  component: () => <AppShell title={t.teacher.dashboardTitle} home="/teacher" titles={TITLES} topNav={<TeacherNav />} />,
});

/** The compact bar's titles: the nav pages, plus the report form (opened from «اليوم»). */
const TITLES = [...TEACHER_NAV_ITEMS, { to: '/teacher/report', label: t.reports.formTitle }];

import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/features/auth/me';
import { TeacherNav } from '@/features/teacher/TeacherNav';
import { t } from '@/lib/i18n';

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'teacher'),
  component: () => <AppShell title={t.teacher.dashboardTitle} topNav={<TeacherNav />} />,
});

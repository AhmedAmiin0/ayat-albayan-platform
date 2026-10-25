import { createFileRoute } from '@tanstack/react-router';
import { TeacherShell } from '@/components/shell/nav/SectionShells';
import { requireRole } from '@/features/auth/me';

export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requireRole(context.queryClient, 'teacher'),
  component: TeacherShell,
});

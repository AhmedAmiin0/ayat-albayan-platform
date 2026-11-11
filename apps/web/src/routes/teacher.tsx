import { createFileRoute } from '@tanstack/react-router';
import { TeacherShell } from '@/components/shell/nav/SectionShells';
import { requireTeacherPortal } from '@/features/people/auth';

/** The teacher portal; a code-made login sets its email + password first (docs/46 A4). */
export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context }) => requireTeacherPortal(context.queryClient),
  component: TeacherShell,
});

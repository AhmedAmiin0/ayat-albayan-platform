import { createFileRoute } from '@tanstack/react-router';
import { TeacherShell } from '@/components/shell/nav/SectionShells';
import { requireTeacherPortal } from '@/features/people/auth';

/**
 * The teacher portal; a code-made login sets its email + password first (docs/46 A4). A signed-out
 * teacher returns to the page she opened (a report link) after signing in (owner 2026-11-14).
 */
export const Route = createFileRoute('/teacher')({
  beforeLoad: ({ context, location }) =>
    requireTeacherPortal(context.queryClient, `${location.pathname}${location.searchStr}`),
  component: TeacherShell,
});

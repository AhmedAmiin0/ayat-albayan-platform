import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { FILE_TABS, TeacherStudentFile } from '@/features/teaching/teacher-students';

// Optional, so a plain link opens «الحلقات»; an unknown tab reads as none (no error page).
const fileSearch = z.object({ tab: z.enum(FILE_TABS).optional().catch(undefined) });

/** /teacher/students/$studentId?tab= «ملف الطالب» (docs/47): lessons, course and reports. */
export const Route = createFileRoute('/teacher/students/$studentId')({
  validateSearch: (search: Record<string, unknown>) => fileSearch.parse(search),
  component: TeacherStudentFileRoute,
});

function TeacherStudentFileRoute() {
  const { studentId } = Route.useParams();
  const { tab = 'lessons' } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <TeacherStudentFile
      studentId={studentId}
      tab={tab}
      onTab={(next) => void navigate({ search: { tab: next }, replace: true })}
    />
  );
}

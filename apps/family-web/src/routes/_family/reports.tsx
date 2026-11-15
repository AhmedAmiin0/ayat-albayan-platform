import { createFileRoute } from '@tanstack/react-router';
import { StudentReportsPage } from '@/features/reports';
import { requireTab, WithHome } from '@/features/shell';

/** «التقارير»: a student's tab only (a guardian's reports live inside each child). */
export const Route = createFileRoute('/_family/reports')({
  beforeLoad: ({ context }) => requireTab(context, 'reports'),
  component: () => <WithHome>{(home) => <StudentReportsPage home={home} />}</WithHome>,
});

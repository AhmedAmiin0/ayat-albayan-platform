import { createFileRoute } from '@tanstack/react-router';
import { WithPick } from '#/features/children/index.ts';
import { StudentReportsPage } from '#/features/reports/index.ts';

/** «التقارير»: the student in view's sent reports (the tab waits for that student). */
export const Route = createFileRoute('/_family/reports')({
  component: () => (
    <WithPick>
      {(student, home) => <StudentReportsPage student={student} kind={home.kind} />}
    </WithPick>
  ),
});

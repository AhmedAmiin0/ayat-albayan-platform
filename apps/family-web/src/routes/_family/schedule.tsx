import { createFileRoute } from '@tanstack/react-router';
import { WithPick } from '@/features/children';
import { SchedulePage } from '@/features/schedule';

/** «الجدول»: the student in view's week. */
export const Route = createFileRoute('/_family/schedule')({
  component: () => (
    <WithPick>
      {(student, home) => <SchedulePage student={student} kind={home.kind} />}
    </WithPick>
  ),
});

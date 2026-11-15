import { createFileRoute } from '@tanstack/react-router';
import { MyEarnings } from '@/features/finance/teacher-earnings/MyEarnings';
import { TeacherPageGate } from '@/features/teaching/teacher';

/** /teacher/earnings «أرباحي» — what I earned per lesson, what was paid, what is left. */
export const Route = createFileRoute('/teacher/earnings')({ component: TeacherEarningsRoute });

function TeacherEarningsRoute() {
  return (
    <TeacherPageGate page="earnings">
      <MyEarnings />
    </TeacherPageGate>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { TeacherPageGate } from '@/features/teaching/teacher';
import { MyPayouts } from '@/features/teaching/teacher/MyPayouts';

/** /teacher/payouts «كشوف الشهر» — my monthly statements (R-TCH-04). */
export const Route = createFileRoute('/teacher/payouts')({ component: TeacherPayoutsRoute });

function TeacherPayoutsRoute() {
  return (
    <TeacherPageGate page="statements">
      <MyPayouts />
    </TeacherPageGate>
  );
}

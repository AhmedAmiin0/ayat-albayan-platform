import { createFileRoute } from '@tanstack/react-router';
import { TeacherPageGate } from '@/features/teaching/teacher';
import { MyPayouts } from '@/features/teaching/teacher/MyPayouts';

export const Route = createFileRoute('/teacher/payouts')({ component: TeacherPayoutsRoute });

function TeacherPayoutsRoute() {
  return (
    <TeacherPageGate page="statements">
      <MyPayouts />
    </TeacherPageGate>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { FamilyRecordingsPage } from '#/features/recordings/index.ts';

/** One child's «التسجيلات» on its own page (the app's recordings screen). */
export const Route = createFileRoute('/_family/recordings/$studentId')({
  component: Recordings,
});

function Recordings() {
  const { studentId } = Route.useParams();
  return <FamilyRecordingsPage studentId={studentId} />;
}

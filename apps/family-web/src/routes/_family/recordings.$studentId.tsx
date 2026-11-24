import { createFileRoute } from '@tanstack/react-router';
import { FamilyRecordingsPage } from '@/features/recordings';

export const Route = createFileRoute('/_family/recordings/$studentId')({
  component: Recordings,
});

function Recordings() {
  const { studentId } = Route.useParams();
  return <FamilyRecordingsPage studentId={studentId} />;
}

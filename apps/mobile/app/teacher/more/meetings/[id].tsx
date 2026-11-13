import { useLocalSearchParams } from 'expo-router';
import { RecordingsScreen } from '@/classroom';
import { TeacherPageGuard } from '@/teacher';

export default function MeetingRecordingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <TeacherPageGuard gate="meetings">
      <RecordingsScreen source={{ kind: 'meeting', id }} />
    </TeacherPageGuard>
  );
}

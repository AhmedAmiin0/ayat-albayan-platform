import { useLocalSearchParams } from 'expo-router';
import { RecordingsScreen } from '@/classroom/recordings/RecordingsScreen';

export default function LessonRecordingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecordingsScreen source={{ kind: 'lesson', id }} />;
}

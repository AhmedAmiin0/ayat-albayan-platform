import { useLocalSearchParams } from 'expo-router';
import { RecordingsScreen } from '@/classroom';

export default function MeetingRecordingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecordingsScreen source={{ kind: 'meeting', id }} />;
}

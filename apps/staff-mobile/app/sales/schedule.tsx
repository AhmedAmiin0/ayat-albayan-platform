import { useLocalSearchParams } from 'expo-router';
import { SalesScheduleScreen } from '@/sales/sales';

/** Query params remount the screen on that teacher or day via the key. */
export default function SalesScheduleRoute() {
  const { teacherId = '', date = '' } = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  return <SalesScheduleScreen key={`${teacherId}|${date}`} asTab />;
}

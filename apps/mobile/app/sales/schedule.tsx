import { useLocalSearchParams } from 'expo-router';
import { SalesScheduleScreen } from '@/sales';

/**
 * «جدول الحلقات» tab (read-only, «ادخل الحلقة» on a running lesson). A teacher's «جدولها» from
 * «المعلمون» lands here with ?teacherId, «جدول الغد» of «اليوم» with ?date: the key remounts the
 * screen on that teacher or day.
 */
export default function SalesScheduleRoute() {
  const { teacherId = '', date = '' } = useLocalSearchParams<{ teacherId?: string; date?: string }>();
  return <SalesScheduleScreen key={`${teacherId}|${date}`} asTab />;
}
